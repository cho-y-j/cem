-- ============================================================
-- 투입 관리 (Deployments) 테이블 생성
-- ============================================================

-- deployments 테이블이 이미 있다면 삭제하고 재생성
DROP TABLE IF EXISTS deployment_extensions CASCADE;
DROP TABLE IF EXISTS deployment_worker_changes CASCADE;
DROP TABLE IF EXISTS deployments CASCADE;

-- 투입 관리 테이블
CREATE TABLE deployments (
  id VARCHAR(64) PRIMARY KEY,
  entry_request_id VARCHAR(64) NOT NULL REFERENCES entry_requests(id) ON DELETE CASCADE,
  equipment_id VARCHAR(64) NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  worker_id VARCHAR(64) NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bp_company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ep_company_id VARCHAR(64) REFERENCES companies(id) ON DELETE SET NULL,

  start_date TIMESTAMPTZ NOT NULL,
  planned_end_date TIMESTAMPTZ NOT NULL,
  actual_end_date TIMESTAMPTZ,

  status VARCHAR(50) NOT NULL DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 운전자 교체 이력 테이블
CREATE TABLE deployment_worker_changes (
  id VARCHAR(64) PRIMARY KEY,
  deployment_id VARCHAR(64) NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  old_worker_id VARCHAR(64) NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  new_worker_id VARCHAR(64) NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  change_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- 투입 기간 연장 이력 테이블
CREATE TABLE deployment_extensions (
  id VARCHAR(64) PRIMARY KEY,
  deployment_id VARCHAR(64) NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  old_end_date TIMESTAMPTZ NOT NULL,
  new_end_date TIMESTAMPTZ NOT NULL,
  extension_reason TEXT,
  extended_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  extended_by VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_deployments_worker ON deployments(worker_id);
CREATE INDEX idx_deployments_equipment ON deployments(equipment_id);
CREATE INDEX idx_deployments_owner ON deployments(owner_id);
CREATE INDEX idx_deployments_bp_company ON deployments(bp_company_id);
CREATE INDEX idx_deployments_ep_company ON deployments(ep_company_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_entry_request ON deployments(entry_request_id);

CREATE INDEX idx_deployment_changes_deployment ON deployment_worker_changes(deployment_id);
CREATE INDEX idx_deployment_extensions_deployment ON deployment_extensions(deployment_id);

-- RLS (Row Level Security) 비활성화 (기존 정책과 일관성 유지)
ALTER TABLE deployments DISABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_worker_changes DISABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_extensions DISABLE ROW LEVEL SECURITY;

-- 코멘트 추가
COMMENT ON TABLE deployments IS '장비+운전자 현장 투입 관리';
COMMENT ON TABLE deployment_worker_changes IS '투입 중 운전자 교체 이력';
COMMENT ON TABLE deployment_extensions IS '투입 기간 연장 이력';

COMMENT ON COLUMN deployments.id IS '투입 ID (nanoid)';
COMMENT ON COLUMN deployments.entry_request_id IS '반입 요청 ID';
COMMENT ON COLUMN deployments.equipment_id IS '장비 ID';
COMMENT ON COLUMN deployments.worker_id IS '운전자 ID';
COMMENT ON COLUMN deployments.owner_id IS '장비 소유자(Owner) ID';
COMMENT ON COLUMN deployments.bp_company_id IS '건설사(BP) ID';
COMMENT ON COLUMN deployments.ep_company_id IS '현장 관리사(EP) ID (선택)';
COMMENT ON COLUMN deployments.start_date IS '투입 시작일';
COMMENT ON COLUMN deployments.planned_end_date IS '종료 예정일';
COMMENT ON COLUMN deployments.actual_end_date IS '실제 종료일';
COMMENT ON COLUMN deployments.status IS '투입 상태 (active/extended/completed)';
