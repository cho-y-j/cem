-- Deployment에 pending_bp 상태 추가
-- Owner가 투입을 등록하면 pending_bp 상태로 시작
-- BP가 승인하면 active 상태로 전환

-- 1. deployment_status enum에 pending_bp 값 추가 (active 앞에)
ALTER TYPE "public"."deployment_status" ADD VALUE IF NOT EXISTS 'pending_bp' BEFORE 'active';

-- 2. deployments 테이블의 status 컬럼을 enum 타입으로 변경
-- (기존 varchar에서 enum으로 전환)
ALTER TABLE "deployments"
  ALTER COLUMN "status" SET DATA TYPE "public"."deployment_status"
  USING "status"::"public"."deployment_status";

-- 3. 기본값을 enum 타입으로 재설정
ALTER TABLE "deployments"
  ALTER COLUMN "status" SET DEFAULT 'active'::"public"."deployment_status";

-- 확인
SELECT
  typname,
  enumlabel,
  enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'deployment_status'
ORDER BY enumsortorder;
