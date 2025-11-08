CREATE TABLE "check_ins" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"worker_id" varchar(64) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"deployment_id" varchar(64),
	"work_zone_id" varchar(64),
	"check_in_time" timestamp NOT NULL,
	"check_in_lat" numeric(10, 8),
	"check_in_lng" numeric(11, 8),
	"distance_from_zone" integer,
	"is_within_zone" boolean DEFAULT false,
	"auth_method" varchar(50),
	"webauthn_verified" boolean DEFAULT false,
	"webauthn_credential_id" varchar(255),
	"device_info" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_inspection_record_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"record_id" varchar(64) NOT NULL,
	"template_item_id" varchar(64),
	"category" varchar(100),
	"item_text" text NOT NULL,
	"result" varchar(20),
	"result_text" text,
	"numeric_value" numeric(10, 2),
	"action_required" text,
	"photo_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "driver_inspection_records" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"template_id" varchar(64),
	"equipment_id" varchar(64) NOT NULL,
	"driver_id" varchar(64) NOT NULL,
	"inspection_date" date NOT NULL,
	"check_frequency" varchar(20) NOT NULL,
	"vehicle_number" varchar(50),
	"equipment_name" varchar(255),
	"driver_name" varchar(100),
	"accumulated_hours" numeric(10, 2),
	"accumulated_mileage" numeric(10, 2),
	"operation_hours_today" numeric(8, 2),
	"mileage_today" numeric(8, 2),
	"last_oil_change_date" date,
	"last_oil_change_hours" numeric(10, 2),
	"last_oil_change_mileage" numeric(10, 2),
	"last_hydraulic_oil_change_date" date,
	"last_filter_change_date" date,
	"driver_signature" text,
	"signed_at" timestamp,
	"status" varchar(20) DEFAULT 'draft',
	"overall_result" varchar(20),
	"notes" text,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "driver_inspection_template_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"template_id" varchar(64) NOT NULL,
	"category" varchar(100),
	"item_text" text NOT NULL,
	"check_frequency" varchar(20) NOT NULL,
	"result_type" varchar(20) DEFAULT 'status',
	"display_order" integer DEFAULT 0,
	"is_required" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "driver_inspection_templates" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"equip_type_id" varchar(64),
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar(64),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "webauthn_credentials" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"device_name" varchar(255),
	"device_type" varchar(50),
	"transports" text[],
	"aaguid" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_zones" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"center_lat" numeric(10, 8) NOT NULL,
	"center_lng" numeric(11, 8) NOT NULL,
	"radius_meters" integer DEFAULT 100 NOT NULL,
	"company_id" varchar(64),
	"created_by" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
