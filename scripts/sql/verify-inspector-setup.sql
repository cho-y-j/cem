-- ═══════════════════════════════════════════════════════════════════
-- Inspector 설정 검증 스크립트
-- ═══════════════════════════════════════════════════════════════════

-- 1. EP 사용자 정보 확인
SELECT
  '1. EP User Info' as step,
  id, email, company_id, role, name
FROM users
WHERE email = 'ep@test.com';

-- 2. Inspector 사용자 정보 확인
SELECT
  '2. Inspector User Info' as step,
  id, email, company_id, role, name
FROM users
WHERE email = 'inspector@test.com';

-- 3. 두 사용자의 company_id가 같은지 확인
SELECT
  '3. Company ID Match' as step,
  (SELECT company_id FROM users WHERE email = 'ep@test.com') as ep_company_id,
  (SELECT company_id FROM users WHERE email = 'inspector@test.com') as inspector_company_id,
  CASE
    WHEN (SELECT company_id FROM users WHERE email = 'ep@test.com') =
         (SELECT company_id FROM users WHERE email = 'inspector@test.com')
    THEN 'MATCH ✓'
    ELSE 'NOT MATCH ✗'
  END as status;

-- 4. 안전점검원 worker_type 확인
SELECT
  '4. Inspector Worker Type' as step,
  id, name, description
FROM worker_types
WHERE name = '안전점검원';

-- 5. Inspector의 Worker 레코드 확인
SELECT
  '5. Inspector Worker Record' as step,
  w.id, w.name, w.user_id, w.worker_type_id, w.license_num,
  u.email, u.company_id,
  wt.name as worker_type_name
FROM workers w
LEFT JOIN users u ON w.user_id = u.id
LEFT JOIN worker_types wt ON w.worker_type_id = wt.id
WHERE u.email = 'inspector@test.com';

-- 6. EP 회사에 속한 모든 users 확인
SELECT
  '6. All Users in EP Company' as step,
  u.id, u.email, u.role, u.name
FROM users u
WHERE u.company_id = (SELECT company_id FROM users WHERE email = 'ep@test.com');

-- 7. EP 회사에 속한 모든 안전점검원 workers 확인
SELECT
  '7. All Inspector Workers in EP Company' as step,
  w.id, w.name, w.user_id, w.license_num,
  u.email, u.role,
  wt.name as worker_type_name
FROM workers w
JOIN users u ON w.user_id = u.id
JOIN worker_types wt ON w.worker_type_id = wt.id
WHERE u.company_id = (SELECT company_id FROM users WHERE email = 'ep@test.com')
  AND wt.name = '안전점검원';

-- ═══════════════════════════════════════════════════════════════════
-- 문제 해결 가이드:
-- ═══════════════════════════════════════════════════════════════════
--
-- Step 3이 "NOT MATCH"인 경우:
--   → fix-inspector-company.sql의 UPDATE 문을 다시 실행
--
-- Step 4가 결과 없음:
--   → worker_types 테이블에 '안전점검원' 추가 필요
--
-- Step 5가 결과 없음:
--   → workers 테이블에 inspector 레코드 생성 필요
--
-- Step 5에서 worker_type_id가 안전점검원이 아닌 경우:
--   → workers 테이블의 worker_type_id 수정 필요
--
-- Step 7이 결과 없음 (Step 3/4/5는 OK인 경우):
--   → 데이터 불일치 - Step 2와 Step 5의 정보 재확인
--
-- ═══════════════════════════════════════════════════════════════════
