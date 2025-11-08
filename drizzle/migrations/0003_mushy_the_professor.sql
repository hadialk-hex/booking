CREATE TABLE `bookingSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookingSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD `bookingSourceId` int;--> statement-breakpoint
ALTER TABLE `appointments` ADD `bookingSourceName` varchar(255);--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `bookingSource`;