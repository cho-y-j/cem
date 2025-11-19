-- ═══════════════════════════════════════════════════════════════════
-- EP 안전점검원 지정 권한 디버깅
-- ═══════════════════════════════════════════════════════════════════

-- 1. EP 사용자 정보 확인
SELECT
  '1. EP User Info' as step,
  id, email, name, company_id, role
FROM users
WHERE email = 'ep@test.com';

-- 2. EP 회사 정보 확인
SELECT
  '2. EP Company Info' as step,
  c.id, c.name, c.company_type
FROM companies c
JOIN users u ON u.company_id = c.id
WHERE u.email = 'ep@test.com';

-- 3. 모든 active/extended deployment 확인
SELECT
  '3. All Active Deployments' as step,
  d.id,
  d.status,
  d.bp_company_id,
  d.ep_company_id,
  bp.name as bp_company_name,
  ep.name as ep_company_name,
  e.reg_num as equipment_reg_num,
  w.name as worker_name
FROM deployments d
LEFT JOIN companies bp ON d.bp_company_id = bp.id
LEFT JOIN companies ep ON d.ep_company_id = ep.id
LEFT JOIN equipment e ON d.equipment_id = e.id
LEFT JOIN workers w ON d.worker_id = w.id
WHERE d.status IN ('active', 'extended')
ORDER BY d.created_at DESC;

-- 4. EP 사용자가 지정할 수 있는 deployment (ep_company_id가 일치하는 것)
SELECT
  '4. EP Can Assign (ep_company_id matches)' as step,
  d.id,
  d.status,
  d.ep_company_id,
  (SELECT company_id FROM users WHERE email = 'ep@test.com') as ep_user_company_id,
  CASE
    WHEN d.ep_company_id = (SELECT company_id FROM users WHERE email = 'ep@test.com')
    THEN 'MATCH ✓'
    ELSE 'NOT MATCH ✗'
  END as permission_status,
  ep.name as ep_company_name,
  e.reg_num as equipment_reg_num,
  w.name as worker_name
FROM deployments d
LEFT JOIN companies ep ON d.ep_company_id = ep.id
LEFT JOIN equipment e ON d.equipment_id = e.id
LEFT JOIN workers w ON d.worker_id = w.id
WHERE d.status IN ('active', 'extended');

-- 5. 권한이 없는 deployment 확인 (ep_company_id가 다른 것)
SELECT
  '5. No Permission Deployments' as step,
  d.id,
  d.status,
  d.ep_company_id as deployment_ep_company,
  (SELECT company_id FROM users WHERE email = 'ep@test.com') as ep_user_company,
  ep.name as deployment_ep_company_name,
  (SELECT c.name FROM companies c WHERE c.id = (SELECT company_id FROM users WHERE email = 'ep@test.com')) as ep_user_company_name
FROM deployments d
LEFT JOIN companies ep ON d.ep_company_id = ep.id
WHERE d.status IN ('active', 'extended')
  AND d.ep_company_id != (SELECT company_id FROM users WHERE email = 'ep@test.com');

-- 6. 모든 companies 확인
SELECT
  '6. All Companies' as step,
  id, name, company_type
FROM companies
ORDER BY company_type, name;

-- ═══════════════════════════════════════════════════════════════════
-- 해결 방법
-- ═══════════════════════════════════════════════════════════════════
--
-- Step 4에서 'NOT MATCH ✗'가 나오면:
--
-- 옵션 1: EP 회사를 올바른 회사로 변경
-- UPDATE users
-- SET company_id = (deployment의 ep_company_id)
-- WHERE email = 'ep@test.com';
--
-- 옵션 2: Deployment의 ep_company_id를 EP 회사로 변경
-- UPDATE deployments
-- SET ep_company_id = (SELECT company_id FROM users WHERE email = 'ep@test.com')
-- WHERE id = '해당_deployment_id';
--
-- ═══════════════════════════════════════════════════════════════════
