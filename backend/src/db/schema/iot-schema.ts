import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ESP Device Registry
export const espDevices = sqliteTable("esp_devices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: text("device_id").notNull().unique(),
  name: text("name").notNull(),
  location: text("location").notNull(),
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

// Raw Sensor Readings (Simple)
export const sensorReadings = sqliteTable("sensor_readings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: text("device_id")
    .notNull()
    .references(() => espDevices.deviceId, { onDelete: "cascade" }),
  pin: integer("pin").notNull(), // GPIO pin number
  distanceCm: integer("distance_cm").notNull(),
  batchId: text("batch_id"), // Groups readings from the same request
  timestamp: integer("timestamp", { mode: "timestamp" })
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
