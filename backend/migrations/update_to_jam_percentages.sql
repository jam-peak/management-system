-- Migration to update schema from sensor readings to device readings with jam percentages

-- Add new columns to esp_devices table
ALTER TABLE esp_devices ADD COLUMN road1_name TEXT;
ALTER TABLE esp_devices ADD COLUMN road2_name TEXT;

-- Create new device_readings table
CREATE TABLE device_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL REFERENCES esp_devices(device_id) ON DELETE CASCADE,
    road1_jam_percent INTEGER NOT NULL,
    road2_jam_percent INTEGER NOT NULL,
    batch_id TEXT,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create index for better query performance
CREATE INDEX idx_device_readings_device_timestamp ON device_readings(device_id, timestamp);
CREATE INDEX idx_device_readings_batch ON device_readings(batch_id);

-- Note: The old sensor_readings table can be dropped after migration is confirmed
-- DROP TABLE sensor_readings;