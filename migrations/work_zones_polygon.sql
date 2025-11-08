-- 작업 구역 폴리곤 기능 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. 기존 컬럼을 nullable로 변경 (폴리곤 모드일 때는 필요 없음)
ALTER TABLE "work_zones" ALTER COLUMN "center_lat" DROP NOT NULL;
ALTER TABLE "work_zones" ALTER COLUMN "center_lng" DROP NOT NULL;
ALTER TABLE "work_zones" ALTER COLUMN "radius_meters" DROP NOT NULL;

-- 2. zone_type 컬럼 추가 (기본값 'circle')
ALTER TABLE "work_zones" ADD COLUMN IF NOT EXISTS "zone_type" varchar(20) DEFAULT 'circle' NOT NULL;

-- 3. polygon_coordinates 컬럼 추가 (JSON 문자열)
ALTER TABLE "work_zones" ADD COLUMN IF NOT EXISTS "polygon_coordinates" text;

-- 완료 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'work_zones'
  AND column_name IN ('zone_type', 'polygon_coordinates', 'center_lat', 'center_lng', 'radius_meters')
ORDER BY column_name;


