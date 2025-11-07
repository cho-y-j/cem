CREATE TYPE "public"."document_status" AS ENUM('valid', 'warning', 'expired', 'missing', 'pending');--> statement-breakpoint
CREATE TYPE "public"."entry_request_item_type" AS ENUM('equipment', 'worker');--> statement-breakpoint
CREATE TYPE "public"."entry_request_status" AS ENUM('bp_draft', 'bp_requested', 'owner_reviewing', 'owner_approved', 'bp_reviewing', 'bp_approved', 'ep_reviewing', 'ep_approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."target_type" AS ENUM('equipment', 'worker');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'owner', 'bp', 'ep', 'worker', 'inspector');--> statement-breakpoint
CREATE TABLE "check_records" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"equipment_id" varchar(64) NOT NULL,
	"checklist_form_id" varchar(64) NOT NULL,
	"inspector_id" varchar(64),
	"inspection_date" timestamp NOT NULL,
	"result_json" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_forms" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"form_json" jsonb NOT NULL,
	"created_by" varchar(64),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "docs_compliance" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"target_type" "target_type" NOT NULL,
	"target_id" varchar(64) NOT NULL,
	"doc_type_id" varchar(64) NOT NULL,
	"doc_type" varchar(200) NOT NULL,
	"file_name" varchar(300),
	"file_url" varchar(500) NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"issue_date" timestamp,
	"expiry_date" timestamp,
	"workflow_stage" varchar(50) DEFAULT 'bp_upload' NOT NULL,
	"admin_approved_at" timestamp,
	"admin_approved_by" varchar(64),
	"bp_approved_at" timestamp,
	"bp_approved_by" varchar(64),
	"ep_approved_at" timestamp,
	"ep_approved_by" varchar(64),
	"work_order_file_url" varchar(500),
	"work_order_uploaded_at" timestamp,
	"status" varchar(50) DEFAULT 'pending_admin' NOT NULL,
	"reject_reason" text,
	"uploaded_by" varchar(64),
	"uploaded_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entry_request_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"entry_request_id" varchar(64) NOT NULL,
	"item_type" "entry_request_item_type" NOT NULL,
	"item_id" varchar(64) NOT NULL,
	"document_status" "document_status" DEFAULT 'pending' NOT NULL,
	"document_issues" jsonb,
	"paired_equipment_id" varchar(64),
	"paired_worker_id" varchar(64),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entry_requests" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"request_number" varchar(100) NOT NULL,
	"bp_company_id" varchar(64) NOT NULL,
	"bp_user_id" varchar(64) NOT NULL,
	"equipment_id" varchar(64),
	"worker_id" varchar(64),
	"purpose" text,
	"requested_start_date" timestamp,
	"requested_end_date" timestamp,
	"status" "entry_request_status" DEFAULT 'bp_requested' NOT NULL,
	"documents_verified_at" timestamp,
	"documents_verification_result" jsonb,
	"owner_approved_at" timestamp,
	"owner_approved_by" varchar(64),
	"owner_comment" text,
	"bp_approved_at" timestamp,
	"bp_approved_by" varchar(64),
	"work_plan_file_url" varchar(500),
	"bp_comment" text,
	"ep_approved_at" timestamp,
	"ep_approved_by" varchar(64),
	"ep_comment" text,
	"rejected_at" timestamp,
	"rejected_by" varchar(64),
	"reject_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equip_types" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"checklist_form_id" varchar(64),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "equip_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"equip_type_id" varchar(64) NOT NULL,
	"reg_num" varchar(100) NOT NULL,
	"owner_id" varchar(64),
	"current_bp_id" varchar(64),
	"status" varchar(50) DEFAULT 'idle' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "equipment_reg_num_unique" UNIQUE("reg_num")
);
--> statement-breakpoint
CREATE TABLE "type_docs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"equip_type_id" varchar(64) NOT NULL,
	"doc_name" varchar(200) NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"has_expiry" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text,
	"email" varchar(320),
	"password" text,
	"pin" varchar(4),
	"login_method" varchar(64),
	"role" "user_role" DEFAULT 'owner' NOT NULL,
	"company_id" varchar(64),
	"created_at" timestamp DEFAULT now(),
	"last_signed_in" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "work_journal" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"equipment_id" varchar(64) NOT NULL,
	"worker_id" varchar(64) NOT NULL,
	"site_name" varchar(200) NOT NULL,
	"work_date" timestamp NOT NULL,
	"start_time" varchar(10) NOT NULL,
	"end_time" varchar(10) NOT NULL,
	"total_hours" integer NOT NULL,
	"work_details" text,
	"submitted_by" varchar(64),
	"submitted_at" timestamp DEFAULT now(),
	"approved_by_bp" varchar(64),
	"approved_at_bp" timestamp,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"bp_comments" text
);
--> statement-breakpoint
CREATE TABLE "worker_docs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"worker_type_id" varchar(64) NOT NULL,
	"doc_name" varchar(200) NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"has_expiry" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "worker_types" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "worker_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"worker_type_id" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"license_num" varchar(100),
	"license_status" varchar(50),
	"owner_id" varchar(64),
	"phone" varchar(20),
	"pin_code" varchar(6),
	"address" text,
	"resident_number" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
