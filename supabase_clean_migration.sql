-- ============================================================
-- 기존 테이블 삭제 후 재생성 (Clean Migration)
-- 작성일: 2025-10-25
-- ============================================================

-- 1. 기존 테이블 삭제 (있다면)
DROP TABLE IF EXISTS emergency_alerts CASCADE;
DROP TABLE IF EXISTS location_logs CASCADE;
DROP TABLE IF EXISTS work_sessions CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 2. Companies 테이블 생성
CREATE TABLE companies (
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

-- 3. Location Logs 테이블 생성
CREATE TABLE location_logs (
  id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64),
  equipment_id VARCHAR(64),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  logged_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_location_logs_worker ON location_logs(worker_id, logged_at DESC);
CREATE INDEX idx_location_logs_equipment ON location_logs(equipment_id, logged_at DESC);
CREATE INDEX idx_location_logs_time ON location_logs(logged_at DESC);

-- 4. Emergency Alerts 테이블 생성
CREATE TABLE emergency_alerts (
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

CREATE INDEX idx_emergency_alerts_status ON emergency_alerts(status, created_at DESC);
CREATE INDEX idx_emergency_alerts_worker ON emergency_alerts(worker_id);
CREATE INDEX idx_emergency_alerts_equipment ON emergency_alerts(equipment_id);

-- 5. Work Sessions 테이블 생성
CREATE TABLE work_sessions (
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

CREATE INDEX idx_work_sessions_worker ON work_sessions(worker_id, start_time DESC);
CREATE INDEX idx_work_sessions_equipment ON work_sessions(equipment_id, start_time DESC);

-- 6. Equipment 테이블에 컬럼 추가 (이미 있으면 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='equipment' AND column_name='owner_company_id') THEN
    ALTER TABLE equipment ADD COLUMN owner_company_id VARCHAR(64);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='equipment' AND column_name='assigned_worker_id') THEN
    ALTER TABLE equipment ADD COLUMN assigned_worker_id VARCHAR(64);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_equipment_owner_company ON equipment(owner_company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assigned_worker ON equipment(assigned_worker_id);

-- 7. Workers 테이블에 컬럼 추가 (이미 있으면 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='workers' AND column_name='owner_company_id') THEN
    ALTER TABLE workers ADD COLUMN owner_company_id VARCHAR(64);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workers_owner_company ON workers(owner_company_id);

-- 8. Entry Requests 테이블에 컬럼 추가 (이미 있으면 무시)
DO $$ 
BEGIN
  -- Owner 관련
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='owner_company_id') THEN
    ALTER TABLE entry_requests ADD COLUMN owner_company_id VARCHAR(64);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='owner_user_id') THEN
    ALTER TABLE entry_requests ADD COLUMN owner_user_id VARCHAR(64);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='owner_requested_at') THEN
    ALTER TABLE entry_requests ADD COLUMN owner_requested_at TIMESTAMP;
  END IF;
  
  -- BP 관련
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='target_bp_company_id') THEN
    ALTER TABLE entry_requests ADD COLUMN target_bp_company_id VARCHAR(64);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='bp_approved_user_id') THEN
    ALTER TABLE entry_requests ADD COLUMN bp_approved_user_id VARCHAR(64);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='bp_approved_at') THEN
    ALTER TABLE entry_requests ADD COLUMN bp_approved_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='bp_work_plan_url') THEN
    ALTER TABLE entry_requests ADD COLUMN bp_work_plan_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='bp_comment') THEN
    ALTER TABLE entry_requests ADD COLUMN bp_comment TEXT;
  END IF;
  
  -- EP 관련
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='target_ep_company_id') THEN
    ALTER TABLE entry_requests ADD COLUMN target_ep_company_id VARCHAR(64);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='ep_approved_user_id') THEN
    ALTER TABLE entry_requests ADD COLUMN ep_approved_user_id VARCHAR(64);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='ep_approved_at') THEN
    ALTER TABLE entry_requests ADD COLUMN ep_approved_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='ep_comment') THEN
    ALTER TABLE entry_requests ADD COLUMN ep_comment TEXT;
  END IF;
  
  -- 반려 관련
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='rejected_by') THEN
    ALTER TABLE entry_requests ADD COLUMN rejected_by VARCHAR(64);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='rejected_at') THEN
    ALTER TABLE entry_requests ADD COLUMN rejected_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_requests' AND column_name='reject_reason') THEN
    ALTER TABLE entry_requests ADD COLUMN reject_reason TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_entry_requests_owner_company ON entry_requests(owner_company_id);
CREATE INDEX IF NOT EXISTS idx_entry_requests_target_bp_company ON entry_requests(target_bp_company_id);
CREATE INDEX IF NOT EXISTS idx_entry_requests_target_ep_company ON entry_requests(target_ep_company_id);

-- 9. Entry Request Items 테이블에 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entry_request_items' AND column_name='request_type') THEN
    ALTER TABLE entry_request_items ADD COLUMN request_type VARCHAR(30) 
      CHECK (request_type IN ('equipment_with_worker', 'equipment_only', 'worker_only'));
  END IF;
END $$;

-- 10. RLS 비활성화 (개발 환경)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE location_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions DISABLE ROW LEVEL SECURITY;

-- 완료
SELECT 'Clean migration completed successfully!' AS status;

