-- ============================================================
-- Migration 0010: Foreign Key 제약 조건 개선
-- ============================================================

-- 1. paired_worker_id foreign key 제약 조건 수정
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'entry_request_items_paired_worker_id_fkey'
        AND table_name = 'entry_request_items'
    ) THEN
        ALTER TABLE entry_request_items 
        DROP CONSTRAINT entry_request_items_paired_worker_id_fkey;
        RAISE NOTICE '기존 foreign key 제약 조건 삭제됨';
    ELSE
        RAISE NOTICE '기존 foreign key 제약 조건이 없음 (새로 생성)';
    END IF;
END $$;

ALTER TABLE entry_request_items
ADD CONSTRAINT entry_request_items_paired_worker_id_fkey
FOREIGN KEY (paired_worker_id)
REFERENCES workers(id)
ON DELETE SET NULL;

-- 2. paired_equipment_id foreign key 제약 조건 수정
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'entry_request_items_paired_equipment_id_fkey'
        AND table_name = 'entry_request_items'
    ) THEN
        ALTER TABLE entry_request_items 
        DROP CONSTRAINT entry_request_items_paired_equipment_id_fkey;
    END IF;
END $$;

ALTER TABLE entry_request_items
ADD CONSTRAINT entry_request_items_paired_equipment_id_fkey
FOREIGN KEY (paired_equipment_id)
REFERENCES equipment(id)
ON DELETE SET NULL;

-- ============================================================
-- Migration 0011: workers 테이블에 owner_company_id 컬럼 추가
-- ============================================================

ALTER TABLE workers
ADD COLUMN IF NOT EXISTS owner_company_id VARCHAR(64);

UPDATE workers w
SET owner_company_id = u.company_id
FROM users u
WHERE w.owner_id = u.id
  AND w.owner_company_id IS NULL
  AND u.company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workers_owner_company_id 
ON workers(owner_company_id);

CREATE INDEX IF NOT EXISTS idx_workers_owner_id_company_id 
ON workers(owner_id, owner_company_id);

-- ============================================================
-- Migration 0012: equipment 테이블에 owner_company_id 컬럼 추가
-- ============================================================

ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS owner_company_id VARCHAR(64);

UPDATE equipment e
SET owner_company_id = u.company_id
FROM users u
WHERE e.owner_id = u.id
  AND e.owner_company_id IS NULL
  AND u.company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_owner_company_id 
ON equipment(owner_company_id);

CREATE INDEX IF NOT EXISTS idx_equipment_owner_id_company_id 
ON equipment(owner_id, owner_company_id);

-- ============================================================
-- Migration 0013: deployments 테이블에 guide_worker_id 컬럼 추가
-- ============================================================

ALTER TABLE deployments
ADD COLUMN IF NOT EXISTS guide_worker_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_deployments_guide_worker_id 
ON deployments(guide_worker_id);

-- ============================================================
-- Migration 0014: entry_requests 테이블에 반입 검사/안전교육/건강검진 필드 추가
-- ============================================================

ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS entry_inspection_completed_at TIMESTAMP;

ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS entry_inspection_file_url VARCHAR(500);

ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS safety_training_completed_at TIMESTAMP;

ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS safety_training_file_url VARCHAR(500);

ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS health_check_completed_at TIMESTAMP;

ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS health_check_file_url VARCHAR(500);

-- ============================================================
-- Migration 0015: deployments 테이블에 inspector_id 컬럼 추가
-- ============================================================

ALTER TABLE deployments
ADD COLUMN IF NOT EXISTS inspector_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_deployments_inspector_id
ON deployments(inspector_id);

-- ============================================================
-- Migration 0016: worker_types 테이블에 license_required 컬럼 추가
-- ============================================================

ALTER TABLE worker_types
ADD COLUMN IF NOT EXISTS license_required BOOLEAN DEFAULT false NOT NULL;

