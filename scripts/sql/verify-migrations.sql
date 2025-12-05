-- 마이그레이션 적용 확인 쿼리

-- 1. Foreign Key 제약 조건 확인
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'entry_request_items'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND (kcu.column_name = 'paired_worker_id' OR kcu.column_name = 'paired_equipment_id')
ORDER BY tc.constraint_name;

-- 2. workers 테이블에 owner_company_id 컬럼 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'workers'
    AND column_name = 'owner_company_id';

-- 3. owner_company_id 인덱스 확인
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'workers'
    AND indexname LIKE '%owner_company%'
ORDER BY indexname;

-- 4. 마이그레이션된 데이터 확인
SELECT 
    COUNT(*) as total_workers,
    COUNT(owner_id) as workers_with_owner_id,
    COUNT(owner_company_id) as workers_with_owner_company_id,
    COUNT(CASE WHEN owner_id IS NOT NULL AND owner_company_id IS NULL THEN 1 END) as needs_migration
FROM workers;

