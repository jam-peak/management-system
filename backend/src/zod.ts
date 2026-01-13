import { z } from "zod";

// Device Schemas
export const DeviceSchema = z.object({
  id: z.number(),
  deviceId: z.string(),
  name: z.string(),
  location: z.string(),
  road1Name: z.string(),
  road2Name: z.string(),
  apiKey: z.string(),
  lastSeenAt: z.string().nullable(),
  createdAt: z.string(),
});

export const CreateDeviceSchema = z.object({
  deviceId: z.string().min(3),
  name: z.string().min(3),
  location: z.string().min(3),
  road1Name: z.string().min(1),
  road2Name: z.string().min(1),
});

export const DeviceIdParamSchema = z.object({
  id: z.string(),
});

// Device Reading Schemas
export const CreateReadingsSchema = z.object({
  deviceId: z.string(),
  timestamp: z.union([z.number(), z.string().datetime()]).optional(),
  road1JamPercent: z.number().int().min(0).max(100),
  road2JamPercent: z.number().int().min(0).max(100),
});

export const ReadingResponseSchema = z.object({
  id: z.number(),
  deviceId: z.string(),
  road1JamPercent: z.number(),
  road2JamPercent: z.number(),
  batchId: z.string().nullable(),
  timestamp: z.string(),
});

// Preference Schemas
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
  deviceId: z.string(),
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
