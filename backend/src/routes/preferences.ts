import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { espDevices, espPreferences } from "../db/schema";
import { eq } from "drizzle-orm";

// Zod schemas for preferences
export const DevicePreferencesSchema = z.object({
  id: z.number(),
  deviceId: z.string(),
  disabledPins: z.array(z.number()),
  samplingRateMs: z.number(),
  jamThresholdCm: z.number(),
  updatedAt: z.string(),
});

export const UpdatePreferencesSchema = z.object({
  disabledPins: z.array(z.number()).optional(),
  samplingRateMs: z.number().min(100).max(10000).optional(),
  jamThresholdCm: z.number().min(10).max(500).optional(),
});

const preferences = new Hono();

// Update device preferences (server-side update for administrators)
preferences.post("/:deviceId", async (c) => {
  try {
    const deviceId = c.req.param("deviceId");
    const body = await c.req.json();

    // Validate device ID
    const deviceIdSchema = z.object({
      id: z.string(),
    });
    const deviceIdValidation = deviceIdSchema.safeParse({
      id: deviceId,
    });
    if (!deviceIdValidation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid device ID",
          details: deviceIdValidation.error?.issues,
        },
        400
      );
    }

    // Validate request body
    const { success, data, error } = UpdatePreferencesSchema.safeParse(body);
    if (!success) {
      return c.json(
        {
          success: false,
          error: "Invalid request data",
          details: error?.issues,
        },
        400
      );
    }

    // Check if device exists
    const deviceCheck = await db
      .select()
      .from(espDevices)
      .where(eq(espDevices.deviceId, deviceId))
      .limit(1);

    if (!deviceCheck || deviceCheck.length === 0) {
      return c.json(
        {
          success: false,
          error: "Device not found",
        },
        404
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.disabledPins !== undefined) {
      updateData.disabledPins = JSON.stringify(data.disabledPins);
    }
    if (data.samplingRateMs !== undefined) {
      updateData.samplingRateMs = data.samplingRateMs;
    }
    if (data.jamThresholdCm !== undefined) {
      updateData.jamThresholdCm = data.jamThresholdCm;
    }

    // Upsert preferences (insert or update)
    await db
      .insert(espPreferences)
      .values({
        deviceId,
        disabledPins: updateData.disabledPins || "[]",
        samplingRateMs: updateData.samplingRateMs || 1000,
        jamThresholdCm: updateData.jamThresholdCm || 50,
        updatedAt: updateData.updatedAt,
      })
      .onConflictDoUpdate({
        target: espPreferences.deviceId,
        set: updateData,
      });

    // Get updated preferences
    const updatedPrefs = await db
      .select()
      .from(espPreferences)
      .where(eq(espPreferences.deviceId, deviceId))
      .limit(1);

    const transformedPrefs = {
      ...updatedPrefs[0],
      disabledPins: JSON.parse(updatedPrefs[0].disabledPins),
      updatedAt: updatedPrefs[0].updatedAt.toISOString(),
    };

    return c.json({
      success: true,
      data: DevicePreferencesSchema.parse(transformedPrefs),
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: "Failed to update device preferences",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});

// Sync preferences - send current ESP device preferences to device
preferences.post("/sync", async (c) => {
  try {
    const body = await c.req.json();

    // Only deviceId is required for sync
    const deviceIdSchema = z.object({
      deviceId: z.string(),
    });

    const { success, data, error } = deviceIdSchema.safeParse(body);
    if (!success) {
      return c.json(
        {
          success: false,
          error: "Invalid request data",
          details: error?.issues,
        },
        400
      );
    }

    const deviceId = data.deviceId;

    // Check if device exists
    const deviceCheck = await db
      .select()
      .from(espDevices)
      .where(eq(espDevices.deviceId, deviceId))
      .limit(1);

    if (!deviceCheck || deviceCheck.length === 0) {
      return c.json(
        {
          success: false,
          error: "Device not found",
        },
        404
      );
    }

    // Get current preferences or create defaults
    let currentPrefs = await db
      .select()
      .from(espPreferences)
      .where(eq(espPreferences.deviceId, deviceId))
      .limit(1);

    if (!currentPrefs || currentPrefs.length === 0) {
      // Create default preferences
      const newPrefs = await db
        .insert(espPreferences)
        .values({
          deviceId,
          disabledPins: "[]",
          samplingRateMs: 1000,
          jamThresholdCm: 50,
        })
        .returning();

      currentPrefs = newPrefs;
    }

    const current = currentPrefs[0];
    const transformedPrefs = {
      ...current,
      disabledPins: JSON.parse(current.disabledPins),
      updatedAt: current.updatedAt.toISOString(),
    };

    return c.json({
      success: true,
      data: DevicePreferencesSchema.parse(transformedPrefs),
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: "Failed to sync device preferences",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});

export default preferences;
