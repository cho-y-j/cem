-- ═══════════════════════════════════════════════════════════════════
-- Deployment에 ep_company_id 설정
-- ═══════════════════════════════════════════════════════════════════

-- 1. 현재 상태 확인
SELECT
  '1. Current Deployments' as step,
  d.id,
  d.status,
  d.entry_request_id,
  d.ep_company_id,
  er.target_ep_company_id as entry_request_ep_company
FROM deployments d
LEFT JOIN entry_requests er ON d.entry_request_id = er.id
WHERE d.status IN ('active', 'extended', 'pending_bp')
ORDER BY d.created_at DESC;

-- 2. ep_company_id가 null인 deployment 확인
SELECT
  '2. Deployments with null ep_company_id' as step,
  d.id,
  d.status,
  d.entry_request_id,
  er.target_ep_company_id as should_be_ep_company
FROM deployments d
LEFT JOIN entry_requests er ON d.entry_request_id = er.id
WHERE d.ep_company_id IS NULL
  AND d.status IN ('active', 'extended', 'pending_bp');

-- 3. ep_company_id를 entry_request의 target_ep_company_id로 업데이트
UPDATE deployments
SET ep_company_id = (
  SELECT target_ep_company_id
  FROM entry_requests
  WHERE id = deployments.entry_request_id
)
WHERE ep_company_id IS NULL
  AND entry_request_id IS NOT NULL;

-- 4. 업데이트 결과 확인
SELECT
  '3. Updated Deployments' as step,
  d.id,
  d.status,
  d.ep_company_id,
  er.target_ep_company_id as entry_request_ep_company,
  CASE
    WHEN d.ep_company_id = er.target_ep_company_id THEN 'MATCH ✓'
    WHEN d.ep_company_id IS NULL THEN 'NULL'
    ELSE 'MISMATCH ✗'
  END as status
FROM deployments d
LEFT JOIN entry_requests er ON d.entry_request_id = er.id
WHERE d.status IN ('active', 'extended', 'pending_bp')
ORDER BY d.created_at DESC;

-- 5. EP가 지정할 수 있는 deployment 확인
SELECT
  '4. EP Can Now Assign' as step,
  d.id,
  d.status,
  d.ep_company_id,
  'company-aINGYYBiR9rMApb5m9gui' as ep_user_company,
  CASE
    WHEN d.ep_company_id = 'company-aINGYYBiR9rMApb5m9gui' THEN 'CAN ASSIGN ✓'
    ELSE 'CANNOT ASSIGN ✗'
  END as permission
FROM deployments d
WHERE d.status IN ('active', 'extended')
ORDER BY d.created_at DESC;
