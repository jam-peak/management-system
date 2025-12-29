import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { sensorReadings, espDevices } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import {
  CreateReadingsSchema,
  ReadingResponseSchema,
  DeviceIdParamSchema,
} from "../zod";

export interface ReadingData {
  pin: string | number;
  distanceCm: number;
}

export interface SensorReadingInsert {
  deviceId: string;
  pin: number;
  distanceCm: number;
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

    const { deviceId, timestamp, readings: readingsData } = data;

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

    // Convert timestamp to Date object
    let timestampDate: Date;
    if (timestamp) {
      timestampDate = new Date(timestamp);
    } else {
      timestampDate = new Date();
    }

    // Validate timestamp is valid
    if (isNaN(timestampDate.getTime())) {
      return ctx.json(
        {
          success: false,
          error: "Invalid timestamp format",
        },
        400
      );
    }

    // Insert all readings
    const inserts: SensorReadingInsert[] = readingsData.map(
      (r: ReadingData) => ({
        deviceId,
        pin: typeof r.pin === "string" ? parseInt(r.pin) : r.pin || 0,
        distanceCm: r.distanceCm,
        timestamp: timestampDate, // Use Date object
      })
    );

    await db.insert(sensorReadings).values(inserts);

    // Update last seen
    await db
      .update(espDevices)
      .set({ lastSeenAt: new Date() })
      .where(eq(espDevices.deviceId, deviceId));

    return ctx.json({
      success: true,
      data: { stored: inserts.length },
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
      .from(sensorReadings)
      .where(eq(sensorReadings.deviceId, data.id))
      .orderBy(desc(sensorReadings.timestamp))
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

export default readings;
