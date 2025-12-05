-- ============================================================
-- entry_request_items RLS 정책 수정
-- 문제: Admin 사용자가 entry_request_items를 생성할 수 없음
-- 해결: Admin 권한 추가 또는 임시로 RLS 비활성화
-- ============================================================

-- 방법 1: 기존 정책 삭제 후 새로운 정책 생성 (권장)
DROP POLICY IF EXISTS "BP can insert their own entry request items" ON entry_request_items;

-- 새로운 정책: BP 또는 Admin이 생성 가능
CREATE POLICY "BP and Admin can insert entry request items"
  ON entry_request_items FOR INSERT
  WITH CHECK (
    -- BP 사용자: 자신의 요청만
    EXISTS (
      SELECT 1 FROM entry_requests er
      WHERE er.id = entry_request_items.entry_request_id
      AND er.bp_user_id = auth.uid()::varchar
    )
    OR
    -- Admin 사용자: 모든 요청 가능
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()::varchar
      AND u.role = 'Admin'
    )
  );

-- UPDATE 정책 추가
CREATE POLICY "BP and Admin can update entry request items"
  ON entry_request_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM entry_requests er
      WHERE er.id = entry_request_items.entry_request_id
      AND er.bp_user_id = auth.uid()::varchar
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()::varchar
      AND u.role = 'Admin'
    )
  );

-- DELETE 정책 추가
CREATE POLICY "BP and Admin can delete entry request items"
  ON entry_request_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM entry_requests er
      WHERE er.id = entry_request_items.entry_request_id
      AND er.bp_user_id = auth.uid()::varchar
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()::varchar
      AND u.role = 'Admin'
    )
  );

-- ============================================================
-- 방법 2: 임시로 RLS 비활성화 (개발 환경에서만 사용)
-- ============================================================

-- 주의: 프로덕션 환경에서는 사용하지 마세요!
-- ALTER TABLE entry_request_items DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 완료 메시지
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ entry_request_items RLS 정책이 수정되었습니다.';
  RAISE NOTICE '✅ Admin 사용자가 이제 entry_request_items를 생성할 수 있습니다.';
END $$;

