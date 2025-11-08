-- Workers 테이블에 email 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. workers 테이블에 email 컬럼 추가 (이미 있으면 에러 무시)
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. 기존 Worker 데이터 확인
SELECT id, name, email, pin_code
FROM workers
LIMIT 10;

-- 3. 기존 users 테이블 확인
SELECT id, email, role, name
FROM users
WHERE role = 'worker'
LIMIT 10;

-- 완료!
-- 이제 서버를 재시작하고 Worker 등록을 테스트하세요.














