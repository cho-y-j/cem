-- deployments 테이블에 inspector_id 컬럼 추가
-- 안전점검원은 EP가 고용하여 투입 관리에서 지정

ALTER TABLE deployments
ADD COLUMN IF NOT EXISTS inspector_id VARCHAR(64);

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_deployments_inspector_id 
ON deployments(inspector_id);

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'deployments 테이블에 inspector_id 컬럼이 추가되었습니다.';
END $$;

