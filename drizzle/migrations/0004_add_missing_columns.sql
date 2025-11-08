-- Add missing columns to users table
ALTER TABLE `users` ADD COLUMN `isApproved` boolean NOT NULL DEFAULT false;
ALTER TABLE `users` ADD COLUMN `displayName` varchar(255);
-- Modify role enum to include new roles
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin', 'call_center', 'reception', 'pending', 'user') NOT NULL DEFAULT 'pending';
