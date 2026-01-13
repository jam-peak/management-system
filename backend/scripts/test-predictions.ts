#!/usr/bin/env tsx
/**
 * Test script for the traffic prediction system
 * Usage: npx tsx scripts/test-predictions.ts
 */

import { db } from "../src/db";
import { 
  calculateHalfHourAverages, 
  generatePredictions, 
  storePredictions, 
  getPredictions,
  processAllDevicePredictions 
} from "../src/lib/predications";
import { espDevices, deviceReadings, halfHourAverages, predictions } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function createTestData() {
  console.log("Creating test data...");
  
  // Create a test device if it doesn't exist
  const testDeviceId = "test-esp-001";
  
  try {
    const existingDevice = await db
      .select()
      .from(espDevices)
      .where(eq(espDevices.deviceId, testDeviceId))
      .limit(1);
    
    if (existingDevice.length === 0) {
      await db.insert(espDevices).values({
        deviceId: testDeviceId,
        name: "Test ESP Device",
        location: "Test Location - Main St",
        road1Name: "Highway 101 North",
        road2Name: "Highway 101 South", 
        apiKey: "test-api-key-001",
      });
      console.log(`Created test device: ${testDeviceId}`);
    } else {
      console.log(`Test device already exists: ${testDeviceId}`);
    }
    
    // Generate test sensor readings for the last few days
    const now = new Date();
    const testDays = 30; // Generate 30 days of test data
    
    console.log(`Generating ${testDays} days of test sensor readings...`);
    
    for (let day = 0; day < testDays; day++) {
      const testDate = new Date(now);
      testDate.setDate(testDate.getDate() - day);
      testDate.setHours(0, 0, 0, 0);
      
      // Generate readings for each hour of the day
      for (let hour = 0; hour < 24; hour++) {
        const hourDate = new Date(testDate);
        hourDate.setHours(hour);
        
        // Simulate traffic patterns (higher traffic during rush hours)
        let baseDistance = 100; // Normal traffic distance
        
        // Rush hour patterns (7-9 AM and 5-7 PM)
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
          baseDistance = 30 + Math.random() * 40; // Heavy traffic: 30-70cm
        } else if (hour >= 22 || hour <= 6) {
          baseDistance = 120 + Math.random() * 80; // Light traffic: 120-200cm
        } else {
          baseDistance = 70 + Math.random() * 60; // Moderate traffic: 70-130cm
        }
        
        // Generate multiple readings per hour (simulate real sensor data)
        for (let reading = 0; reading < 10; reading++) {
          const readingDate = new Date(hourDate);
          readingDate.setMinutes(reading * 6); // Every 6 minutes
          
          const jamPercent1 = Math.round(Math.random() * 100);
          const jamPercent2 = Math.round(Math.random() * 100);
          
          try {
            await db.insert(deviceReadings).values({
              deviceId: testDeviceId,
              road1JamPercent: jamPercent1,
              road2JamPercent: jamPercent2,
              batchId: `test-batch-${day}-${hour}-${reading}`,
              timestamp: readingDate,
            });
          } catch (error) {
            // Ignore duplicate entries or other insertion errors
            console.error(`Error inserting reading for ${readingDate.toISOString()}:`, error);
          }
        }
      }
      
      if (day % 5 === 0) {
        console.log(`Generated data for ${testDays - day} days ago...`);
      }
    }
    
    console.log("Test data creation completed!");
    return testDeviceId;
    
  } catch (error) {
    console.error("Error creating test data:", error);
    throw error;
  }
}

async function testPredictionSystem() {
  console.log("Testing Traffic Prediction System\n");
  
  try {
    // Create test data
    const testDeviceId = await createTestData();
    
    // Test 1: Calculate half-hour averages
    console.log("1. Testing half-hour average calculation...");
    await calculateHalfHourAverages(testDeviceId);
    
    // Check if averages were created
    const averagesCount = await db
      .select()
      .from(halfHourAverages)
      .where(eq(halfHourAverages.espId, testDeviceId));
    
    console.log(`   ✓ Created ${averagesCount.length} half-hour average records\n`);
    
    // Test 2: Generate predictions
    console.log("2. Testing AI prediction generation...");
    const predictedValues = await generatePredictions(testDeviceId);
    
    if (predictedValues && predictedValues.length === 48) {
      const avgPrediction = Math.round(predictedValues.reduce((sum, p) => sum + p, 0) / 48);
      const maxPrediction = Math.max(...predictedValues);
      const minPrediction = Math.min(...predictedValues);
      
      console.log(`   ✓ Generated 48 predictions successfully`);
      console.log(`   ✓ Average jam probability: ${avgPrediction}%`);
      console.log(`   ✓ Range: ${minPrediction}% - ${maxPrediction}%\n`);
    } else {
      throw new Error("Invalid predictions generated");
    }
    
    // Test 3: Store predictions
    console.log("3. Testing prediction storage...");
    await storePredictions(testDeviceId, predictedValues);
    console.log(`   ✓ Stored predictions successfully\n`);
    
    // Test 4: Retrieve stored predictions
    console.log("4. Testing prediction retrieval...");
    const storedPredictions = await getPredictions(testDeviceId);
    
    if (storedPredictions && storedPredictions.length === 48) {
      console.log(`   ✓ Retrieved ${storedPredictions.length} predictions`);
      console.log(`   ✓ Sample predictions:`);
      
      // Show some sample predictions with time slots
      for (let i = 0; i < 48; i += 8) { // Every 4 hours
        const hour = Math.floor(i / 2);
        const minute = (i % 2) * 30;
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        console.log(`      ${timeSlot}: ${storedPredictions[i]}% jam probability`);
      }
      console.log();
    } else {
      throw new Error("Failed to retrieve predictions");
    }
    
    // Test 5: Full system test
    console.log("5. Testing complete system processing...");
    await processAllDevicePredictions();
    console.log(`   ✓ Complete system processing successful\n`);
    
    // Summary
    console.log("📊 Test Summary:");
    console.log("================");
    console.log("✅ Half-hour average calculation: PASSED");
    console.log("✅ AI prediction generation: PASSED");
    console.log("✅ Prediction storage: PASSED");
    console.log("✅ Prediction retrieval: PASSED");
    console.log("✅ Full system processing: PASSED");
    console.log("\n🎉 All tests completed successfully!");
    
    // Display API endpoint examples
    console.log("\n📡 API Endpoint Usage:");
    console.log("======================");
    console.log(`GET /predictions/${testDeviceId} - Get predictions for test device`);
    console.log(`GET /predictions - Get overview of all devices`);
    console.log(`POST /predictions/${testDeviceId}/regenerate - Force regenerate predictions`);
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

async function cleanupTestData() {
  const testDeviceId = "test-esp-001";
  
  try {
    // Clean up in reverse order due to foreign key constraints
    await db.delete(predictions).where(eq(predictions.espId, testDeviceId));
    await db.delete(halfHourAverages).where(eq(halfHourAverages.espId, testDeviceId));
    await db.delete(deviceReadings).where(eq(deviceReadings.deviceId, testDeviceId));
    await db.delete(espDevices).where(eq(espDevices.deviceId, testDeviceId));
    
    console.log("🧹 Test data cleanup completed");
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes("--cleanup")) {
    await cleanupTestData();
    return;
  }
  
  if (args.includes("--help")) {
    console.log("Traffic Prediction System Test Script");
    console.log("Usage: npx tsx scripts/test-predictions.ts [options]");
    console.log("");
    console.log("Options:");
    console.log("  --help     Show this help message");
    console.log("  --cleanup  Clean up test data");
    console.log("");
    return;
  }
  
  try {
    await testPredictionSystem();
  } finally {
    // Optionally cleanup after test
    if (args.includes("--auto-cleanup")) {
      await cleanupTestData();
    }
  }
}

// Run the script
main().catch(console.error);