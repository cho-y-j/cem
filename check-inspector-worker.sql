-- ═══════════════════════════════════════════════════════════════════
-- Inspector Worker 레코드 확인 및 생성
-- ═══════════════════════════════════════════════════════════════════

-- 1. Inspector 사용자 정보 확인
SELECT
  '1. Inspector User' as step,
  id, email, name, company_id, role, pin
FROM users
WHERE email = 'inspector@test.com';

-- 2. 안전점검원 worker_type 확인
SELECT
  '2. Inspector Worker Type' as step,
  id, name, description
FROM worker_types
WHERE name = '안전점검원';

-- 3. Inspector의 Worker 레코드 확인
SELECT
  '3. Inspector Worker Record' as step,
  w.id, w.name, w.user_id, w.worker_type_id, w.license_num, w.company_id,
  u.email, u.name as user_name
FROM workers w
LEFT JOIN users u ON w.user_id = u.id
WHERE u.email = 'inspector@test.com';

-- 4. 모든 안전점검원 workers 확인
SELECT
  '4. All Inspector Workers' as step,
  w.id, w.name, w.user_id, w.license_num, w.company_id,
  u.email, u.name as user_name, u.company_id as user_company_id,
  wt.name as worker_type_name
FROM workers w
LEFT JOIN users u ON w.user_id = u.id
LEFT JOIN worker_types wt ON w.worker_type_id = wt.id
WHERE wt.name = '안전점검원';

-- ═══════════════════════════════════════════════════════════════════
-- 문제 해결: Inspector Worker 레코드 생성
-- ═══════════════════════════════════════════════════════════════════

-- Step 3에서 결과가 없다면 아래 INSERT 실행

-- 먼저 필요한 ID들을 확인
-- (inspector user_id와 안전점검원 worker_type_id, company_id)

-- Inspector Worker 레코드 생성 (아래 값들을 실제 값으로 교체)
-- INSERT INTO workers (
--   id,
--   name,
--   user_id,
--   worker_type_id,
--   company_id,
--   license_num,
--   created_at
-- )
-- SELECT
--   gen_random_uuid(),                                          -- id
--   u.name,                                                     -- name
--   u.id,                                                       -- user_id
--   (SELECT id FROM worker_types WHERE name = '안전점검원'),    -- worker_type_id
--   u.company_id,                                               -- company_id
--   NULL,                                                       -- license_num
--   NOW()                                                       -- created_at
-- FROM users u
-- WHERE u.email = 'inspector@test.com';

-- 생성 후 확인
-- SELECT
--   '5. Created Inspector Worker' as step,
--   w.id, w.name, w.user_id, w.worker_type_id, w.company_id,
--   u.email, wt.name as worker_type_name
-- FROM workers w
-- JOIN users u ON w.user_id = u.id
-- JOIN worker_types wt ON w.worker_type_id = wt.id
-- WHERE u.email = 'inspector@test.com';
