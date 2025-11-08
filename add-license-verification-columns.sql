-- docs_compliance 테이블에 운전면허 검증 관련 컬럼 추가
-- RIMS (운전자격확인시스템) 검증 결과 저장

ALTER TABLE docs_compliance
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_result JSONB,
ADD COLUMN IF NOT EXISTS verification_result_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS verification_error TEXT;

-- 인덱스 추가 (검증 상태로 빠르게 조회)
CREATE INDEX IF NOT EXISTS idx_docs_compliance_verified 
ON docs_compliance(verified);

CREATE INDEX IF NOT EXISTS idx_docs_compliance_verification_result_code 
ON docs_compliance(verification_result_code);

-- 주석 추가
COMMENT ON COLUMN docs_compliance.verified IS '운전면허 검증 완료 여부';
COMMENT ON COLUMN docs_compliance.verified_at IS '운전면허 검증 일시';
COMMENT ON COLUMN docs_compliance.verification_result IS 'RIMS API 전체 응답 (JSON)';
COMMENT ON COLUMN docs_compliance.verification_result_code IS 'RIMS 검증결과코드 (00: 적격, 01~: 부적격)';
COMMENT ON COLUMN docs_compliance.verification_error IS '검증 실패 시 에러 메시지';












