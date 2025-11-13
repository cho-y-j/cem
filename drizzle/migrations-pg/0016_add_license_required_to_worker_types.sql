-- worker_types 테이블에 license_required 컬럼 추가
-- 면허 인증이 필수인 인력유형만 면허 검증을 수행

ALTER TABLE worker_types
ADD COLUMN IF NOT EXISTS license_required BOOLEAN DEFAULT false NOT NULL;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'worker_types 테이블에 license_required 컬럼이 추가되었습니다.';
    RAISE NOTICE '기본값은 false이며, 면허 인증이 필요한 인력유형만 true로 설정하세요.';
END $$;

