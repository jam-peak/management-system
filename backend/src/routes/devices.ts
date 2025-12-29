import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { espDevices } from "../db/schema";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { createHash } from "crypto";
import { DeviceSchema, CreateDeviceSchema, DeviceIdParamSchema } from "../zod";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 32);

const devices = new Hono();

// List all devices
devices.get("/", async (c) => {
  try {
    const allDevices = await db.select().from(espDevices);
    if (!allDevices || allDevices.length === 0) {
      return c.json(
        {
          success: false,
          error: "No devices found",
          details: [],
        },
        404
      );
    }
    const transformedDevices = allDevices.map((device) => ({
      ...device,
      lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
      createdAt: device.createdAt.toISOString(),
    }));
    return c.json({
      success: true,
      data: z.array(DeviceSchema).parse(transformedDevices),
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: "Failed to retrieve devices",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});

// Register new device
devices.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { success, data, error } = CreateDeviceSchema.safeParse(body);
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
    const { deviceId, name, location } = data;

    // Check if deviceId already exists
    const existingDevice = await db
      .select()
      .from(espDevices)
      .where(eq(espDevices.deviceId, deviceId))
      .limit(1);

    if (existingDevice.length > 0) {
      return c.json(
        {
          success: false,
          error: `Device with ID '${deviceId}' already exists`,
        },
        409
      );
    }

    const apiKey = `key_${nanoid()}`;
    const hashedApiKey = createHash("sha256").update(apiKey).digest("hex");

    const newDevice = await db
      .insert(espDevices)
      .values({
        deviceId,
        name,
        location,
        apiKey: hashedApiKey,
        lastSeenAt: new Date(),
      })
      .returning();

    const transformedDevice = {
      ...newDevice[0],
      apiKey, // Return the plain API key
      lastSeenAt: newDevice[0].lastSeenAt
        ? newDevice[0].lastSeenAt.toISOString()
        : null,
      createdAt: newDevice[0].createdAt.toISOString(),
    };

    return c.json(
      {
        success: true,
        data: DeviceSchema.parse(transformedDevice),
      },
      201
    );
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message || "Failed to register device",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});

// Get device by ID
devices.get("/:id", async (c) => {
  try {
    const deviceId = c.req.param("id");
    const { success, data, error } = DeviceIdParamSchema.safeParse({
      id: deviceId,
    });
    if (!success) {
      return c.json(
        {
          success: false,
          error: "Invalid device ID",
          details: error?.issues,
        },
        400
      );
    }

    const device = await db
      .select()
      .from(espDevices)
      .where(eq(espDevices.deviceId, deviceId))
      .limit(1);

    if (!device || device.length === 0) {
      return c.json(
        {
          success: false,
          error: "Device not found",
        },
        404
      );
    }

    const transformedDevice = {
      ...device[0],
      lastSeenAt: device[0].lastSeenAt
        ? device[0].lastSeenAt.toISOString()
        : null,
      createdAt: device[0].createdAt.toISOString(),
    };

    return c.json({
      success: true,
      data: DeviceSchema.parse(transformedDevice),
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: "Failed to retrieve device",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});

export default devices;
