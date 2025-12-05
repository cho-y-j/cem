-- ============================================================
-- Worker 데이터 아키텍처 수정: users와 workers 테이블 연결
-- ============================================================
-- 작성일: 2025-01-29
-- 목적: Worker 로그인 계정(users)과 인력 레코드(workers) 연결
--
-- 문제:
--   - Worker 로그인 시 users 테이블 사용 (users.id = 'worker-test-001')
--   - Deployment는 workers 테이블 참조 (worker_id = 'VRonmkWXjpsXgqlzUUiWJ')
--   - 두 테이블 간 연결 없어서 로그인 후 투입 정보 조회 불가
--
-- 해결:
--   1. workers 테이블에 user_id 컬럼 추가
--   2. 기존 테스트 데이터 연결
-- ============================================================

-- Step 1: workers 테이블에 user_id 컬럼 추가
ALTER TABLE "workers" ADD COLUMN "user_id" varchar(64);

-- Step 2: 기존 테스트 Worker 데이터 연결
-- Worker 로그인 계정: users.id = 'worker-test-001'
-- Worker 인력 레코드: workers.id = 'VRonmkWXjpsXgqlzUUiWJ' (이름: "테스트")

UPDATE workers
SET user_id = 'worker-test-001'
WHERE id = 'VRonmkWXjpsXgqlzUUiWJ';

-- Step 3: 검증 쿼리들
-- (아래는 실행하지 않아도 되며, 검증용으로 하나씩 실행 가능)

-- 3.1 연결된 worker 확인
-- SELECT id, user_id, name, license_num, pin_code
-- FROM workers
-- WHERE user_id IS NOT NULL;

-- 3.2 user_id로 투입 조회 테스트
-- SELECT d.*, w.name as worker_name, w.user_id
-- FROM deployments d
-- JOIN workers w ON d.worker_id = w.id
-- WHERE w.user_id = 'worker-test-001'
-- ORDER BY d.created_at DESC;

-- 3.3 현재 Active 투입 확인
-- SELECT
--   d.id,
--   d.site_name,
--   d.status,
--   w.name as worker_name,
--   w.user_id,
--   u.email as user_email
-- FROM deployments d
-- JOIN workers w ON d.worker_id = w.id
-- LEFT JOIN users u ON w.user_id = u.id
-- WHERE d.status = 'active'
-- ORDER BY d.created_at DESC;

-- ============================================================
-- 실행 완료 후:
-- 1. Worker 로그인 (PIN 1234)
-- 2. 작업확인서 페이지에서 투입 목록 확인
-- 3. 용인 클러스터 투입이 표시되어야 함
-- ============================================================
