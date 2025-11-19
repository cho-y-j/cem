-- inspector@test.com을 ep@test.com의 회사 소속으로 변경

-- 1. EP 회사 ID 확인
SELECT id, email, company_id, role FROM users WHERE email = 'ep@test.com';

-- 2. Inspector 현재 정보 확인
SELECT id, email, company_id, role FROM users WHERE email = 'inspector@test.com';

-- 3. Inspector의 company_id를 EP 회사로 변경
UPDATE users
SET company_id = (SELECT company_id FROM users WHERE email = 'ep@test.com')
WHERE email = 'inspector@test.com';

-- 4. 변경 확인
SELECT id, email, company_id, role FROM users WHERE email = 'inspector@test.com';

-- 5. Workers 테이블의 Inspector도 연결 확인 (있는 경우)
-- Inspector worker 레코드가 있다면 user_id로 연결되어 있을 것
SELECT w.id, w.name, w.user_id, u.email, u.company_id
FROM workers w
JOIN users u ON w.user_id = u.id
WHERE u.email = 'inspector@test.com';
