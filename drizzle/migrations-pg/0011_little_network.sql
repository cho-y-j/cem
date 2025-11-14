ALTER TYPE "public"."deployment_status" ADD VALUE 'pending_bp' BEFORE 'active';--> statement-breakpoint
ALTER TABLE "deployments" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."deployment_status";--> statement-breakpoint
ALTER TABLE "deployments" ALTER COLUMN "status" SET DATA TYPE "public"."deployment_status" USING "status"::"public"."deployment_status";