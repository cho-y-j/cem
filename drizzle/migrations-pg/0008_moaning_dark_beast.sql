CREATE TABLE "system_settings" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_by" varchar(64),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "check_ins" ALTER COLUMN "check_in_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "check_ins" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "check_ins" ALTER COLUMN "created_at" SET DEFAULT now();