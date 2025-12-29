import { z } from "zod";

// Device Schemas
export const DeviceSchema = z.object({
  id: z.number(),
  deviceId: z.string(),
  name: z.string(),
  location: z.string(),
  apiKey: z.string(),
  lastSeenAt: z.string().nullable(),
  createdAt: z.string(),
});

export const CreateDeviceSchema = z.object({
  deviceId: z.string().min(3),
  name: z.string().min(3),
  location: z.string().min(3),
});

export const DeviceIdParamSchema = z.object({
  id: z.string(),
});

// Sensor Reading Schemas
export const SensorReadingSchema = z.object({
  pin: z.number().int().min(0),
  distanceCm: z.number().int().min(0),
});

export const CreateReadingsSchema = z.object({
  deviceId: z.string(),
  timestamp: z.union([z.number(), z.string().datetime()]).optional(),
  readings: z.array(SensorReadingSchema).min(1),
});

export const ReadingResponseSchema = z.object({
  id: z.number(),
  deviceId: z.string(),
  pin: z.number(),
  distanceCm: z.number(),
  timestamp: z.string(),
});

// Command Schemas
export const CommandSchema = z.object({
  id: z.number(),
  deviceId: z.string(),
  commandType: z.string(),
  status: z.string(),
  createdAt: z.string(),
  executedAt: z.string().nullable(),
});

export const CreateCommandSchema = z.object({
  deviceId: z.string(),
  commandType: z.enum(["open_corridor"]),
});

export const UpdateCommandSchema = z.object({
  status: z.enum(["executed", "failed"]),
});

export const CommandIdParamSchema = z.object({
  id: z.string(),
});

export const DeviceIdQuerySchema = z.object({
  device_id: z.string(),
});

// Response Schemas
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});
