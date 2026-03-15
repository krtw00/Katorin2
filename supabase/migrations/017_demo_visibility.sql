-- ============================================
-- 017: デモデータの公開制限
-- is_demo=true のデータは関係者のみ閲覧可能
-- ============================================

-- ============================================
-- 1. series: デモシリーズは関係者のみ
-- ============================================

DROP POLICY IF EXISTS "series_select" ON series;

-- SECURITY DEFINER関数でRLS再帰を回避
CREATE OR REPLACE FUNCTION is_series_demo_member(p_series_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.series_id = p_series_id AND tm.user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "series_select" ON series FOR SELECT USING (
  -- 非デモ: 通常のvisibilityルール
  (NOT is_demo AND (visibility = 'public' OR organizer_id = auth.uid()))
  OR
  -- デモ: 主催者 or 配下チームのメンバーのみ
  (is_demo AND (
    organizer_id = auth.uid()
    OR is_series_demo_member(series.id, auth.uid())
  ))
);

-- ============================================
-- 2. tournaments: デモ大会は関係者のみ
-- ============================================

DROP POLICY IF EXISTS "Public tournaments are viewable" ON tournaments;

CREATE POLICY "tournaments_select" ON tournaments FOR SELECT USING (
  -- 非デモ: 通常のvisibilityルール
  (NOT is_demo AND (visibility = 'public' OR organizer_id = auth.uid()))
  OR
  -- デモ: 主催者 or シリーズ主催者 or チームメンバー
  (is_demo AND (
    organizer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM series s WHERE s.id = tournaments.series_id AND s.organizer_id = auth.uid()
    )
    OR is_series_demo_member(tournaments.series_id, auth.uid())
  ))
);

-- ============================================
-- 3. matches: デモ試合は関係者のみ
-- ============================================

DROP POLICY IF EXISTS "Matches viewable by everyone for public tournaments" ON matches;

CREATE POLICY "matches_select" ON matches FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = matches.tournament_id
    AND (
      -- 非デモ公開大会
      (NOT t.is_demo AND (t.visibility = 'public' OR t.organizer_id = auth.uid()))
      OR
      -- デモ: 主催者 or チームメンバー
      (t.is_demo AND (
        t.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = auth.uid()
        )
        OR is_series_demo_member(t.series_id, auth.uid())
      ))
    )
  )
);

-- ============================================
-- 4. war_orders: デモのオーダーも関係者のみ
-- ============================================

DROP POLICY IF EXISTS "war_orders_select" ON war_orders;

CREATE POLICY "war_orders_select" ON war_orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.id = war_orders.match_id
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

-- ============================================
-- 5. team_entries: デモのエントリーも関係者のみ
-- ============================================

DROP POLICY IF EXISTS "Team entries are viewable" ON team_entries;

CREATE POLICY "team_entries_select" ON team_entries FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = team_entries.tournament_id
    AND (
      (NOT t.is_demo AND (t.visibility = 'public' OR t.organizer_id = auth.uid()))
      OR (t.is_demo AND (
        t.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = auth.uid())
        OR is_series_demo_member(t.series_id, auth.uid())
      ))
    )
  )
);
