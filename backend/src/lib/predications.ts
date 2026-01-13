import { ai } from "./ai";
import { db } from "../db";
import { deviceReadings, halfHourAverages, predictions, espDevices } from "../db/schema";
import { gte, lt, and, eq, desc, or } from "drizzle-orm";

interface AIResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

interface HalfHourData {
  halfHourIndex: number;
  averageValue: number;
  timestamp: Date;
}

interface HistoricalDataset {
  sameDayLastYears: HalfHourData[];
  lastSevenDays: HalfHourData[];
  weekdayPatterns: HalfHourData[];
}

/**
 * Calculate half-hour averages from device jam percentage readings
 */
export async function calculateHalfHourAverages(deviceId: string): Promise<void> {
  try {
    // Get the last day's readings
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const readings = await db
      .select()
      .from(deviceReadings)
      .where(
        and(
          eq(deviceReadings.deviceId, deviceId),
          gte(deviceReadings.timestamp, yesterday),
          lt(deviceReadings.timestamp, today)
        )
      );

    // Group readings by half-hour intervals (48 per day)
    const halfHourGroups: { [key: number]: number[] } = {};
    
    readings.forEach(reading => {
      const hour = reading.timestamp.getHours();
      const minute = reading.timestamp.getMinutes();
      const halfHourIndex = hour * 2 + Math.floor(minute / 30); // 0-47
      
      if (!halfHourGroups[halfHourIndex]) {
        halfHourGroups[halfHourIndex] = [];
      }
      // Average the jam percentages from both roads
      const averageJamPercent = (reading.road1JamPercent + reading.road2JamPercent) / 2;
      halfHourGroups[halfHourIndex].push(averageJamPercent);
    });

    // Calculate averages and insert into database
    for (const [halfHourIndexStr, jamPercentages] of Object.entries(halfHourGroups)) {
      const halfHourIndex = parseInt(halfHourIndexStr);
      const averageValue = Math.round(jamPercentages.reduce((sum, j) => sum + j, 0) / jamPercentages.length);
      
      // Create timestamp for this half-hour period
      const timestamp = new Date(yesterday);
      timestamp.setHours(Math.floor(halfHourIndex / 2), (halfHourIndex % 2) * 30);

      await db.insert(halfHourAverages).values({
        espId: deviceId,
        timestamp,
        averageValue,
        halfHourIndex,
      });
    }

    console.log(`Calculated half-hour averages for device ${deviceId}`);
  } catch (error) {
    console.error(`Error calculating half-hour averages for device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Get historical data for a specific ESP device using the 21-day selection criteria
 */
export async function getHistoricalDataset(deviceId: string): Promise<HistoricalDataset> {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  try {
    // 1. Same calendar day of the last 3 years (Gregorian) - 6 days total
    const sameDayLastYears: HalfHourData[] = [];
    for (let year = 1; year <= 3; year++) {
      const targetDate = new Date(now);
      targetDate.setFullYear(targetDate.getFullYear() - year);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const yearData = await db
        .select()
        .from(halfHourAverages)
        .where(
          and(
            eq(halfHourAverages.espId, deviceId),
            gte(halfHourAverages.timestamp, targetDate),
            lt(halfHourAverages.timestamp, nextDay)
          )
        );
      
      sameDayLastYears.push(...yearData);
    }

    // 2. Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const lastSevenDays = await db
      .select()
      .from(halfHourAverages)
      .where(
        and(
          eq(halfHourAverages.espId, deviceId),
          gte(halfHourAverages.timestamp, sevenDaysAgo)
        )
      )
      .orderBy(desc(halfHourAverages.timestamp));

    // 3. Same weekday last 4 weeks + mid-month last 2 months + 2 random normal days
    const weekdayPatterns: HalfHourData[] = [];
    
    // Same weekday last 4 weeks (4 days)
    const currentWeekday = now.getDay();
    for (let week = 1; week <= 4; week++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - (week * 7));
      // Find the same weekday
      const dayDiff = (targetDate.getDay() - currentWeekday + 7) % 7;
      targetDate.setDate(targetDate.getDate() - dayDiff);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const weekdayData = await db
        .select()
        .from(halfHourAverages)
        .where(
          and(
            eq(halfHourAverages.espId, deviceId),
            gte(halfHourAverages.timestamp, targetDate),
            lt(halfHourAverages.timestamp, nextDay)
          )
        );
      
      weekdayPatterns.push(...weekdayData);
    }

    // Mid-month last 2 months (2 days)
    for (let month = 1; month <= 2; month++) {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - month);
      targetDate.setDate(15); // Mid-month
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const monthData = await db
        .select()
        .from(halfHourAverages)
        .where(
          and(
            eq(halfHourAverages.espId, deviceId),
            gte(halfHourAverages.timestamp, targetDate),
            lt(halfHourAverages.timestamp, nextDay)
          )
        );
      
      weekdayPatterns.push(...monthData);
    }

    // 2 random normal days from last year (simplified to 2 days from 6 months ago)
    const randomDate1 = new Date(sixMonthsAgo);
    randomDate1.setDate(randomDate1.getDate() + Math.floor(Math.random() * 30));
    randomDate1.setHours(0, 0, 0, 0);
    
    const randomDate2 = new Date(sixMonthsAgo);
    randomDate2.setDate(randomDate2.getDate() + Math.floor(Math.random() * 30) + 30);
    randomDate2.setHours(0, 0, 0, 0);
    
    for (const randomDate of [randomDate1, randomDate2]) {
      const nextDay = new Date(randomDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const randomData = await db
        .select()
        .from(halfHourAverages)
        .where(
          and(
            eq(halfHourAverages.espId, deviceId),
            gte(halfHourAverages.timestamp, randomDate),
            lt(halfHourAverages.timestamp, nextDay)
          )
        );
      
      weekdayPatterns.push(...randomData);
    }

    return {
      sameDayLastYears,
      lastSevenDays,
      weekdayPatterns,
    };
  } catch (error) {
    console.error(`Error getting historical dataset for device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Generate AI predictions for next day's traffic
 */
export async function generatePredictions(deviceId: string): Promise<number[]> {
  try {
    const historicalData = await getHistoricalDataset(deviceId);
    
    // Get device info for context
    const device = await db
      .select()
      .from(espDevices)
      .where(eq(espDevices.deviceId, deviceId))
      .limit(1);
    
    const deviceInfo = device[0];
    if (!deviceInfo) {
      throw new Error(`Device ${deviceId} not found`);
    }

    // Prepare data for AI
    const prompt = `
You are a traffic prediction AI system. Based on the historical traffic data provided below, predict traffic jam probability percentages for the next 48 half-hour periods (next day from 00:00 to 23:30).

Device Information:
- Location: ${deviceInfo.location}
- Name: ${deviceInfo.name}
- Data Format: averageValue = jam congestion percentage (0-100%)

Historical Data Analysis:
1. Same day previous years (${historicalData.sameDayLastYears.length} data points):
${JSON.stringify(historicalData.sameDayLastYears.map(d => ({
  halfHour: d.halfHourIndex,
  jamPercent: d.averageValue,
  date: d.timestamp
})), null, 2)}

2. Last 7 days patterns (${historicalData.lastSevenDays.length} data points):
${JSON.stringify(historicalData.lastSevenDays.map(d => ({
  halfHour: d.halfHourIndex,
  jamPercent: d.averageValue,
  date: d.timestamp
})), null, 2)}

3. Weekday and seasonal patterns (${historicalData.weekdayPatterns.length} data points):
${JSON.stringify(historicalData.weekdayPatterns.map(d => ({
  halfHour: d.halfHourIndex,
  jamPercent: d.averageValue,
  date: d.timestamp
})), null, 2)}

Instructions:
- Return ONLY a JSON array of 48 numbers (0-100) representing traffic jam probability percentages
- Index 0 = 00:00-00:30, Index 1 = 00:30-01:00, ..., Index 47 = 23:30-24:00
- Use historical jam percentages to predict future jam percentages
- Higher historical jamPercent values indicate higher likelihood of future congestion
- Consider patterns from historical data, typical rush hours, and location context
- Format: [10, 15, 8, 12, ..., 25] (exactly 48 numbers)

Response format: [number, number, ..., number]`;

    const response = await ai(prompt);
    const result = (await response.json()) as AIResponse;

    if (!response.ok) {
      throw new Error(`AI API error: ${result.error?.message || "Unknown error"}`);
    }

    const predictionText = result.choices?.[0]?.message?.content || "[]";
    
    // Parse AI response to extract the array
    try {
      const predictions = JSON.parse(predictionText.trim());
      
      if (!Array.isArray(predictions) || predictions.length !== 48) {
        throw new Error(`Invalid prediction format. Expected array of 48 numbers, got: ${predictions}`);
      }
      
      // Validate all values are numbers between 0-100
      const validatedPredictions = predictions.map((p: any, index: number) => {
        const num = Number(p);
        if (isNaN(num) || num < 0 || num > 100) {
          console.warn(`Invalid prediction value at index ${index}: ${p}, using 0`);
          return 0;
        }
        return Math.round(num);
      });
      
      return validatedPredictions;
    } catch (parseError) {
      console.error("Error parsing AI prediction response:", parseError);
      console.error("AI Response:", predictionText);
      
      // Return default predictions if parsing fails
      return new Array(48).fill(0);
    }
  } catch (error) {
    console.error(`Error generating predictions for device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Store predictions in database
 */
export async function storePredictions(deviceId: string, predictedValues: number[]): Promise<void> {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    await db.insert(predictions).values({
      espId: deviceId,
      predictionDate: tomorrow,
      predictedValues: JSON.stringify(predictedValues),
    });

    console.log(`Stored predictions for device ${deviceId} for date ${tomorrow.toISOString()}`);
  } catch (error) {
    console.error(`Error storing predictions for device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Get stored predictions for a device
 */
export async function getPredictions(deviceId: string): Promise<number[] | null> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db
      .select()
      .from(predictions)
      .where(
        and(
          eq(predictions.espId, deviceId),
          eq(predictions.predictionDate, today)
        )
      )
      .orderBy(desc(predictions.generatedAt))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return JSON.parse(result[0].predictedValues);
  } catch (error) {
    console.error(`Error getting predictions for device ${deviceId}:`, error);
    return null;
  }
}

/**
 * Main function to process daily predictions for all devices
 */
export async function processAllDevicePredictions(): Promise<void> {
  try {
    // Get all active devices
    const devices = await db.select().from(espDevices);
    
    console.log(`Processing predictions for ${devices.length} devices`);
    
    for (const device of devices) {
      try {
        // Calculate half-hour averages for yesterday's data
        await calculateHalfHourAverages(device.deviceId);
        
        // Generate predictions for tomorrow
        const predictedValues = await generatePredictions(device.deviceId);
        
        // Store predictions
        await storePredictions(device.deviceId, predictedValues);
        
        console.log(`Completed prediction processing for device ${device.deviceId}`);
      } catch (deviceError) {
        console.error(`Error processing predictions for device ${device.deviceId}:`, deviceError);
        // Continue with other devices even if one fails
      }
    }
    
    console.log("Completed processing all device predictions");
  } catch (error) {
    console.error("Error processing all device predictions:", error);
    throw error;
  }
}
