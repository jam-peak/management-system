CREATE TABLE `device_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` text NOT NULL,
	`road1_jam_percent` integer NOT NULL,
	`road2_jam_percent` integer NOT NULL,
	`batch_id` text,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `esp_devices`(`device_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `sensor_readings`;--> statement-breakpoint
ALTER TABLE `esp_devices` ADD `road1_name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `esp_devices` ADD `road2_name` text NOT NULL;