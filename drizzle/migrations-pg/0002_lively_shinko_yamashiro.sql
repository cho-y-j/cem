CREATE TABLE "monthly_work_reports" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"deployment_id" varchar(64) NOT NULL,
	"year_month" varchar(7) NOT NULL,
	"total_work_days" integer DEFAULT 0,
	"total_regular_hours" numeric(8, 2) DEFAULT '0',
	"total_ot_hours" numeric(8, 2) DEFAULT '0',
	"total_night_hours" numeric(8, 2) DEFAULT '0',
	"total_amount" numeric(12, 2),
	"pdf_url" varchar(500),
	"auto_signed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "site_name" varchar(200);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "work_type" varchar(20);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "daily_rate" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "monthly_rate" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "ot_rate" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "night_rate" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "deployment_id" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "bp_company_id" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "vehicle_number" varchar(50);--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "equipment_name" varchar(100);--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "specification" varchar(100);--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "work_location" varchar(200);--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "work_content" text;--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "regular_hours" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "ot_hours" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "night_hours" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "bp_signature_data" text;--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "bp_signer_name" varchar(100);--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "work_journal" ADD COLUMN "pdf_url" varchar(500);