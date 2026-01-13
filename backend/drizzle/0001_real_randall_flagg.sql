CREATE TABLE `commands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` text NOT NULL,
	`command_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`executed_at` integer,
	FOREIGN KEY (`device_id`) REFERENCES `esp_devices`(`device_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `esp_devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` text NOT NULL,
	`name` text NOT NULL,
	`location` text NOT NULL,
	`api_key` text NOT NULL,
	`last_seen_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `esp_devices_device_id_unique` ON `esp_devices` (`device_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `esp_devices_api_key_unique` ON `esp_devices` (`api_key`);--> statement-breakpoint
CREATE TABLE `esp_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` text NOT NULL,
	`disabled_pins` text DEFAULT '[]' NOT NULL,
	`sampling_rate_ms` integer DEFAULT 1000 NOT NULL,
	`jam_threshold_cm` integer DEFAULT 50 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `esp_devices`(`device_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `esp_preferences_device_id_unique` ON `esp_preferences` (`device_id`);--> statement-breakpoint
CREATE TABLE `half_hour_averages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`esp_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`average_value` integer NOT NULL,
	`half_hour_index` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`esp_id`) REFERENCES `esp_devices`(`device_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`esp_id` text NOT NULL,
	`prediction_date` integer NOT NULL,
	`predicted_values` text NOT NULL,
	`generated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`esp_id`) REFERENCES `esp_devices`(`device_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sensor_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` text NOT NULL,
	`pin` integer NOT NULL,
	`distance_cm` integer NOT NULL,
	`batch_id` text,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `esp_devices`(`device_id`) ON UPDATE no action ON DELETE cascade
);
