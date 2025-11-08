ALTER TABLE "work_zones" ALTER COLUMN "center_lat" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "work_zones" ALTER COLUMN "center_lng" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "work_zones" ALTER COLUMN "radius_meters" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "work_zones" ADD COLUMN "zone_type" varchar(20) DEFAULT 'circle' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_zones" ADD COLUMN "polygon_coordinates" text;