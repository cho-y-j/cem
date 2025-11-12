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

