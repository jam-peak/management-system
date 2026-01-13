import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ESP Device Registry
export const espDevices = sqliteTable("esp_devices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: text("device_id").notNull().unique(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  road1Name: text("road1_name").notNull(),
  road2Name: text("road2_name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ESP Device Preferences/Configuration
export const espPreferences = sqliteTable("esp_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: text("device_id")
    .notNull()
    .unique()
    .references(() => espDevices.deviceId, { onDelete: "cascade" }),
  disabledPins: text("disabled_pins").notNull().default("[]"), // JSON array
  samplingRateMs: integer("sampling_rate_ms").notNull().default(1000),
  jamThresholdCm: integer("jam_threshold_cm").notNull().default(50),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Command Queue (Polling Architecture)
export const commands = sqliteTable("commands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: text("device_id")
    .notNull()
    .references(() => espDevices.deviceId, { onDelete: "cascade" }),
  commandType: text("command_type").notNull(), // open_corridor
  status: text("status").notNull().default("pending"), // pending, executed, failed
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  executedAt: integer("executed_at", { mode: "timestamp" }),
});

// Half-hour averages for traffic prediction (separate by road)
export const halfHourAverages = sqliteTable("half_hour_averages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  espId: text("esp_id")
    .notNull()
    .references(() => espDevices.deviceId, { onDelete: "cascade" }),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(), // Date + half-hour index
  road1AveragePercent: integer("road1_average_percent").notNull(), // Average jam % for road 1 
  road2AveragePercent: integer("road2_average_percent").notNull(), // Average jam % for road 2
  halfHourIndex: integer("half_hour_index").notNull(), // 0-47 (48 half-hours per day)
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Device readings with jam percentages per road
export const deviceReadings = sqliteTable("device_readings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: text("device_id")
    .notNull()
    .references(() => espDevices.deviceId, { onDelete: "cascade" }),
  road1JamPercent: integer("road1_jam_percent").notNull(),
  road2JamPercent: integer("road2_jam_percent").notNull(),
  batchId: text("batch_id"),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// AI-generated traffic predictions
export const predictions = sqliteTable("predictions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  espId: text("esp_id")
    .notNull()
    .references(() => espDevices.deviceId, { onDelete: "cascade" }),
  predictionDate: integer("prediction_date", { mode: "timestamp" }).notNull(), // Date for which predictions are made
  predictedValues: text("predicted_values").notNull(), // JSON array of 48 half-hour traffic jam percentages
  generatedAt: integer("generated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
