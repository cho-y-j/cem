ALTER TABLE "deployments" ADD COLUMN "guide_worker_id" varchar(64);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "inspector_id" varchar(64);--> statement-breakpoint
ALTER TABLE "entry_requests" ADD COLUMN "entry_inspection_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "entry_requests" ADD COLUMN "entry_inspection_file_url" varchar(500);--> statement-breakpoint
ALTER TABLE "entry_requests" ADD COLUMN "safety_training_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "entry_requests" ADD COLUMN "safety_training_file_url" varchar(500);--> statement-breakpoint
ALTER TABLE "entry_requests" ADD COLUMN "health_check_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "entry_requests" ADD COLUMN "health_check_file_url" varchar(500);--> statement-breakpoint
ALTER TABLE "equipment" ADD COLUMN "owner_company_id" varchar(64);--> statement-breakpoint
ALTER TABLE "equipment" ADD COLUMN "nfc_tag_id" varchar(128);--> statement-breakpoint
ALTER TABLE "worker_types" ADD COLUMN "license_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "owner_company_id" varchar(64);--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_guide_worker_id_workers_id_fk" FOREIGN KEY ("guide_worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_inspector_id_workers_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_nfc_tag_id_unique" UNIQUE("nfc_tag_id");