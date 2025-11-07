CREATE TABLE `check_records` (
	`id` varchar(64) NOT NULL,
	`equipmentId` varchar(64) NOT NULL,
	`checklistFormId` varchar(64) NOT NULL,
	`inspectorId` varchar(64),
	`inspectionDate` timestamp NOT NULL,
	`resultJson` json NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'completed',
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `check_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklist_forms` (
	`id` varchar(64) NOT NULL,
	`name` varchar(200) NOT NULL,
	`formJson` json NOT NULL,
	`createdBy` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklist_forms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `docs_compliance` (
	`id` varchar(64) NOT NULL,
	`targetType` enum('equipment','worker') NOT NULL,
	`targetId` varchar(64) NOT NULL,
	`docTypeId` varchar(64) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`expiryDate` datetime,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`uploadedBy` varchar(64),
	`uploadedAt` timestamp DEFAULT (now()),
	CONSTRAINT `docs_compliance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equip_types` (
	`id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`checklistFormId` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equip_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `equip_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` varchar(64) NOT NULL,
	`equipTypeId` varchar(64) NOT NULL,
	`regNum` varchar(100) NOT NULL,
	`ownerId` varchar(64),
	`currentBpId` varchar(64),
	`status` varchar(50) NOT NULL DEFAULT 'idle',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`),
	CONSTRAINT `equipment_regNum_unique` UNIQUE(`regNum`)
);
--> statement-breakpoint
CREATE TABLE `type_docs` (
	`id` varchar(64) NOT NULL,
	`equipTypeId` varchar(64) NOT NULL,
	`docName` varchar(200) NOT NULL,
	`isMandatory` boolean NOT NULL DEFAULT true,
	`hasExpiry` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `type_docs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_journal` (
	`id` varchar(64) NOT NULL,
	`equipmentId` varchar(64) NOT NULL,
	`workerId` varchar(64) NOT NULL,
	`siteName` varchar(200) NOT NULL,
	`workDate` datetime NOT NULL,
	`startTime` varchar(10) NOT NULL,
	`endTime` varchar(10) NOT NULL,
	`totalHours` int NOT NULL,
	`workDetails` text,
	`submittedBy` varchar(64),
	`submittedAt` timestamp DEFAULT (now()),
	`approvedByBp` varchar(64),
	`approvedAtBp` timestamp,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`bpComments` text,
	CONSTRAINT `work_journal_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `worker_docs` (
	`id` varchar(64) NOT NULL,
	`workerTypeId` varchar(64) NOT NULL,
	`docName` varchar(200) NOT NULL,
	`isMandatory` boolean NOT NULL DEFAULT true,
	`hasExpiry` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `worker_docs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `worker_types` (
	`id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `worker_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `worker_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `workers` (
	`id` varchar(64) NOT NULL,
	`workerTypeId` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`licenseNum` varchar(100),
	`licenseStatus` varchar(50),
	`ownerId` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','owner','bp','ep','worker','inspector') NOT NULL DEFAULT 'owner';--> statement-breakpoint
ALTER TABLE `users` ADD `companyId` varchar(64);