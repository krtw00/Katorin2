-- ============================================
-- Allow participants to check in themselves
-- ============================================

-- 参加者自身がチェックインできるようにするRLSポリシー
CREATE POLICY "Participants can check in themselves"
  ON participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
