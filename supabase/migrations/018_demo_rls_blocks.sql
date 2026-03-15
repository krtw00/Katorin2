-- ============================================
-- 018: デモデータRLS漏れ修正（blocks, war_rounds）
-- ============================================

-- tournament_blocks: デモ対応
DROP POLICY IF EXISTS "tournament_blocks_select" ON tournament_blocks;

CREATE POLICY "tournament_blocks_select" ON tournament_blocks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_blocks.tournament_id
    AND (
      (NOT t.is_demo AND t.visibility = 'public')
      OR (t.is_demo AND (
        t.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = auth.uid())
        OR is_series_demo_member(t.series_id, auth.uid())
      ))
    )
  )
  OR
  -- series_id直接参照
  (tournament_blocks.series_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM series s WHERE s.id = tournament_blocks.series_id AND NOT s.is_demo AND s.visibility = 'public')
    OR EXISTS (SELECT 1 FROM series s WHERE s.id = tournament_blocks.series_id AND s.is_demo AND (
      s.organizer_id = auth.uid() OR is_series_demo_member(s.id, auth.uid())
    ))
  ))
);

-- war_rounds: デモ対応
DROP POLICY IF EXISTS "war_rounds_select" ON war_rounds;

CREATE POLICY "war_rounds_select" ON war_rounds FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.id = war_rounds.match_id
    AND (
      (NOT t.is_demo AND t.visibility = 'public')
      OR (t.is_demo AND (
        t.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = auth.uid())
        OR is_series_demo_member(t.series_id, auth.uid())
      ))
    )
  )
);
