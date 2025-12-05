-- 일일점검 항목
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

-- 주간점검 항목
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

-- 월간점검 항목
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

-- 필요시점검 항목
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
