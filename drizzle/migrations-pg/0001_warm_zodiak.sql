CREATE TYPE "public"."deployment_status" AS ENUM('pending', 'active', 'extended', 'completed');--> statement-breakpoint
ALTER TYPE "public"."entry_request_status" ADD VALUE 'owner_requested' BEFORE 'owner_reviewing';--> statement-breakpoint
CREATE TABLE "deployment_extensions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"deployment_id" varchar(64) NOT NULL,
	"old_end_date" timestamp NOT NULL,
	"new_end_date" timestamp NOT NULL,
	"extension_reason" text,
	"extended_at" timestamp DEFAULT now(),
	"extended_by" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployment_worker_changes" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"deployment_id" varchar(64) NOT NULL,
	"old_worker_id" varchar(64) NOT NULL,
	"new_worker_id" varchar(64) NOT NULL,
	"change_reason" text,
	"changed_at" timestamp DEFAULT now(),
	"changed_by" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"entry_request_id" varchar(64) NOT NULL,
	"equipment_id" varchar(64) NOT NULL,
	"worker_id" varchar(64) NOT NULL,
	"owner_id" varchar(64) NOT NULL,
	"bp_company_id" varchar(64) NOT NULL,
	"ep_company_id" varchar(64),
	"start_date" timestamp NOT NULL,
	"planned_end_date" timestamp NOT NULL,
	"actual_end_date" timestamp,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
