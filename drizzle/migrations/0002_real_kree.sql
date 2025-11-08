ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','call_center','reception','pending') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` ADD `isApproved` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `displayName` varchar(255);