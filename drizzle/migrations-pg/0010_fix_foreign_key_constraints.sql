-- Foreign Key 제약 조건 개선
-- entry_request_items.paired_worker_id에 ON DELETE SET NULL 추가

-- 1. 기존 foreign key 제약 조건 확인 및 삭제 (있는 경우)
DO $$
BEGIN
    -- paired_worker_id foreign key 제약 조건이 있는지 확인
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'entry_request_items_paired_worker_id_fkey'
        AND table_name = 'entry_request_items'
    ) THEN
        -- 기존 제약 조건 삭제
        ALTER TABLE entry_request_items 
        DROP CONSTRAINT entry_request_items_paired_worker_id_fkey;
        
        RAISE NOTICE '기존 foreign key 제약 조건 삭제됨';
    ELSE
        RAISE NOTICE '기존 foreign key 제약 조건이 없음 (새로 생성)';
    END IF;
END $$;

-- 2. ON DELETE SET NULL을 포함한 새로운 foreign key 제약 조건 추가
ALTER TABLE entry_request_items
ADD CONSTRAINT entry_request_items_paired_worker_id_fkey
FOREIGN KEY (paired_worker_id)
REFERENCES workers(id)
ON DELETE SET NULL;

-- 3. paired_equipment_id도 동일하게 처리 (일관성 유지)
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

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'Foreign key 제약 조건이 성공적으로 업데이트되었습니다.';
    RAISE NOTICE '- entry_request_items.paired_worker_id: ON DELETE SET NULL';
    RAISE NOTICE '- entry_request_items.paired_equipment_id: ON DELETE SET NULL';
END $$;

