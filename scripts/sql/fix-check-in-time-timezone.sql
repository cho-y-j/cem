-- 출근 시간 표시 문제 수정: timestamp를 timestamptz로 변경
-- 이 마이그레이션을 Supabase SQL 에디터에서 실행하세요

-- check_ins 테이블의 check_in_time 컬럼을 timestamptz로 변경
ALTER TABLE "check_ins" ALTER COLUMN "check_in_time" SET DATA TYPE timestamp with time zone;

-- check_ins 테이블의 created_at 컬럼을 timestamptz로 변경
ALTER TABLE "check_ins" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;
ALTER TABLE "check_ins" ALTER COLUMN "created_at" SET DEFAULT now();

-- 실행 후 확인:
-- SELECT check_in_time, created_at FROM check_ins ORDER BY created_at DESC LIMIT 10;
