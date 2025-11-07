-- ============================================================
-- 안전점검 시스템 완전 설치 SQL
-- 이 파일 전체를 복사해서 Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1단계: 테이블 생성
-- ============================================================

CREATE TABLE IF NOT EXISTS safety_inspection_templates (
	id varchar(64) PRIMARY KEY NOT NULL,
	name varchar(255) NOT NULL,
	equip_type_id varchar(64),
	inspector_type varchar(20) NOT NULL,
	description text,
	is_active boolean DEFAULT true,
	created_at timestamp DEFAULT now(),
	created_by varchar(64),
	updated_at timestamp
);

CREATE TABLE IF NOT EXISTS safety_inspection_template_items (
	id varchar(64) PRIMARY KEY NOT NULL,
	template_id varchar(64) NOT NULL,
	category varchar(100),
	item_text text NOT NULL,
	check_frequency varchar(20) NOT NULL,
	check_timing varchar(100),
	result_type varchar(20) DEFAULT 'status',
	display_order integer DEFAULT 0,
	is_required boolean DEFAULT true,
	created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS safety_inspections (
	id varchar(64) PRIMARY KEY NOT NULL,
	template_id varchar(64),
	equipment_id varchar(64) NOT NULL,
	inspector_id varchar(64) NOT NULL,
	inspector_type varchar(20) NOT NULL,
	inspection_date date NOT NULL,
	check_frequency varchar(20) NOT NULL,
	vehicle_number varchar(50),
	equipment_name varchar(255),
	inspector_name varchar(100),
	inspector_signature text,
	signed_at timestamp,
	status varchar(20) DEFAULT 'draft',
	overall_result varchar(20),
	reviewed_by varchar(64),
	reviewed_at timestamp,
	review_comments text,
	submitted_at timestamp,
	created_at timestamp DEFAULT now(),
	updated_at timestamp
);

CREATE TABLE IF NOT EXISTS safety_inspection_results (
	id varchar(64) PRIMARY KEY NOT NULL,
	inspection_id varchar(64) NOT NULL,
	template_item_id varchar(64),
	item_text text NOT NULL,
	check_timing varchar(20),
	result varchar(20),
	result_text text,
	action_required text,
	created_at timestamp DEFAULT now()
);

-- 2단계: 스카이장비 템플릿 생성
-- ============================================================

INSERT INTO safety_inspection_templates
(id, name, equip_type_id, inspector_type, description, is_active, created_by, created_at)
VALUES
('bUKZFg1nv4gklE9tceuak', '스카이장비 안전점검', NULL, 'inspector', '고소작업대(스카이장비) 일일/주별/월별 안전점검 체크리스트', true, 'admin-test-001', NOW())
ON CONFLICT (id) DO NOTHING;

-- 3단계: 체크 항목 삽입
-- ============================================================

-- 일일점검 항목 (6개)
INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_001', 'bUKZFg1nv4gklE9tceuak', '일일점검', '작업계획서 비치', 'daily', 'before_use', 'status', 1, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_002', 'bUKZFg1nv4gklE9tceuak', '일일점검', '후진 경보장치 작동 유무', 'daily', 'before_use', 'status', 2, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_003', 'bUKZFg1nv4gklE9tceuak', '일일점검', '비상 정지버튼 정상작동 여부 및 버튼 복귀시 조작직전의 작동이 자동으로 되지 않는지 확인', 'daily', 'before_use', 'status', 3, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_004', 'bUKZFg1nv4gklE9tceuak', '일일점검', '브레이크 클러치 조정장치 및 인디케이터의 정상작동 유무', 'daily', 'before_use', 'status', 4, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_005', 'bUKZFg1nv4gklE9tceuak', '일일점검', '작업 반경내 장애물 및 위험요인 확인', 'daily', 'before_use', 'status', 5, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_006', 'bUKZFg1nv4gklE9tceuak', '일일점검', '유압 호스 및 연결부 누유 확인', 'daily', 'before_use', 'status', 6, true, NOW());

-- 주간점검 항목 (5개)
INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_101', 'bUKZFg1nv4gklE9tceuak', '주간점검', '비파괴검사 실시여부 확인 (3개월 내)', 'weekly', 'before_use', 'status', 101, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_102', 'bUKZFg1nv4gklE9tceuak', '주간점검', '붐, 선회장비 등 주요 구조부 및 차륜의 풀림, 균열, 변경, 누유, 이상 유무 확인', 'weekly', 'before_use', 'status', 102, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_103', 'bUKZFg1nv4gklE9tceuak', '주간점검', '소화기 비치 및 소화기 상태 유무', 'weekly', 'before_use', 'status', 103, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_104', 'bUKZFg1nv4gklE9tceuak', '주간점검', '와이어로프 및 체인 마모, 변형 상태 확인', 'weekly', 'before_use', 'status', 104, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_105', 'bUKZFg1nv4gklE9tceuak', '주간점검', '안전난간 및 작업대 손상 여부 확인', 'weekly', 'before_use', 'status', 105, true, NOW());

-- 월간점검 항목 (4개)
INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_201', 'bUKZFg1nv4gklE9tceuak', '월간점검', '임의부착장치(구조변경 미승인 장치) 설치 유무 확인 (없을 경우 N/A 표기)', 'monthly', 'before_use', 'status', 201, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_202', 'bUKZFg1nv4gklE9tceuak', '월간점검', '유압실린더 및 펌프 작동 상태 점검', 'monthly', 'before_use', 'status', 202, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_203', 'bUKZFg1nv4gklE9tceuak', '월간점검', '전기 계통 및 배선 상태 점검', 'monthly', 'before_use', 'status', 203, true, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_204', 'bUKZFg1nv4gklE9tceuak', '월간점검', '안전벨트 및 안전고리 상태 점검', 'monthly', 'before_use', 'status', 204, true, NOW());

-- 필요시점검 항목 (3개)
INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_301', 'bUKZFg1nv4gklE9tceuak', '필요시점검', '작업 중 붐 최대 인출 시 고압선로와의 이격 거리 (m)', 'as_needed', 'during_use', 'text', 301, false, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_302', 'bUKZFg1nv4gklE9tceuak', '필요시점검', '악천후(강풍, 폭우, 폭설) 시 작업 중단 여부', 'as_needed', 'during_use', 'status', 302, false, NOW());

INSERT INTO safety_inspection_template_items
(id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
VALUES
('item_303', 'bUKZFg1nv4gklE9tceuak', '필요시점검', '긴급 상황 발생 시 조치 사항', 'as_needed', 'after_use', 'text', 303, false, NOW());

-- 4단계: 결과 확인
-- ============================================================

SELECT '테이블 생성 완료' as step_1;

SELECT '템플릿 생성 완료' as step_2, id, name
FROM safety_inspection_templates
WHERE id = 'bUKZFg1nv4gklE9tceuak';

SELECT '항목 삽입 완료' as step_3, category, COUNT(*) as count
FROM safety_inspection_template_items
WHERE template_id = 'bUKZFg1nv4gklE9tceuak'
GROUP BY category
ORDER BY catego