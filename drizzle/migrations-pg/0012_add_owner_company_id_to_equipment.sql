-- equipment 테이블에 owner_company_id 컬럼 추가
-- Owner 회사별 Equipment 필터링을 위한 근본적인 해결책

-- 1. owner_company_id 컬럼 추가
ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS owner_company_id VARCHAR(64);

-- 2. 기존 데이터 마이그레이션: owner_id를 통해 users 테이블에서 company_id 가져오기
UPDATE equipment e
SET owner_company_id = u.company_id
FROM users u
WHERE e.owner_id = u.id
  AND e.owner_company_id IS NULL
  AND u.company_id IS NOT NULL;

-- 3. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_equipment_owner_company_id 
ON equipment(owner_company_id);

CREATE INDEX IF NOT EXISTS idx_equipment_owner_id_company_id 
ON equipment(owner_id, owner_company_id);

-- 4. 완료 메시지
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM equipment
    WHERE owner_company_id IS NOT NULL;
    
    RAISE NOTICE 'equipment 테이블에 owner_company_id 컬럼이 추가되었습니다.';
    RAISE NOTICE '마이그레이션된 레코드 수: %', updated_count;
END $$;

