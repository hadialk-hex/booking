CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientName` varchar(255) NOT NULL,
	`patientPhone` varchar(50) NOT NULL,
	`appointmentDate` timestamp NOT NULL,
	`appointmentTime` varchar(10) NOT NULL,
	`doctorId` int NOT NULL,
	`doctorName` varchar(255) NOT NULL,
	`appointmentType` varchar(100) NOT NULL,
	`patientType` enum('new','existing') NOT NULL,
	`bookingSource` enum('ads','call','whatsapp') NOT NULL,
	`status` enum('scheduled','arrived','no_show','no_answer') NOT NULL DEFAULT 'scheduled',
	`price` int,
	`createdById` int NOT NULL,
	`createdByName` varchar(255) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`specialization` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','call_center','reception') NOT NULL DEFAULT 'call_center';