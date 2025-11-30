-- workers 테이블에 면허 검증 관련 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. license_verified_at 컬럼 추가 (마지막 검증일)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS license_verified_at TIMESTAMP;

-- 2. license_status 기본값을 'unverified'로 설정
ALTER TABLE workers ALTER COLUMN license_status SET DEFAULT 'unverified';

-- 3. 기존 데이터 중 license_status가 null인 경우 'unverified'로 업데이트
UPDATE workers SET license_status = 'unverified' WHERE license_status IS NULL;

-- 확인
SELECT id, name, license_num, license_status, license_verified_at FROM workers LIMIT 10;





































