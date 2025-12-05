-- Deployment에 pending_bp 상태 추가
-- Owner가 투입을 등록하면 pending_bp 상태로 시작
-- BP가 승인하면 active 상태로 전환

-- 1. deployment_status enum 타입이 없으면 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deployment_status') THEN
    CREATE TYPE "public"."deployment_status" AS ENUM('pending', 'active', 'extended', 'completed');
    RAISE NOTICE 'Created deployment_status enum type';
  END IF;
END $$;

-- 2. pending_bp 값 추가 (active 앞에)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'deployment_status' AND e.enumlabel = 'pending_bp'
  ) THEN
    -- pending_bp를 pending 다음에 추가 (BEFORE 'active' 대신)
    ALTER TYPE "public"."deployment_status" ADD VALUE 'pending_bp' AFTER 'pending';
    RAISE NOTICE 'Added pending_bp to deployment_status enum';
  END IF;
END $$;

-- 3. 기존 기본값 제거 (타입 변경 전에 필요)
ALTER TABLE "deployments"
  ALTER COLUMN "status" DROP DEFAULT;

-- 4. deployments 테이블의 status 컬럼을 enum 타입으로 변경
-- (기존 varchar에서 enum으로 전환)
ALTER TABLE "deployments"
  ALTER COLUMN "status" SET DATA TYPE "public"."deployment_status"
  USING "status"::"public"."deployment_status";

-- 5. 기본값을 enum 타입으로 재설정
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
