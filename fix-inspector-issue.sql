-- ═══════════════════════════════════════════════════════════════════
-- Step 1: 모든 worker_types 확인
-- ═══════════════════════════════════════════════════════════════════
SELECT
  '1. All Worker Types' as step,
  id, name, description
FROM worker_types
ORDER BY name;

-- ═══════════════════════════════════════════════════════════════════
-- Step 2: '안전점검원' 존재 여부 확인
-- ═══════════════════════════════════════════════════════════════════
SELECT
  '2. 안전점검원 Worker Type' as step,
  id, name, description
FROM worker_types
WHERE name = '안전점검원';

-- 결과가 없으면 아래 INSERT 실행 필요

-- ═══════════════════════════════════════════════════════════════════
-- Step 3: '안전점검원' worker_type 생성 (없는 경우에만)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO worker_types (
  id,
  name,
  description,
  created_at
)
SELECT
  gen_random_uuid(),
  '안전점검원',
  'EP 소속 안전 점검 담당자',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM worker_types WHERE name = '안전점검원'
);

-- ═══════════════════════════════════════════════════════════════════
-- Step 4: 생성 확인
-- ═══════════════════════════════════════════════════════════════════
SELECT
  '3. 안전점검원 Worker Type (생성 후)' as step,
  id, name, description
FROM worker_types
WHERE name = '안전점검원';

-- ═══════════════════════════════════════════════════════════════════
-- Step 5: Inspector Worker 레코드 생성
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO workers (
  id,
  name,
  user_id,
  worker_type_id,
  owner_id,
  owner_company_id,
  license_num,
  created_at
)
SELECT
  gen_random_uuid(),
  u.name,
  u.id,
  (SELECT id FROM worker_types WHERE name = '안전점검원'),
  NULL,
  NULL,
  NULL,
  NOW()
FROM users u
WHERE u.email = 'inspector@test.com'
  AND NOT EXISTS (
    SELECT 1 FROM workers w WHERE w.user_id = u.id
  );

-- ═══════════════════════════════════════════════════════════════════
-- Step 6: 생성 결과 확인
-- ═══════════════════════════════════════════════════════════════════
SELECT
  '4. Created Inspector Worker' as step,
  w.id, w.name, w.user_id, w.worker_type_id,
  u.email, u.name as user_name, u.company_id,
  wt.name as worker_type_name
FROM workers w
JOIN users u ON w.user_id = u.id
JOIN worker_types wt ON w.worker_type_id = wt.id
WHERE u.email = 'inspector@test.com';

-- ═══════════════════════════════════════════════════════════════════
-- Step 7: EP 회사의 모든 안전점검원 확인
-- ═══════════════════════════════════════════════════════════════════
SELECT
  '5. All EP Company Inspectors' as step,
  w.id, w.name, w.user_id,
  u.email, u.name as user_name, u.company_id,
  c.name as company_name,
  wt.name as worker_type_name
FROM workers w
JOIN users u ON w.user_id = u.id
JOIN worker_types wt ON w.worker_type_id = wt.id
LEFT JOIN companies c ON u.company_id = c.id
WHERE wt.name = '안전점검원'
  AND u.company_id = (SELECT company_id FROM users WHERE email = 'ep@test.com');
