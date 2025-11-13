-- deployments 테이블에 guide_worker_id 컬럼 추가
-- 유도원은 BP가 고용하여 투입 관리에서 추가/교체 가능

ALTER TABLE deployments
ADD COLUMN IF NOT EXISTS guide_worker_id VARCHAR(64);

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_deployments_guide_worker_id 
ON deployments(guide_worker_id);

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'deployments 테이블에 guide_worker_id 컬럼이 추가되었습니다.';
END $$;

