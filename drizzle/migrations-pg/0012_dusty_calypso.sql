ALTER TABLE "workers" ALTER COLUMN "license_status" SET DEFAULT 'unverified';--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "license_verified_at" timestamp;