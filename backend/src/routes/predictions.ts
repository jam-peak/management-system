import { Hono } from "hono";
import { z } from "zod";
import { getPredictions, generatePredictions, storePredictions } from "../lib/predications";
import { db } from "../db";
import { espDevices } from "../db/schema";
import { eq } from "drizzle-orm";

const predictionsRouter = new Hono();

// Validation schema for device ID
const DeviceIdSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
});

// Get predictions for a specific ESP device
predictionsRouter.get("/:deviceId", async (c) => {
  try {
    // Validate device ID parameter
    const result = DeviceIdSchema.safeParse({
      deviceId: c.req.param("deviceId"),
    });

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: "Invalid device ID",
          details: result.error.issues,
        },
        400
      );
    }

    const { deviceId } = result.data;

    // Verify device exists
    const device = await db
      .select()
      .from(espDevices)
      .where(eq(espDevices.deviceId, deviceId))
      .limit(1);

    if (device.length === 0) {
      return c.json(
        {
          success: false,
          error: "Device not found",
          details: `No device found with ID: ${deviceId}`,
        },
        404
      );
    }

    // Get stored predictions for today
    const predictions = await getPredictions(deviceId);

    if (!predictions) {
      return c.json(
        {
          success: false,
          error: "No predictions available",
          details: `No predictions found for device ${deviceId} for today. Predictions are generated daily via scheduled task.`,
        },
        404
      );
    }

    // Validate predictions format
    if (!Array.isArray(predictions) || predictions.length !== 48) {
      console.error(`Invalid predictions format for device ${deviceId}:`, predictions);
      return c.json(
        {
          success: false,
          error: "Invalid predictions data",
          details: "Stored predictions have invalid format. Please contact system administrator.",
        },
        500
      );
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return c.json({
      success: true,
      data: {
        deviceId: deviceId,
        deviceName: device[0].name,
        location: device[0].location,
        predictionDate: today.toISOString().split('T')[0], // YYYY-MM-DD format
        generatedAt: now.toISOString(),
        predictions: predictions.map((percentage, index) => {
          const hour = Math.floor(index / 2);
          const minute = (index % 2) * 30;
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          return {
            halfHourIndex: index,
            timeSlot: timeSlot,
            jamProbabilityPercent: percentage,
          };
        }),
        summary: {
          totalHalfHours: predictions.length,
          averageJamProbability: Math.round(predictions.reduce((sum, p) => sum + p, 0) / predictions.length),
          peakJamPeriods: predictions
            .map((percentage, index) => ({
              halfHourIndex: index,
              timeSlot: `${Math.floor(index / 2).toString().padStart(2, '0')}:${((index % 2) * 30).toString().padStart(2, '0')}`,
              jamProbabilityPercent: percentage,
            }))
            .filter(period => period.jamProbabilityPercent > 70)
            .sort((a, b) => b.jamProbabilityPercent - a.jamProbabilityPercent)
            .slice(0, 5), // Top 5 highest jam probability periods
        },
      },
    });

  } catch (error) {
    console.error("Error getting predictions:", error);
    return c.json(
      {
        success: false,
        error: "Internal server error",
        details: "Failed to retrieve predictions. Please try again later.",
      },
      500
    );
  }
});

// Force regenerate predictions for a specific device (admin endpoint)
predictionsRouter.post("/:deviceId/regenerate", async (c) => {
  try {
    // Validate device ID parameter
    const result = DeviceIdSchema.safeParse({
      deviceId: c.req.param("deviceId"),
    });

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: "Invalid device ID",
          details: result.error.issues,
        },
        400
      );
    }

    const { deviceId } = result.data;

    // Verify device exists
    const device = await db
      .select()
      .from(espDevices)
      .where(eq(espDevices.deviceId, deviceId))
      .limit(1);

    if (device.length === 0) {
      return c.json(
        {
          success: false,
          error: "Device not found",
          details: `No device found with ID: ${deviceId}`,
        },
        404
      );
    }

    // Generate new predictions
    const predictedValues = await generatePredictions(deviceId);
    
    // Store the new predictions
    await storePredictions(deviceId, predictedValues);

    return c.json({
      success: true,
      data: {
        deviceId: deviceId,
        message: "Predictions regenerated successfully",
        predictionsGenerated: predictedValues.length,
        averageJamProbability: Math.round(predictedValues.reduce((sum, p) => sum + p, 0) / predictedValues.length),
      },
    });

  } catch (error) {
    console.error("Error regenerating predictions:", error);
    return c.json(
      {
        success: false,
        error: "Internal server error",
        details: "Failed to regenerate predictions. Please check device data and try again.",
      },
      500
    );
  }
});

// Get predictions for all devices (overview endpoint)
predictionsRouter.get("/", async (c) => {
  try {
    // Get all devices
    const devices = await db.select().from(espDevices);

    if (devices.length === 0) {
      return c.json({
        success: true,
        data: {
          devices: [],
          totalDevices: 0,
          devicesWithPredictions: 0,
        },
      });
    }

    const devicePredictions = [];
    let devicesWithPredictions = 0;

    for (const device of devices) {
      try {
        const predictions = await getPredictions(device.deviceId);
        
        if (predictions && Array.isArray(predictions) && predictions.length === 48) {
          devicesWithPredictions++;
          const averageJamProbability = Math.round(predictions.reduce((sum, p) => sum + p, 0) / predictions.length);
          const maxJamProbability = Math.max(...predictions);
          
          devicePredictions.push({
            deviceId: device.deviceId,
            deviceName: device.name,
            location: device.location,
            hasPredictions: true,
            averageJamProbability,
            maxJamProbability,
            lastSeen: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
          });
        } else {
          devicePredictions.push({
            deviceId: device.deviceId,
            deviceName: device.name,
            location: device.location,
            hasPredictions: false,
            averageJamProbability: 0,
            maxJamProbability: 0,
            lastSeen: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
          });
        }
      } catch (deviceError) {
        console.error(`Error getting predictions for device ${device.deviceId}:`, deviceError);
        devicePredictions.push({
          deviceId: device.deviceId,
          deviceName: device.name,
          location: device.location,
          hasPredictions: false,
          averageJamProbability: 0,
          maxJamProbability: 0,
          lastSeen: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
          error: "Failed to load predictions",
        });
      }
    }

    return c.json({
      success: true,
      data: {
        devices: devicePredictions,
        totalDevices: devices.length,
        devicesWithPredictions,
        predictionCoverage: Math.round((devicesWithPredictions / devices.length) * 100),
      },
    });

  } catch (error) {
    console.error("Error getting all predictions:", error);
    return c.json(
      {
        success: false,
        error: "Internal server error",
        details: "Failed to retrieve predictions overview. Please try again later.",
      },
      500
    );
  }
});

export default predictionsRouter;