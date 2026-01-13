#!/usr/bin/env tsx
/**
 * Generate 21 days of historical half-hour average data for AI traffic predictions
 * This creates the exact dataset that the AI will use for analysis
 * Total: 21 days * 48 half-hours = 1008 records
 */

import { db } from "../src/db";
import { halfHourAverages, espDevices } from "../src/db/schema";
import { eq } from "drizzle-orm";

interface TrafficPattern {
  baseJamPercent: number;
  variance: number;
  description: string;
}

// Realistic traffic jam percentages for different time periods
const TRAFFIC_PATTERNS: { [key: string]: TrafficPattern } = {
  // Rush hours - heavy congestion (high jam percentages)
  MORNING_RUSH: { baseJamPercent: 75, variance: 15, description: "Morning Rush (7-9 AM)" },
  EVENING_RUSH: { baseJamPercent: 80, variance: 20, description: "Evening Rush (5-7 PM)" },
  
  // Regular day hours - moderate congestion
  BUSINESS_HOURS: { baseJamPercent: 45, variance: 20, description: "Business Hours" },
  AFTERNOON: { baseJamPercent: 35, variance: 15, description: "Afternoon" },
  
  // Off-peak - low congestion (low jam percentages)
  LATE_NIGHT: { baseJamPercent: 5, variance: 8, description: "Late Night (10 PM - 6 AM)" },
  EARLY_MORNING: { baseJamPercent: 15, variance: 10, description: "Early Morning (6-7 AM)" },
  
  // Weekend patterns - generally lighter than weekdays
  WEEKEND_DAY: { baseJamPercent: 25, variance: 15, description: "Weekend Daytime" },
  WEEKEND_NIGHT: { baseJamPercent: 10, variance: 8, description: "Weekend Night" },
};

/**
 * Get traffic pattern based on hour and day type
 */
function getTrafficPattern(hour: number, isWeekend: boolean): TrafficPattern {
  if (isWeekend) {
    return hour >= 22 || hour <= 6 ? TRAFFIC_PATTERNS.WEEKEND_NIGHT : TRAFFIC_PATTERNS.WEEKEND_DAY;
  }
  
  // Weekday patterns
  if (hour >= 7 && hour <= 9) return TRAFFIC_PATTERNS.MORNING_RUSH;
  if (hour >= 17 && hour <= 19) return TRAFFIC_PATTERNS.EVENING_RUSH;
  if (hour >= 10 && hour <= 16) return TRAFFIC_PATTERNS.BUSINESS_HOURS;
  if (hour >= 20 && hour <= 21) return TRAFFIC_PATTERNS.AFTERNOON;
  if (hour >= 6 && hour <= 6) return TRAFFIC_PATTERNS.EARLY_MORNING;
  return TRAFFIC_PATTERNS.LATE_NIGHT;
}

/**
 * Convert Gregorian date to Hijri equivalent using proper Islamic calendar
 */
function convertToHijriEquivalent(gregorianDate: Date, yearsBack: number): Date {
  // Get current date in Hijri calendar
  const hijriFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });
  
  // Format current date in Hijri
  const currentHijriParts = hijriFormatter.formatToParts(gregorianDate);
  const currentHijriYear = parseInt(currentHijriParts.find(part => part.type === 'year')?.value || '0');
  const currentHijriMonth = parseInt(currentHijriParts.find(part => part.type === 'month')?.value || '0');
  const currentHijriDay = parseInt(currentHijriParts.find(part => part.type === 'day')?.value || '0');
  
  // Calculate target Hijri date (same day/month, previous years)
  const targetHijriYear = currentHijriYear - yearsBack;
  
  // Create a date object for the target Hijri date
  // We'll approximate by creating a Gregorian date and then adjusting
  const approximateGregorian = new Date(gregorianDate.getFullYear() - yearsBack - 1, gregorianDate.getMonth(), gregorianDate.getDate());
  
  // Try to find the Gregorian equivalent of the Hijri date
  // This is an approximation since exact conversion requires complex calculations
  let testDate = new Date(approximateGregorian);
  let attempts = 0;
  const maxAttempts = 400; // ~1 year range to search
  
  while (attempts < maxAttempts) {
    const testHijriParts = hijriFormatter.formatToParts(testDate);
    const testHijriYear = parseInt(testHijriParts.find(part => part.type === 'year')?.value || '0');
    const testHijriMonth = parseInt(testHijriParts.find(part => part.type === 'month')?.value || '0');
    const testHijriDay = parseInt(testHijriParts.find(part => part.type === 'day')?.value || '0');
    
    // Check if we found the target Hijri date
    if (testHijriYear === targetHijriYear && testHijriMonth === currentHijriMonth && testHijriDay === currentHijriDay) {
      testDate.setHours(0, 0, 0, 0);
      return testDate;
    }
    
    // If year is too high, go back; if too low, go forward
    if (testHijriYear > targetHijriYear) {
      testDate.setDate(testDate.getDate() - 1);
    } else if (testHijriYear < targetHijriYear) {
      testDate.setDate(testDate.getDate() + 1);
    } else if (testHijriMonth > currentHijriMonth) {
      testDate.setDate(testDate.getDate() - 1);
    } else if (testHijriMonth < currentHijriMonth) {
      testDate.setDate(testDate.getDate() + 1);
    } else if (testHijriDay > currentHijriDay) {
      testDate.setDate(testDate.getDate() - 1);
    } else {
      testDate.setDate(testDate.getDate() + 1);
    }
    
    attempts++;
  }
  
  // If we couldn't find exact match, throw error for fallback
  throw new Error(`Could not find Hijri equivalent for ${yearsBack} years back`);
}

/**
 * Generate realistic jam congestion percentage for a half-hour period
 */
function generateTrafficData(hour: number, minute: number, isWeekend: boolean, dayType: string): number {
  const pattern = getTrafficPattern(hour, isWeekend);
  
  // Add some randomness based on day type
  let modifier = 1.0;
  switch (dayType) {
    case 'holiday':
      modifier = 0.3; // Much less congestion on holidays
      break;
    case 'special_event':
      modifier = 1.5; // More congestion during events
      break;
    case 'rainy':
      modifier = 1.3; // More congestion in rain
      break;
    case 'normal':
    default:
      modifier = 1.0;
  }
  
  // Calculate base jam percentage with pattern and modifier
  const baseJamPercent = pattern.baseJamPercent * modifier;
  
  // Add random variance
  const variance = (Math.random() - 0.5) * pattern.variance;
  const finalJamPercent = Math.round(baseJamPercent + variance);
  
  // Clamp between 0-100% (valid percentage range)
  return Math.max(0, Math.min(100, finalJamPercent));
}

/**
 * Generate the specific 21-day historical dataset that the AI uses
 */
async function generate21DayHistoricalData(deviceId: string): Promise<void> {
  console.log(`Generating 21-day historical dataset for device: ${deviceId}`);
  
  const now = new Date();
  const generatedData: any[] = [];
  
  // Group 1: Same calendar day of the last 3 years (6 days total)
  console.log("📅 Group 1: Same day previous years (6 days)");
  for (let year = 1; year <= 3; year++) {
    // Gregorian calendar
    const gregorianDate = new Date(now);
    gregorianDate.setFullYear(gregorianDate.getFullYear() - year);
    gregorianDate.setHours(0, 0, 0, 0);
    
    await generateDayData(deviceId, gregorianDate, `gregorian_same_day_${year}_years_ago`, generatedData);
    
    // Proper Hijri calendar conversion
    try {
      const hijriDate = convertToHijriEquivalent(now, year);
      await generateDayData(deviceId, hijriDate, `hijri_equivalent_${year}_years_ago`, generatedData);
    } catch (error) {
      console.log(`   ⚠️ Hijri conversion failed for year ${year}, using additional Gregorian date`);
      // Fallback to additional Gregorian date if Hijri conversion fails
      const fallbackDate = new Date(now);
      fallbackDate.setFullYear(fallbackDate.getFullYear() - year);
      fallbackDate.setDate(fallbackDate.getDate() + 15); // Offset by ~2 weeks
      fallbackDate.setHours(0, 0, 0, 0);
      await generateDayData(deviceId, fallbackDate, `gregorian_offset_${year}_years_ago`, generatedData);
    }
  }
  
  // Group 2: Last 7 days
  console.log("📅 Group 2: Recent patterns (7 days)");
  for (let day = 1; day <= 7; day++) {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - day);
    recentDate.setHours(0, 0, 0, 0);
    
    await generateDayData(deviceId, recentDate, `last_${day}_days`, generatedData);
  }
  
  // Group 3: Pattern analysis (8 days)
  console.log("📅 Group 3: Pattern analysis (8 days)");
  
  // Same weekday last 4 weeks (4 days)
  const currentWeekday = now.getDay();
  for (let week = 1; week <= 4; week++) {
    const weekdayDate = new Date();
    weekdayDate.setDate(weekdayDate.getDate() - (week * 7));
    // Find the same weekday
    const dayDiff = (weekdayDate.getDay() - currentWeekday + 7) % 7;
    weekdayDate.setDate(weekdayDate.getDate() - dayDiff);
    weekdayDate.setHours(0, 0, 0, 0);
    
    await generateDayData(deviceId, weekdayDate, `same_weekday_${week}_weeks_ago`, generatedData);
  }
  
  // Mid-month last 2 months (2 days)
  for (let month = 1; month <= 2; month++) {
    const midMonthDate = new Date();
    midMonthDate.setMonth(midMonthDate.getMonth() - month);
    midMonthDate.setDate(15); // Mid-month
    midMonthDate.setHours(0, 0, 0, 0);
    
    await generateDayData(deviceId, midMonthDate, `mid_month_${month}_months_ago`, generatedData);
  }
  
  // 2 random normal days from last year (2 days)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  for (let i = 1; i <= 2; i++) {
    const randomDate = new Date(sixMonthsAgo);
    randomDate.setDate(randomDate.getDate() + Math.floor(Math.random() * 60) + (i * 30));
    randomDate.setHours(0, 0, 0, 0);
    
    await generateDayData(deviceId, randomDate, `random_normal_day_${i}`, generatedData);
  }
  
  // Insert all data into database
  console.log(`💾 Inserting ${generatedData.length} records into database...`);
  if (generatedData.length > 0) {
    await db.insert(halfHourAverages).values(generatedData);
  }
  
  console.log(`✅ Generated complete 21-day dataset: ${generatedData.length} records`);
  console.log(`📊 Expected: 21 days × 48 half-hours = 1,008 records`);
}

/**
 * Generate 48 half-hour records for a single day
 */
async function generateDayData(deviceId: string, date: Date, dayType: string, dataArray: any[]): Promise<void> {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  
  // Determine special day characteristics
  let specialDayType = 'normal';
  if (Math.random() < 0.1) specialDayType = 'rainy'; // 10% chance of rain
  if (Math.random() < 0.05) specialDayType = 'holiday'; // 5% chance of holiday
  if (Math.random() < 0.03) specialDayType = 'special_event'; // 3% chance of special event
  
  console.log(`   📍 ${date.toDateString()} (${dayType}) - ${isWeekend ? 'Weekend' : 'Weekday'} - ${specialDayType}`);
  
  // Generate 48 half-hour periods for this day
  for (let halfHour = 0; halfHour < 48; halfHour++) {
    const hour = Math.floor(halfHour / 2);
    const minute = (halfHour % 2) * 30;
    
    const timestamp = new Date(date);
    timestamp.setHours(hour, minute, 0, 0);
    
    const jamPercent = generateTrafficData(hour, minute, isWeekend, specialDayType);
    
    dataArray.push({
      espId: deviceId,
      timestamp,
      averageValue: jamPercent, // Jam congestion percentage (0-100%)
      halfHourIndex: halfHour,
    });
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes("--help")) {
    console.log("21-Day Historical Data Generator");
    console.log("===============================");
    console.log("Usage: npx tsx scripts/generate-21day-data.ts [options] [deviceId]");
    console.log("");
    console.log("Options:");
    console.log("  --help          Show this help message");
    console.log("  --all-devices   Generate data for all existing devices");
    console.log("  --cleanup       Clean up existing historical data");
    console.log("");
    console.log("Examples:");
    console.log("  npx tsx scripts/generate-21day-data.ts esp-001");
    console.log("  npx tsx scripts/generate-21day-data.ts --all-devices");
    console.log("");
    return;
  }
  
  if (args.includes("--cleanup")) {
    console.log("🧹 Cleaning up existing historical data...");
    await db.delete(halfHourAverages);
    console.log("✅ Cleanup completed");
    return;
  }
  
  try {
    if (args.includes("--all-devices")) {
      // Generate for all devices
      const devices = await db.select().from(espDevices);
      
      if (devices.length === 0) {
        console.log("❌ No devices found. Create some devices first.");
        return;
      }
      
      console.log(`🎯 Generating 21-day historical data for ${devices.length} devices...`);
      
      // Clean up existing data for all devices
      console.log(`🧹 Cleaning existing historical data for all devices...`);
      await db.delete(halfHourAverages);
      
      for (const device of devices) {
        await generate21DayHistoricalData(device.deviceId);
      }
      
      console.log(`🎉 Completed data generation for all ${devices.length} devices!`);
      
    } else {
      // Generate for specific device
      const deviceId = args[0];
      
      if (!deviceId) {
        console.log("❌ Please provide a device ID or use --all-devices");
        console.log("Usage: npx tsx scripts/generate-21day-data.ts <deviceId>");
        return;
      }
      
      // Verify device exists
      const device = await db
        .select()
        .from(espDevices)
        .where(eq(espDevices.deviceId, deviceId))
        .limit(1);
      
      if (device.length === 0) {
        console.log(`❌ Device '${deviceId}' not found. Available devices:`);
        const allDevices = await db.select().from(espDevices);
        allDevices.forEach(d => console.log(`   - ${d.deviceId} (${d.name})`));
        return;
      }
      
      // Clean up existing data for this device first
      console.log(`🧹 Cleaning existing historical data for device: ${deviceId}...`);
      await db.delete(halfHourAverages).where(eq(halfHourAverages.espId, deviceId));
      
      await generate21DayHistoricalData(deviceId);
    }
    
    console.log("");
    console.log("🚀 Next steps:");
    console.log("1. Test predictions: curl -X POST http://localhost:8787/predictions/{deviceId}/regenerate");
    console.log("2. View predictions: curl -X GET http://localhost:8787/predictions/{deviceId}");
    console.log("3. Run full test: npx tsx scripts/test-predictions.ts");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);