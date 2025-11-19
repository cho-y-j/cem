-- ═══════════════════════════════════════════════════════════════════
-- Inspector Worker 레코드 생성 (inspector@test.com)
-- ═══════════════════════════════════════════════════════════════════

-- 현재 상태 확인
SELECT
  'Inspector User Info' as step,
  id, email, name, company_id, role
FROM users
WHERE email = 'inspector@test.com';

SELECT
  'Inspector Worker Type' as step,
  id, name
FROM worker_types
WHERE name = '안전점검원';

-- Inspector Worker 레코드 생성
INSERT INTO workers (
  id,
  name,
  user_id,
  worker_type_id,
  company_id,
  license_num,
  created_at
)
SELECT
  gen_random_uuid(),                                          -- id
  u.name,                                                     -- name
  u.id,                                                       -- user_id
  (SELECT id FROM worker_types WHERE name = '안전점검원'),    -- worker_type_id
  u.company_id,                                               -- company_id
  NULL,                                                       -- license_num
  NOW()                                                       -- created_at
FROM users u
WHERE u.email = 'inspector@test.com'
  AND NOT EXISTS (
    -- 이미 Worker 레코드가 있으면 생성하지 않음
    SELECT 1 FROM workers w WHERE w.user_id = u.id
  );

-- 생성 결과 확인
SELECT
  'Created Inspector Worker' as step,
  w.id, w.name, w.user_id, w.worker_type_id, w.company_id,
  u.email, u.name as user_name,
  wt.name as worker_type_name
FROM workers w
JOIN users u ON w.user_id = u.id
JOIN worker_types wt ON w.worker_type_id = wt.id
WHERE u.email = 'inspector@test.com';

-- EP 회사의 모든 안전점검원 확인
SELECT
  'All EP Company Inspectors' as step,
  w.id, w.name, w.user_id, w.company_id,
  u.email, u.name as user_name,
  c.name as company_name
FROM workers w
JOIN users u ON w.user_id = u.id
JOIN worker_types wt ON w.worker_type_id = wt.id
LEFT JOIN companies c ON w.company_id = c.id
WHERE wt.name = '안전점검원'
  AND w.company_id = (SELECT company_id FROM users WHERE email = 'ep@test.com');
