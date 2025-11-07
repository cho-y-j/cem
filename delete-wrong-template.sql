-- 잘못 생성된 스카이장비 템플릿 삭제
-- (equip_type_id가 null인 템플릿)

-- 1. 템플릿 항목 먼저 삭제
DELETE FROM safety_inspection_template_items
WHERE template_id = 'bUKZFg1nv4gklE9tceuak';

-- 2. 템플릿 삭제
DELETE FROM safety_inspection_templates
WHERE id = 'bUKZFg1nv4gklE9tceuak';

-- 3. 확인
SELECT COUNT(*) as remaining_templates FROM safety_inspection_templates;
SELECT COUNT(*) as remaining_items FROM safety_inspection_template_items;
