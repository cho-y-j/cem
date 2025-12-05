-- ============================================================
-- Companies 테이블 및 관련 마이그레이션
-- 작성일: 2025-10-25
-- 목적: Owner/BP/EP 회사 관리 및 반입 요청 프로세스 재설계
-- ============================================================

-- 1. Companies 테이블 생성
CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  business_number VARCHAR(50),
  company_type VARCHAR(20) NOT NULL CHECK (company_type IN ('owner', 'bp', 'ep')),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  contact_person VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_companies_type ON companies(company_type);
CREATE INDEX idx_companies_name ON companies(name);

COMMENT ON TABLE companies IS '회사 정보 (장비임대사업자, 협력사, 시행사)';
COMMENT ON COLUMN companies.company_type IS 'owner: 장비임대사업자, bp: 협력사, ep: 시행사';

-- 2. Equipment 테이블에 회사 정보 추가
ALTER TABLE equipment 
  ADD COLUMN IF NOT EXISTS owner_company_id VARCHAR(64) REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS assigned_worker_id VARCHAR(64) REFERENCES workers(id);

CREATE INDEX IF NOT EXISTS idx_equipment_owner_company ON equipment(owner_company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assigned_worker ON equipment(assigned_worker_id);

COMMENT ON COLUMN equipment.owner_company_id IS '장비 소유 회사 ID';
COMMENT ON COLUMN equipment.assigned_worker_id IS '현재 배정된 운전자 ID';

-- 3. Workers 테이블에 회사 정보 추가
ALTER TABLE workers 
  ADD COLUMN IF NOT EXISTS owner_company_id VARCHAR(64) REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_workers_owner_company ON workers(owner_company_id);

COMMENT ON COLUMN workers.owner_company_id IS '인력 소속 회사 ID';

-- 4. Entry Requests 테이블 재설계
-- 새 컬럼 추가
ALTER TABLE entry_requests
  -- 요청자 (Owner 회사)
  ADD COLUMN IF NOT EXISTS owner_company_id VARCHAR(64) REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64) REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS owner_requested_at TIMESTAMP,
  
  -- 1차 승인자 (BP 회사)
  ADD COLUMN IF NOT EXISTS target_bp_company_id VARCHAR(64) REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS bp_approved_user_id VARCHAR(64) REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS bp_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS bp_work_plan_url TEXT,
  ADD COLUMN IF NOT EXISTS bp_comment TEXT,
  
  -- 최종 승인자 (EP 회사)
  ADD COLUMN IF NOT EXISTS target_ep_company_id VARCHAR(64) REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS ep_approved_user_id VARCHAR(64) REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS ep_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ep_comment TEXT,
  
  -- 반려 정보
  ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(64) REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_entry_requests_owner_company ON entry_requests(owner_company_id);
CREATE INDEX IF NOT EXISTS idx_entry_requests_target_bp_company ON entry_requests(target_bp_company_id);
CREATE INDEX IF NOT EXISTS idx_entry_requests_target_ep_company ON entry_requests(target_ep_company_id);

COMMENT ON COLUMN entry_requests.owner_company_id IS '요청한 Owner 회사 ID';
COMMENT ON COLUMN entry_requests.target_bp_company_id IS '요청을 받을 BP 회사 ID';
COMMENT ON COLUMN entry_requests.target_ep_company_id IS '최종 승인할 EP 회사 ID';
COMMENT ON COLUMN entry_requests.bp_work_plan_url IS 'BP가 업로드한 작업계획서 URL';

-- 5. Location Logs 테이블 (위치 추적)
CREATE TABLE IF NOT EXISTS location_logs (
  id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64) REFERENCES workers(id),
  equipment_id VARCHAR(64) REFERENCES equipment(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  logged_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_logs_worker ON location_logs(worker_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_logs_equipment ON location_logs(equipment_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_logs_time ON location_logs(logged_at DESC);

COMMENT ON TABLE location_logs IS '운전자/장비 위치 추적 로그';

-- 6. Emergency Alerts 테이블 (긴급 상황)
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64) REFERENCES workers(id),
  equipment_id VARCHAR(64) REFERENCES equipment(id),
  alert_type VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm')),
  resolved_by VARCHAR(64) REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolution_note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_worker ON emergency_alerts(worker_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_equipment ON emergency_alerts(equipment_id);

COMMENT ON TABLE emergency_alerts IS '긴급 상황 알림';
COMMENT ON COLUMN emergency_alerts.alert_type IS 'emergency: 긴급상황, accident: 사고, breakdown: 고장';
COMMENT ON COLUMN emergency_alerts.status IS 'active: 활성, resolved: 해결, false_alarm: 오보';

-- 7. Work Sessions 테이블 (이미 존재하는지 확인)
CREATE TABLE IF NOT EXISTS work_sessions (
  id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64) REFERENCES workers(id),
  equipment_id VARCHAR(64) REFERENCES equipment(id),
  session_type VARCHAR(20) DEFAULT 'work' CHECK (session_type IN ('work', 'break', 'overtime')),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_worker ON work_sessions(worker_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_work_sessions_equipment ON work_sessions(equipment_id, start_time DESC);

COMMENT ON TABLE work_sessions IS '작업 세션 (작업 시작/종료 기록)';

-- 8. Entry Request Items 테이블에 요청 유형 추가
ALTER TABLE entry_request_items
  ADD COLUMN IF NOT EXISTS request_type VARCHAR(30) CHECK (request_type IN ('equipment_with_worker', 'equipment_only', 'worker_only'));

COMMENT ON COLUMN entry_request_items.request_type IS 'equipment_with_worker: 장비+운전자, equipment_only: 장비만, worker_only: 인력만';

-- 9. RLS 비활성화 (개발 환경)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE location_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions DISABLE ROW LEVEL SECURITY;

-- 완료
SELECT 'Migration completed successfully!' AS status;

