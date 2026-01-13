-- Migration: Add half-hour averages and predictions tables for traffic prediction system
-- Created: 2026-01-12

-- Half-hour averages for traffic prediction
CREATE TABLE IF NOT EXISTS "half_hour_averages" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "esp_id" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL, -- Date + half-hour index
    "average_value" INTEGER NOT NULL, -- Average distance in cm for this half-hour
    "half_hour_index" INTEGER NOT NULL, -- 0-47 (48 half-hours per day)
    "created_at" INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY ("esp_id") REFERENCES "esp_devices" ("device_id") ON DELETE CASCADE
);

-- AI-generated traffic predictions
CREATE TABLE IF NOT EXISTS "predictions" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "esp_id" TEXT NOT NULL,
    "prediction_date" INTEGER NOT NULL, -- Date for which predictions are made
    "predicted_values" TEXT NOT NULL, -- JSON array of 48 half-hour traffic jam percentages
    "generated_at" INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY ("esp_id") REFERENCES "esp_devices" ("device_id") ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_half_hour_averages_esp_id_timestamp" ON "half_hour_averages" ("esp_id", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_half_hour_averages_half_hour_index" ON "half_hour_averages" ("half_hour_index");
CREATE INDEX IF NOT EXISTS "idx_predictions_esp_id_date" ON "predictions" ("esp_id", "prediction_date");
CREATE INDEX IF NOT EXISTS "idx_predictions_prediction_date" ON "predictions" ("prediction_date");

-- Add comments for documentation
PRAGMA table_info("half_hour_averages");
PRAGMA table_info("predictions");