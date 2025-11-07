-- ============================================================
-- 모바일 앱 기능을 위한 데이터베이스 스키마 확장
-- ============================================================

-- 1. equipment 테이블에 운전자 배정 컬럼 추가
ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS assigned_worker_id TEXT REFERENCES workers(id);

COMMENT ON COLUMN equipment.assigned_worker_id IS '배정된 운전자 ID';

-- 2. location_logs 테이블 생성 (위치 정보 로그)
CREATE TABLE IF NOT EXISTS location_logs (
  id TEXT PRIMARY KEY,
  equipment_id TEXT REFERENCES equipment(id) ON DELETE CASCADE,
  worker_id TEXT REFERENCES workers(id) ON DELETE CASCADE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  accuracy REAL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_logs_equipment ON location_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_location_logs_worker ON location_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_location_logs_timestamp ON location_logs(timestamp DESC);

COMMENT ON TABLE location_logs IS '장비 및 운전자 위치 정보 로그';

-- 3. work_sessions 테이블 생성 (작업 세션)
CREATE TABLE IF NOT EXISTS work_sessions (
  id TEXT PRIMARY KEY,
  equipment_id TEXT REFERENCES equipment(id) ON DELETE CASCADE,
  worker_id TEXT REFERENCES workers(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  break_periods JSONB DEFAULT '[]',
  overtime_periods JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'working',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_equipment ON work_sessions(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_worker ON work_sessions(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_date ON work_sessions(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON work_sessions(status);

COMMENT ON TABLE work_sessions IS '작업 세션 (시작/종료/휴식/연장)';
COMMENT ON COLUMN work_sessions.status IS 'working, break, overtime, ended';

-- 4. emergency_alerts 테이블 생성 (긴급 알림)
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id TEXT PRIMARY KEY,
  equipment_id TEXT REFERENCES equipment(id) ON DELETE CASCADE,
  worker_id TEXT REFERENCES workers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  description TEXT,
  latitude REAL,
  longitude REAL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'open',
  acknowledged_by TEXT REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_equipment ON emergency_alerts(equipment_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_worker ON emergency_alerts(worker_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_timestamp ON emergency_alerts(timestamp DESC);

COMMENT ON TABLE emergency_alerts IS '긴급 알림';
COMMENT ON COLUMN emergency_alerts.alert_type IS '사고, 고장, 안전위험, 기타';
COMMENT ON COLUMN emergency_alerts.status IS 'open, acknowledged, resolved';

-- 5. work_journal 테이블에 서명 컴럼 추가 (이미 있을 수 있음)
ALTER TABLE work_journal
ADD COLUMN IF NOT EXISTS worker_signature TEXT;

ALTER TABLE work_journal
ADD COLUMN IF NOT EXISTS supervisor_signature TEXT;

ALTER TABLE work_journal
ADD COLUMN IF NOT EXISTS supervisor_name TEXT;

COMMENT ON COLUMN work_journal.worker_signature IS '운전자 서명 (Base64 이미지)';
COMMENT ON COLUMN work_journal.supervisor_signature IS '현장 확인자 서명 (Base64 이미지)';
COMMENT ON COLUMN work_journal.supervisor_name IS '현장 확인자 이름';

-- 6. RLS 비활성화 (개발 환경)
ALTER TABLE location_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts DISABLE ROW LEVEL SECURITY;

-- 완료 메시지
SELECT 'Mobile schema extension completed successfully!' AS message;

