-- 작업 구역 폴리곤 기능 추가 마이그레이션
-- 실행 방법: Supabase SQL Editor에서 실행하거나, psql로 실행

-- 1. zone_type 컬럼 추가 (기본값 'circle'로 설정)
ALTER TABLE work_zones 
ADD COLUMN IF NOT EXISTS zone_type VARCHAR(20) NOT NULL DEFAULT 'circle';

-- 2. 기존 데이터는 모두 'circle' 타입으로 설정 (이미 DEFAULT로 처리됨)
-- UPDATE work_zones SET zone_type = 'circle' WHERE zone_type IS NULL;

-- 3. polygon_coordinates 컬럼 추가 (JSON 문자열 저장)
ALTER TABLE work_zones 
ADD COLUMN IF NOT EXISTS polygon_coordinates TEXT;

-- 4. center_lat, center_lng, radius_meters를 nullable로 변경
-- (폴리곤 모드일 때는 필요 없음)
ALTER TABLE work_zones 
ALTER COLUMN center_lat DROP NOT NULL;

ALTER TABLE work_zones 
ALTER COLUMN center_lng DROP NOT NULL;

ALTER TABLE work_zones 
ALTER COLUMN radius_meters DROP NOT NULL;

-- 5. 기존 데이터에 기본값 설정 (이미 있는 데이터는 원형 구역)
UPDATE work_zones 
SET zone_type = 'circle' 
WHERE zone_type IS NULL;

-- 완료 메시지
SELECT 'Migration completed: Polygon support added to work_zones table' AS status;

