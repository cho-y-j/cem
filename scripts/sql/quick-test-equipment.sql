-- Equipment Owner 필터링 빠른 검증 쿼리

-- 1. 컬럼 및 인덱스 확인
SELECT '=== 컬럼 확인 ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipment'
  AND column_name = 'owner_company_id';

SELECT '=== 인덱스 확인 ===' as section;
SELECT indexname
FROM pg_indexes
WHERE tablename = 'equipment'
  AND indexname LIKE '%owner_company%'
ORDER BY indexname;

-- 2. 데이터 마이그레이션 상태 확인
SELECT '=== 마이그레이션 상태 ===' as section;
SELECT 
    COUNT(*) as total_equipment,
    COUNT(owner_id) as with_owner_id,
    COUNT(owner_company_id) as with_owner_company_id,
    COUNT(CASE WHEN owner_id IS NOT NULL AND owner_company_id IS NULL THEN 1 END) as needs_migration
FROM equipment;

-- 3. 샘플 데이터 확인 (최근 10개)
SELECT '=== 샘플 데이터 (최근 10개) ===' as section;
SELECT 
    e.id,
    e.reg_num,
    e.owner_id,
    e.owner_company_id,
    u.email as owner_email,
    u.company_id as user_company_id,
    CASE 
        WHEN e.owner_company_id = u.company_id THEN '✅ 일치'
        WHEN e.owner_company_id IS NULL AND u.company_id IS NULL THEN '⚠️ 둘 다 NULL'
        WHEN e.owner_company_id IS NULL THEN '❌ 누락'
        ELSE '❌ 불일치'
    END as status
FROM equipment e
LEFT JOIN users u ON e.owner_id = u.id
ORDER BY e.created_at DESC
LIMIT 10;

-- 4. Owner별 장비 개수
SELECT '=== Owner별 장비 개수 ===' as section;
SELECT 
    u.email as owner_email,
    u.company_id,
    COUNT(e.id) as equipment_count,
    COUNT(CASE WHEN e.owner_company_id IS NOT NULL THEN 1 END) as with_company_id
FROM users u
LEFT JOIN equipment e ON e.owner_id = u.id
WHERE u.role = 'owner'
GROUP BY u.id, u.email, u.company_id
ORDER BY equipment_count DESC;

