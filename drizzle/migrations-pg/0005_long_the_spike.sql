CREATE TABLE "safety_inspection_results" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"inspection_id" varchar(64) NOT NULL,
	"template_item_id" varchar(64),
	"item_text" text NOT NULL,
	"check_timing" varchar(20),
	"result" varchar(20),
	"result_text" text,
	"action_required" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "safety_inspection_template_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"template_id" varchar(64) NOT NULL,
	"category" varchar(100),
	"item_text" text NOT NULL,
	"check_frequency" varchar(20) NOT NULL,
	"check_timing" varchar(100),
	"result_type" varchar(20) DEFAULT 'status',
	"display_order" integer DEFAULT 0,
	"is_required" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "safety_inspection_templates" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"equip_type_id" varchar(64),
	"inspector_type" varchar(20) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar(64),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "safety_inspections" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"template_id" varchar(64),
	"equipment_id" varchar(64) NOT NULL,
	"inspector_id" varchar(64) NOT NULL,
	"inspector_type" varchar(20) NOT NULL,
	"inspection_date" date NOT NULL,
	"check_frequency" varchar(20) NOT NULL,
	"vehicle_number" varchar(50),
	"equipment_name" varchar(255),
	"inspector_name" varchar(100),
	"inspector_signature" text,
	"signed_at" timestamp,
	"status" varchar(20) DEFAULT 'draft',
	"overall_result" varchar(20),
	"reviewed_by" varchar(64),
	"reviewed_at" timestamp,
	"review_comments" text,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
