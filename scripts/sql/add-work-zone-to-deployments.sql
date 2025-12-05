-- Deployment에 workZoneId 추가
-- 현장명 자동 연결 + GPS 출근 구역 매칭

-- 1. work_zone_id 컬럼 추가
ALTER TABLE "deployments"
  ADD COLUMN IF NOT EXISTS "work_zone_id" VARCHAR(64);

-- 2. PostgREST 네이밍 규칙을 따르는 FK 생성
ALTER TABLE "deployments"
  ADD CONSTRAINT "deployments_work_zone_id_fkey"
  FOREIGN KEY ("work_zone_id") REFERENCES "public"."work_zones"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 3. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS "idx_deployments_work_zone_id"
  ON "deployments"("work_zone_id");

-- 확인
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'deployments'
  AND column_name = 'work_zone_id';
