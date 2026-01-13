import { Hono } from "hono";
import { db } from "../db";
import { commands, espDevices } from "../db/schema";
import { eq, and } from "drizzle-orm";
import {
  CreateCommandSchema,
  UpdateCommandSchema,
  DeviceIdParamSchema,
  DeviceIdQuerySchema,
} from "../zod";

const commandsRoute = new Hono();

// Create a new command for a device
commandsRoute.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { success, data, error } = CreateCommandSchema.safeParse(body);

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

    const { deviceId, commandType } = data;

    // Validate device exists
    const deviceCheck = await db
      .select()
      .from(espDevices)
      .where(eq(espDevices.deviceId, deviceId))
      .limit(1);

    if (!deviceCheck || deviceCheck.length === 0) {
      return c.json(
        {
          success: false,
          error: `Device '${deviceId}' not found. Please register the device first.`,
        },
        404
      );
    }

    // Insert command
    const newCommand = await db
      .insert(commands)
      .values({
        deviceId,
        commandType,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    const transformedCommand = {
      ...newCommand[0],
      createdAt: newCommand[0].createdAt.toISOString(),
      executedAt: newCommand[0].executedAt
        ? newCommand[0].executedAt.toISOString()
        : null,
    };

    return c.json(
      {
        success: true,
        data: transformedCommand,
      },
      201
    );
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message || "Failed to create command",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});

// Poll for pending commands for a device
commandsRoute.get("/poll", async (c) => {
  try {
    const deviceId = c.req.query("deviceId");
    
    if (!deviceId) {
      return c.json(
        {
          success: false,
          error: "Missing deviceId query parameter",
        },
        400
      );
    }

    const { success, data, error } = DeviceIdQuerySchema.safeParse({ deviceId });

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

    // Get pending commands
    const pendingCommands = await db
      .select()
      .from(commands)
      .where(
        and(
          eq(commands.deviceId, data.deviceId),
          eq(commands.status, "pending")
        )
      )
      .limit(10);

    const transformedCommands = pendingCommands.map((cmd) => ({
      ...cmd,
      createdAt: cmd.createdAt.toISOString(),
      executedAt: cmd.executedAt ? cmd.executedAt.toISOString() : null,
    }));

    return c.json({
      success: true,
      data: transformedCommands,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message || "Failed to retrieve commands",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
}
});

// Update command status (ESP endpoint)
commandsRoute.post("/:id", async (c) => {
  try {
    const commandId = c.req.param("id");
    const body = await c.req.json();

    const { success, data, error } = DeviceIdParamSchema.safeParse({
      id: commandId,
    });

    if (!success) {
      return c.json(
        {
          success: false,
          error: "Invalid command ID",
          details: error?.issues,
        },
        400
      );
    }

    const {
      success: bodySuccess,
      data: bodyData,
      error: bodyError,
    } = UpdateCommandSchema.safeParse(body);

    if (!bodySuccess) {
      return c.json(
        {
          success: false,
          error: "Invalid request data",
          details: bodyError?.issues,
        },
        400
      );
    }

    const { status } = bodyData;

    // Update command status
    const updatedCommand = await db
      .update(commands)
      .set({
        status,
        executedAt: new Date(),
      })
      .where(eq(commands.id, parseInt(data.id)))
      .returning();

    if (!updatedCommand || updatedCommand.length === 0) {
      return c.json(
        {
          success: false,
          error: `Command '${data.id}' not found`,
        },
        404
      );
    }

    const transformedUpdated = {
      ...updatedCommand[0],
      createdAt: updatedCommand[0].createdAt.toISOString(),
      executedAt: updatedCommand[0].executedAt
        ? updatedCommand[0].executedAt.toISOString()
        : null,
    };

    return c.json({
      success: true,
      data: transformedUpdated,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message || "Failed to update command",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});

export default commandsRoute;
