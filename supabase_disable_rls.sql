-- RLS (Row Level Security) 비활성화
-- 개발 환경에서 entry_request_items 테이블의 RLS 정책 에러 해결

-- entry_request_items 테이블의 RLS 비활성화
ALTER TABLE entry_request_items DISABLE ROW LEVEL SECURITY;

-- 확인: RLS 상태 조회
SELECT 
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'entry_request_items';

-- 참고: 프로덕션 환경에서는 적절한 RLS 정책을 설정해야 합니다.
-- 현재는 개발 환경이므로 RLS를 비활성화합니다.

