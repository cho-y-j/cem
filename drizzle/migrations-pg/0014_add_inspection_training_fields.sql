-- entry_requests 테이블에 반입 검사/안전교육/건강검진 필드 추가
-- EP가 수행하는 검사 및 교육 정보 저장

-- 반입 검사 관련 필드
ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS entry_inspection_completed_at TIMESTAMP;

ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS entry_inspection_file_url VARCHAR(500);

-- 안전교육 관련 필드
ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS safety_training_completed_at TIMESTAMP;

ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS safety_training_file_url VARCHAR(500);

-- 배치전 건강검진 관련 필드
ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS health_check_completed_at TIMESTAMP;

ALTER TABLE entry_requests
ADD COLUMN IF NOT EXISTS health_check_file_url VARCHAR(500);

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'entry_requests 테이블에 반입 검사/안전교육/건강검진 필드가 추가되었습니다.';
    RAISE NOTICE '- entry_inspection_completed_at, entry_inspection_file_url (반입 검사)';
    RAISE NOTICE '- safety_training_completed_at, safety_training_file_url (안전교육)';
    RAISE NOTICE '- health_check_completed_at, health_check_file_url (건강검진)';
END $$;

