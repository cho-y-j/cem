-- Remove NOT NULL constraints from legacy entry_requests columns
-- These columns are from V1 workflow and are no longer used in V2

-- V1에서 사용되던 레거시 컬럼들의 NOT NULL 제약 제거
ALTER TABLE entry_requests ALTER COLUMN bp_company_id DROP NOT NULL;
ALTER TABLE entry_requests ALTER COLUMN bp_user_id DROP NOT NULL;
ALTER TABLE entry_requests ALTER COLUMN equipment_id DROP NOT NULL;
ALTER TABLE entry_requests ALTER COLUMN worker_id DROP NOT NULL;

-- 확인: 테이블 구조 확인
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'entry_requests'
    AND column_name IN ('bp_company_id', 'bp_user_id', 'equipment_id', 'worker_id',
                        'target_bp_company_id', 'target_ep_company_id')
ORDER BY column_name;
