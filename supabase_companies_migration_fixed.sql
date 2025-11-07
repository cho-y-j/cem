-- ============================================================
-- Companies 테이블 및 관련 마이그레이션 (수정본)
-- 작성일: 2025-10-25
-- 수정: snake_case 적용
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

CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(company_type);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- 2. Equipment 테이블에 회사 정보 추가
ALTER TABLE equipment 
  ADD COLUMN IF NOT EXISTS owner_company_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS assigned_worker_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_equipment_owner_company ON equipment(owner_company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assigned_worker ON equipment(assigned_worker_id);

-- 3. Workers 테이블에 회사 정보 추가
ALTER TABLE workers 
  ADD COLUMN IF NOT EXISTS owner_company_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_workers_owner_company ON workers(owner_company_id);

-- 4. Entry Requests 테이블 재설계
ALTER TABLE entry_requests
  -- 요청자 (Owner 회사)
  ADD COLUMN IF NOT EXISTS owner_company_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS owner_requested_at TIMESTAMP,
  
  -- 1차 승인자 (BP 회사)
  ADD COLUMN IF NOT EXISTS target_bp_company_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS bp_approved_user_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS bp_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS bp_work_plan_url TEXT,
  ADD COLUMN IF NOT EXISTS bp_comment TEXT,
  
  -- 최종 승인자 (EP 회사)
  ADD COLUMN IF NOT EXISTS target_ep_company_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS ep_approved_user_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS ep_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ep_comment TEXT,
  
  -- 반려 정보
  ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_entry_requests_owner_company ON entry_requests(owner_company_id);
CREATE INDEX IF NOT EXISTS idx_entry_requests_target_bp_company ON entry_requests(target_bp_company_id);
CREATE INDEX IF NOT EXISTS idx_entry_requests_target_ep_company ON entry_requests(target_ep_company_id);

-- 5. Location Logs 테이블 (위치 추적) - snake_case
CREATE TABLE IF NOT EXISTS location_logs (
  id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64),
  equipment_id VARCHAR(64),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  logged_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_logs_worker ON location_logs(worker_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_logs_equipment ON location_logs(equipment_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_logs_time ON location_logs(logged_at DESC);

-- 6. Emergency Alerts 테이블 (긴급 상황) - snake_case
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64),
  equipment_id VARCHAR(64),
  alert_type VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm')),
  resolved_by VARCHAR(64),
  resolved_at TIMESTAMP,
  resolution_note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_worker ON emergency_alerts(worker_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_equipment ON emergency_alerts(equipment_id);

-- 7. Work Sessions 테이블 확인 (이미 존재할 수 있음)
CREATE TABLE IF NOT EXISTS work_sessions (
  id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64),
  equipment_id VARCHAR(64),
  session_type VARCHAR(20) DEFAULT 'work' CHECK (session_type IN ('work', 'break', 'overtime')),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_worker ON work_sessions(worker_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_work_sessions_equipment ON work_sessions(equipment_id, start_time DESC);

-- 8. Entry Request Items 테이블에 요청 유형 추가
ALTER TABLE entry_request_items
  ADD COLUMN IF NOT EXISTS request_type VARCHAR(30) CHECK (request_type IN ('equipment_with_worker', 'equipment_only', 'worker_only'));

-- 9. RLS 비활성화 (개발 환경)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE location_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions DISABLE ROW LEVEL SECURITY;

-- 완료
SELECT 'Migration completed successfully!' AS status;

