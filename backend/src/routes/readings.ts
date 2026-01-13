import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { deviceReadings, espDevices } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import {
  CreateReadingsSchema,
  ReadingResponseSchema,
  DeviceIdParamSchema,
} from "../zod";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

export interface ReadingData {
  road1JamPercent: number;
  road2JamPercent: number;
}

export interface DeviceReadingInsert {
  deviceId: string;
  road1JamPercent: number;
  road2JamPercent: number;
  batchId: string;
  timestamp: Date;
}

const readings = new Hono();

// Store sensor readings (ESP endpoint)
readings.post("/", async (ctx: any) => {
  try {
    const body = await ctx.req.json();
    const { success, data, error } = CreateReadingsSchema.safeParse(body);

    if (!success) {
      return ctx.json(
        {
          success: false,
          error: "Invalid request data",
          details: error?.issues,
        },
        400
      );
    }

    const { deviceId, road1JamPercent, road2JamPercent } = data;

    // Validate device exists
    const deviceCheck = await db
      .select()
      .from(espDevices)
      .where(eq(espDevices.deviceId, deviceId))
      .limit(1);

    if (!deviceCheck || deviceCheck.length === 0) {
      return ctx.json(
        {
          success: false,
          error: `Device '${deviceId}' not found. Please register the device first.`,
        },
        404
      );
    }

    // Always use server timestamp for accuracy and consistency
    const timestampDate = new Date();

    // Generate unique batch ID for this request
    const batchId = `batch_${nanoid()}`;

    // Insert device reading
    const insert: DeviceReadingInsert = {
      deviceId,
      road1JamPercent,
      road2JamPercent,
      batchId,
      timestamp: timestampDate,
    };

    await db.insert(deviceReadings).values(insert);

    // Update last seen
    await db
      .update(espDevices)
      .set({ lastSeenAt: new Date() })
      .where(eq(espDevices.deviceId, deviceId));

    return ctx.json({
      success: true,
      data: { stored: 1, batchId },
    });
  } catch (error: any) {
    return ctx.json(
      {
        success: false,
        error: error.message || "Failed to store readings",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});

// Get latest readings for a device
readings.get("/:id", async (ctx: any) => {
  try {
    const deviceId = ctx.req.param("id");
    const { success, data, error } = DeviceIdParamSchema.safeParse({
      id: deviceId,
    });
    if (!success) {
      return ctx.json(
        {
          success: false,
          error: "Invalid device ID",
          details: error?.issues,
        },
        400
      );
    }

    const latestReadings = await db
      .select()
      .from(deviceReadings)
      .where(eq(deviceReadings.deviceId, data.id))
      .orderBy(desc(deviceReadings.timestamp))
      .limit(100);

    const transformedReadings = latestReadings.map((reading) => ({
      ...reading,
      timestamp: reading.timestamp.toISOString(),
    }));

    return ctx.json({
      success: true,
      data: z.array(ReadingResponseSchema).parse(transformedReadings),
    });
  } catch (error: any) {
    return ctx.json(
      {
        success: false,
        error: error.message || "Failed to retrieve readings",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});

// Delete readings by batch ID
readings.delete("/batch/:batchId", async (ctx: any) => {
  try {
    const batchId = ctx.req.param("batchId");

    if (!batchId || !batchId.startsWith("batch_")) {
      return ctx.json(
        {
          success: false,
          error: "Invalid batch ID format",
        },
        400
      );
    }

    // Check if any readings exist with this batch ID
    const existingReadings = await db
      .select()
      .from(deviceReadings)
      .where(eq(deviceReadings.batchId, batchId))
      .limit(1);

    if (!existingReadings || existingReadings.length === 0) {
      return ctx.json(
        {
          success: false,
          error: "No readings found for this batch ID",
        },
        404
      );
    }

    // Delete all readings with this batch ID
    const deleteResult = await db
      .delete(deviceReadings)
      .where(eq(deviceReadings.batchId, batchId));

    return ctx.json({
      success: true,
      data: {
        message: `Readings batch '${batchId}' deleted successfully`,
        batchId: batchId,
      },
    });
  } catch (error: any) {
    return ctx.json(
      {
        success: false,
        error: "Failed to delete readings batch",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});

export default readings;
