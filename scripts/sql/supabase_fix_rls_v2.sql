-- ============================================================
-- entry_request_items RLS 정책 수정 (v2)
-- 문제: Admin 사용자가 entry_request_items를 생성할 수 없음
-- 해결: role을 소문자로 비교 (LOWER 함수 사용)
-- ============================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "BP can insert their own entry request items" ON entry_request_items;

-- 새로운 INSERT 정책: BP 또는 Admin이 생성 가능
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
    -- Admin 사용자: 모든 요청 가능 (대소문자 무시)
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()::varchar
      AND LOWER(u.role::text) = 'admin'
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
      AND LOWER(u.role::text) = 'admin'
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
      AND LOWER(u.role::text) = 'admin'
    )
  );

-- ============================================================
-- 완료 메시지
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ entry_request_items RLS 정책이 수정되었습니다.';
  RAISE NOTICE '✅ Admin 사용자가 이제 entry_request_items를 생성할 수 있습니다.';
END $$;

