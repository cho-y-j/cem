ALTER TABLE `docs_compliance` MODIFY COLUMN `status` varchar(50) NOT NULL DEFAULT 'pending_admin';--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `docType` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `fileName` varchar(300);--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `fileSize` int;--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `mimeType` varchar(100);--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `issueDate` datetime;--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `workflowStage` varchar(50) DEFAULT 'bp_upload' NOT NULL;--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `adminApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `adminApprovedBy` varchar(64);--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `bpApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `bpApprovedBy` varchar(64);--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `epApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `epApprovedBy` varchar(64);--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `workOrderFileUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `workOrderUploadedAt` timestamp;--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `rejectReason` text;--> statement-breakpoint
ALTER TABLE `docs_compliance` ADD `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;