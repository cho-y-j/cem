-- ============================================================
-- Phase 1: 데이터베이스 스키마 확장
-- 간편 PIN 로그인 및 차량-인력 매칭을 위한 컬럼 추가
-- ============================================================

-- 1. workers 테이블에 컬럼 추가
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),  -- 핸드폰 번호 (필수)
ADD COLUMN IF NOT EXISTS pin_code VARCHAR(6),  -- PIN 코드 (6자리)
ADD COLUMN IF NOT EXISTS address TEXT,  -- 주소 (선택)
ADD COLUMN IF NOT EXISTS resident_number VARCHAR(20);  -- 주민번호 (선택, 암호화 권장)

-- 2. workers 테이블에 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_pin_code ON workers(pin_code);

-- 3. entry_request_items 테이블에 페어링 컬럼 추가
ALTER TABLE entry_request_items
ADD COLUMN IF NOT EXISTS paired_equipment_id TEXT REFERENCES equipment(id),  -- 이 인력이 운전할 차량
ADD COLUMN IF NOT EXISTS paired_worker_id TEXT REFERENCES workers(id);  -- 이 차량을 운전할 인력

-- 4. entry_request_items 테이블에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_entry_request_items_paired_equipment ON entry_request_items(paired_equipment_id);
CREATE INDEX IF NOT EXISTS idx_entry_request_items_paired_worker ON entry_request_items(paired_worker_id);

-- 5. 코멘트 추가 (문서화)
COMMENT ON COLUMN workers.phone IS '운전자 핸드폰 번호 (필수, 로그인 시 사용)';
COMMENT ON COLUMN workers.pin_code IS '간편 PIN 코드 (6자리, 로그인 시 사용)';
COMMENT ON COLUMN workers.address IS '운전자 주소 (선택)';
COMMENT ON COLUMN workers.resident_number IS '운전자 주민번호 (선택, 암호화 권장)';
COMMENT ON COLUMN entry_request_items.paired_equipment_id IS '이 인력이 운전할 차량 ID (차량-인력 페어링)';
COMMENT ON COLUMN entry_request_items.paired_worker_id IS '이 차량을 운전할 인력 ID (차량-인력 페어링)';

-- 완료!

