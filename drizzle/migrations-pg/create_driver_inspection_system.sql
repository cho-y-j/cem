-- ============================================================
-- 운전자 안전점검 시스템 (Driver Inspection System)
-- 안전점검원(inspector) 시스템과 별도로 운전자(driver)용 점검 시스템
-- ============================================================

-- 1. 운전자 점검표 템플릿
CREATE TABLE IF NOT EXISTS driver_inspection_templates (
  id VARCHAR(64) PRIMARY KEY NOT NULL,
  name VARCHAR(255) NOT NULL, -- 예: "크레인 일일점검", "덤프트럭 주간점검"
  equip_type_id VARCHAR(64), -- 장비 타입 ID (NULL이면 전체)
  check_frequency VARCHAR(20) NOT NULL, -- "daily", "weekly", "monthly"
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  created_by VARCHAR(64),
  updated_at TIMESTAMP
);

COMMENT ON TABLE driver_inspection_templates IS '운전자 점검표 템플릿 - 차종별 점검 항목 정의';
COMMENT ON COLUMN driver_inspection_templates.check_frequency IS '점검 주기: daily(일일), weekly(주간), monthly(월간)';

-- 2. 운전자 점검표 템플릿 항목
CREATE TABLE IF NOT EXISTS driver_inspection_template_items (
  id VARCHAR(64) PRIMARY KEY NOT NULL,
  template_id VARCHAR(64) NOT NULL,
  category VARCHAR(100), -- 예: "유체레벨", "구조부", "안전장치", "소모품"
  item_text TEXT NOT NULL, -- 점검 항목 내용
  result_type VARCHAR(20) DEFAULT 'status', -- "status" (양호/불량) or "text" (텍스트 입력) or "numeric" (숫자)
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT fk_driver_template FOREIGN KEY (template_id) 
    REFERENCES driver_inspection_templates(id) ON DELETE CASCADE
);

COMMENT ON TABLE driver_inspection_template_items IS '운전자 점검표 템플릿의 개별 점검 항목';
COMMENT ON COLUMN driver_inspection_template_items.result_type IS '결과 타입: status(양호/불량), text(텍스트), numeric(숫자)';

-- 3. 운전자 점검 기록
CREATE TABLE IF NOT EXISTS driver_inspection_records (
  id VARCHAR(64) PRIMARY KEY NOT NULL,
  template_id VARCHAR(64),
  equipment_id VARCHAR(64) NOT NULL,
  driver_id VARCHAR(64) NOT NULL, -- 운전자 (workers 테이블 참조)
  inspection_date DATE NOT NULL,
  check_frequency VARCHAR(20) NOT NULL, -- "daily", "weekly", "monthly"
  
  -- 장비 정보 (스냅샷)
  vehicle_number VARCHAR(50),
  equipment_name VARCHAR(255),
  driver_name VARCHAR(100),
  
  -- 운행 정보 (건설기계는 시간, 차량은 거리)
  accumulated_hours NUMERIC(10,2), -- 누적 운행 시간 (건설기계용)
  accumulated_mileage NUMERIC(10,2), -- 누적 주행 거리 (차량용)
  operation_hours_today NUMERIC(8,2), -- 당일 운행 시간
  mileage_today NUMERIC(8,2), -- 당일 주행 거리
  
  -- 소모품 정보
  last_oil_change_date DATE, -- 마지막 엔진오일 교환일
  last_oil_change_hours NUMERIC(10,2), -- 엔진오일 교환시 누적시간
  last_oil_change_mileage NUMERIC(10,2), -- 엔진오일 교환시 주행거리
  last_hydraulic_oil_change_date DATE, -- 마지막 유압오일 교환일
  last_filter_change_date DATE, -- 마지막 필터 교환일
  
  -- 서명 및 상태
  driver_signature TEXT, -- Base64 서명 이미지
  signed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'draft', -- "draft", "completed"
  overall_result VARCHAR(20), -- "pass", "attention_required"
  notes TEXT, -- 특이사항
  
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP,
  
  CONSTRAINT fk_driver_equipment FOREIGN KEY (equipment_id) 
    REFERENCES equipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_driver_worker FOREIGN KEY (driver_id) 
    REFERENCES workers(id) ON DELETE CASCADE
);

COMMENT ON TABLE driver_inspection_records IS '운전자가 작성한 점검 기록';
COMMENT ON COLUMN driver_inspection_records.accumulated_hours IS '건설기계 누적 운행 시간 (소모품 교환 시기 판단용)';
COMMENT ON COLUMN driver_inspection_records.accumulated_mileage IS '차량 누적 주행거리 (소모품 교환 시기 판단용)';

-- 4. 운전자 점검 기록 상세 항목
CREATE TABLE IF NOT EXISTS driver_inspection_record_items (
  id VARCHAR(64) PRIMARY KEY NOT NULL,
  record_id VARCHAR(64) NOT NULL,
  template_item_id VARCHAR(64), -- 템플릿 항목 참조 (NULL 가능 - 직접 추가한 항목)
  category VARCHAR(100),
  item_text TEXT NOT NULL, -- 점검 항목 내용
  result VARCHAR(20), -- "good", "bad", "warning" 등
  result_text TEXT, -- 텍스트 결과 또는 추가 설명
  numeric_value NUMERIC(10,2), -- 숫자 입력 결과
  action_required TEXT, -- 필요한 조치사항
  photo_url TEXT, -- 사진 URL (문제 발견시)
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT fk_driver_record FOREIGN KEY (record_id) 
    REFERENCES driver_inspection_records(id) ON DELETE CASCADE
);

COMMENT ON TABLE driver_inspection_record_items IS '운전자 점검 기록의 개별 항목별 결과';

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_driver_templates_equip_type ON driver_inspection_templates(equip_type_id);
CREATE INDEX IF NOT EXISTS idx_driver_templates_active ON driver_inspection_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_driver_template_items_template ON driver_inspection_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_driver_records_equipment ON driver_inspection_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_driver_records_driver ON driver_inspection_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_records_date ON driver_inspection_records(inspection_date);
CREATE INDEX IF NOT EXISTS idx_driver_record_items_record ON driver_inspection_record_items(record_id);

-- 6. RLS 정책 (Row Level Security)
ALTER TABLE driver_inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_inspection_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_inspection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_inspection_record_items ENABLE ROW LEVEL SECURITY;

-- Admin/EP는 모든 템플릿 관리 가능
CREATE POLICY "Admin can manage driver templates" ON driver_inspection_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role IN ('admin', 'ep')
    )
  );

CREATE POLICY "Admin can manage driver template items" ON driver_inspection_template_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role IN ('admin', 'ep')
    )
  );

-- 모든 사용자는 활성 템플릿 조회 가능
CREATE POLICY "Users can view active driver templates" ON driver_inspection_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view driver template items" ON driver_inspection_template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM driver_inspection_templates 
      WHERE driver_inspection_templates.id = template_id 
      AND is_active = true
    )
  );

-- 운전자는 자신의 점검 기록 관리
CREATE POLICY "Drivers can manage their own records" ON driver_inspection_records
  FOR ALL USING (
    driver_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role IN ('admin', 'ep')
    )
  );

-- 점검 항목 결과도 동일
CREATE POLICY "Users can manage driver record items" ON driver_inspection_record_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM driver_inspection_records 
      WHERE driver_inspection_records.id = record_id
      AND (
        driver_id = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid()::text 
          AND users.role IN ('admin', 'ep')
        )
      )
    )
  );

-- ============================================================
-- 완료
-- ============================================================











