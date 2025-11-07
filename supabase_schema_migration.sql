-- ============================================================
-- 반입 요청 프로세스 개선 - 데이터베이스 스키마 변경
-- 작성일: 2024-10-24
-- ============================================================

-- ============================================================
-- 1. 새로운 ENUM 타입 생성
-- ============================================================

-- 반입 요청 아이템 타입 (장비 또는 인력)
CREATE TYPE entry_request_item_type AS ENUM ('equipment', 'worker');

-- 서류 검증 상태
CREATE TYPE document_status AS ENUM ('valid', 'warning', 'expired', 'missing', 'pending');

-- 기존 entry_request_status에 'bp_draft' 상태 추가
-- 주의: ENUM에 값을 추가할 때는 순서를 지정할 수 없으므로 맨 뒤에 추가됨
-- 실제 사용 시 코드에서 처리 필요
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'bp_draft' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'entry_request_status')
  ) THEN
    ALTER TYPE entry_request_status ADD VALUE 'bp_draft';
  END IF;
END $$;

-- ============================================================
-- 2. entry_requests 테이블 수정
-- ============================================================

-- equipmentId, workerId를 NULL 허용으로 변경 (기존 데이터 호환)
ALTER TABLE entry_requests 
  ALTER COLUMN equipment_id DROP NOT NULL,
  ALTER COLUMN worker_id DROP NOT NULL;

-- 서류 검증 관련 필드 추가
ALTER TABLE entry_requests
  ADD COLUMN IF NOT EXISTS documents_verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS documents_verification_result JSONB;

-- 코멘트 추가
COMMENT ON COLUMN entry_requests.documents_verified_at IS '서류 검증 완료 시각';
COMMENT ON COLUMN entry_requests.documents_verification_result IS '서류 검증 결과 (JSON 형식)';

-- ============================================================
-- 3. entry_request_items 테이블 생성
-- ============================================================

CREATE TABLE IF NOT EXISTS entry_request_items (
  id VARCHAR(64) PRIMARY KEY,
  entry_request_id VARCHAR(64) NOT NULL,
  item_type entry_request_item_type NOT NULL,
  item_id VARCHAR(64) NOT NULL,
  
  -- 서류 검증 결과
  document_status document_status DEFAULT 'pending' NOT NULL,
  document_issues JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 외래키 제약
  CONSTRAINT fk_entry_request 
    FOREIGN KEY (entry_request_id) 
    REFERENCES entry_requests(id) 
    ON DELETE CASCADE
);

-- 코멘트 추가
COMMENT ON TABLE entry_request_items IS '반입 요청에 포함된 장비/인력 목록';
COMMENT ON COLUMN entry_request_items.entry_request_id IS '반입 요청 ID (FK)';
COMMENT ON COLUMN entry_request_items.item_type IS '아이템 타입 (equipment 또는 worker)';
COMMENT ON COLUMN entry_request_items.item_id IS '장비 ID 또는 인력 ID';
COMMENT ON COLUMN entry_request_items.document_status IS '서류 검증 상태';
COMMENT ON COLUMN entry_request_items.document_issues IS '서류 문제 상세 정보 (JSON)';

-- ============================================================
-- 4. 인덱스 생성
-- ============================================================

-- entry_request_items 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_entry_request_items_request_id 
  ON entry_request_items(entry_request_id);

CREATE INDEX IF NOT EXISTS idx_entry_request_items_item 
  ON entry_request_items(item_type, item_id);

-- entry_requests 테이블 인덱스 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_entry_requests_status 
  ON entry_requests(status);

CREATE INDEX IF NOT EXISTS idx_entry_requests_bp_company 
  ON entry_requests(bp_company_id);

-- ============================================================
-- 5. 기존 데이터 마이그레이션 (선택사항)
-- ============================================================

-- 기존 entry_requests의 equipment_id, worker_id를 
-- entry_request_items로 마이그레이션
-- 주의: 기존 데이터가 있는 경우에만 실행

DO $$ 
DECLARE
  req RECORD;
  new_item_id VARCHAR(64);
BEGIN
  -- equipment_id가 있는 요청 처리
  FOR req IN 
    SELECT id, equipment_id 
    FROM entry_requests 
    WHERE equipment_id IS NOT NULL
  LOOP
    new_item_id := 'item_' || substr(md5(random()::text), 1, 16);
    
    INSERT INTO entry_request_items (
      id, 
      entry_request_id, 
      item_type, 
      item_id, 
      document_status
    ) VALUES (
      new_item_id,
      req.id,
      'equipment',
      req.equipment_id,
      'pending'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  
  -- worker_id가 있는 요청 처리
  FOR req IN 
    SELECT id, worker_id 
    FROM entry_requests 
    WHERE worker_id IS NOT NULL
  LOOP
    new_item_id := 'item_' || substr(md5(random()::text), 1, 16);
    
    INSERT INTO entry_request_items (
      id, 
      entry_request_id, 
      item_type, 
      item_id, 
      document_status
    ) VALUES (
      new_item_id,
      req.id,
      'worker',
      req.worker_id,
      'pending'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE '기존 데이터 마이그레이션 완료';
END $$;

-- ============================================================
-- 6. 서류 만료일 체크 함수 (유틸리티)
-- ============================================================

-- 서류 만료일까지 남은 일수를 계산하는 함수
CREATE OR REPLACE FUNCTION get_days_until_expiry(expiry_date TIMESTAMP)
RETURNS INTEGER AS $$
BEGIN
  IF expiry_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN EXTRACT(DAY FROM (expiry_date - NOW()));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 서류 상태를 판단하는 함수
CREATE OR REPLACE FUNCTION get_document_status(
  expiry_date TIMESTAMP,
  approval_status VARCHAR
)
RETURNS document_status AS $$
DECLARE
  days_until_expiry INTEGER;
BEGIN
  -- 승인되지 않은 서류
  IF approval_status IS NULL OR approval_status != 'approved' THEN
    RETURN 'pending'::document_status;
  END IF;
  
  -- 만료일이 없는 서류 (정상)
  IF expiry_date IS NULL THEN
    RETURN 'valid'::document_status;
  END IF;
  
  days_until_expiry := get_days_until_expiry(expiry_date);
  
  -- 만료된 서류
  IF days_until_expiry < 0 THEN
    RETURN 'expired'::document_status;
  END IF;
  
  -- 만료 예정 (7일 이내)
  IF days_until_expiry <= 7 THEN
    RETURN 'warning'::document_status;
  END IF;
  
  -- 정상
  RETURN 'valid'::document_status;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 7. 서류 검증 뷰 생성 (조회 성능 최적화)
-- ============================================================

-- 장비별 서류 상태 뷰
CREATE OR REPLACE VIEW v_equipment_document_status AS
SELECT 
  e.id AS equipment_id,
  e.reg_num,
  et.name AS equip_type_name,
  td.doc_name,
  td.is_mandatory,
  td.has_expiry,
  dc.id AS doc_compliance_id,
  dc.status AS approval_status,
  dc.expiry_date,
  get_days_until_expiry(dc.expiry_date) AS days_until_expiry,
  get_document_status(dc.expiry_date, dc.status) AS document_status,
  dc.file_url
FROM equipment e
JOIN equip_types et ON e.equip_type_id = et.id
JOIN type_docs td ON td.equip_type_id = et.id
LEFT JOIN docs_compliance dc ON 
  dc.target_type = 'equipment' 
  AND dc.target_id = e.id 
  AND dc.doc_type_id = td.id;

-- 인력별 서류 상태 뷰
CREATE OR REPLACE VIEW v_worker_document_status AS
SELECT 
  w.id AS worker_id,
  w.name AS worker_name,
  wt.name AS worker_type_name,
  wd.doc_name,
  wd.is_mandatory,
  wd.has_expiry,
  dc.id AS doc_compliance_id,
  dc.status AS approval_status,
  dc.expiry_date,
  get_days_until_expiry(dc.expiry_date) AS days_until_expiry,
  get_document_status(dc.expiry_date, dc.status) AS document_status,
  dc.file_url
FROM workers w
JOIN worker_types wt ON w.worker_type_id = wt.id
JOIN worker_docs wd ON wd.worker_type_id = wt.id
LEFT JOIN docs_compliance dc ON 
  dc.target_type = 'worker' 
  AND dc.target_id = w.id 
  AND dc.doc_type_id = wd.id;

-- ============================================================
-- 8. 권한 설정 (Supabase RLS)
-- ============================================================

-- entry_request_items 테이블에 RLS 활성화
ALTER TABLE entry_request_items ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 조회 가능
CREATE POLICY "Anyone can view entry request items"
  ON entry_request_items FOR SELECT
  USING (true);

-- BP 사용자는 자신의 요청에 대해 생성/수정 가능
CREATE POLICY "BP can insert their own entry request items"
  ON entry_request_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entry_requests er
      WHERE er.id = entry_request_items.entry_request_id
      AND er.bp_user_id = auth.uid()::varchar
    )
  );

-- ============================================================
-- 9. 완료 메시지
-- ============================================================

DO $$ 
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE '스키마 마이그레이션 완료!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - entry_request_items';
  RAISE NOTICE '';
  RAISE NOTICE '생성된 ENUM 타입:';
  RAISE NOTICE '  - entry_request_item_type';
  RAISE NOTICE '  - document_status';
  RAISE NOTICE '';
  RAISE NOTICE '생성된 함수:';
  RAISE NOTICE '  - get_days_until_expiry()';
  RAISE NOTICE '  - get_document_status()';
  RAISE NOTICE '';
  RAISE NOTICE '생성된 뷰:';
  RAISE NOTICE '  - v_equipment_document_status';
  RAISE NOTICE '  - v_worker_document_status';
  RAISE NOTICE '===========================================';
END $$;

