-- ============================================
-- 022: デモユーザーをデモデータに隔離
-- デモアカウント(@katorin2.codenica.dev)は
-- is_demo=trueのデータのみ閲覧可能
-- ============================================

-- デモユーザー判定関数
CREATE OR REPLACE FUNCTION is_demo_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
    AND email LIKE '%@katorin2.codenica.dev'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. series
DROP POLICY IF EXISTS "series_select" ON series;
CREATE POLICY "series_select" ON series FOR SELECT USING (
  CASE WHEN is_demo_user(auth.uid()) THEN
    -- デモユーザー: デモデータのみ
    is_demo AND (organizer_id = auth.uid() OR is_series_demo_member(series.id, auth.uid()))
  ELSE
    -- 通常ユーザー: 非デモデータのみ
    NOT is_demo AND (visibility = 'public' OR organizer_id = auth.uid())
  END
);

-- 2. tournaments
DROP POLICY IF EXISTS "tournaments_select" ON tournaments;
CREATE POLICY "tournaments_select" ON tournaments FOR SELECT USING (
  CASE WHEN is_demo_user(auth.uid()) THEN
    is_demo AND (
      organizer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM series s WHERE s.id = tournaments.series_id AND s.organizer_id = auth.uid())
      OR is_series_demo_member(tournaments.series_id, auth.uid())
    )
  ELSE
    NOT is_demo AND (
      visibility = 'public' OR organizer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM series s WHERE s.id = tournaments.series_id AND s.organizer_id = auth.uid())
    )
  END
);

-- 3. matches
DROP POLICY IF EXISTS "matches_select" ON matches;
CREATE POLICY "matches_select" ON matches FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = matches.tournament_id
    AND CASE WHEN is_demo_user(auth.uid()) THEN
      t.is_demo AND (
        t.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = auth.uid())
        OR is_series_demo_member(t.series_id, auth.uid())
      )
    ELSE
      NOT t.is_demo AND (t.visibility = 'public' OR t.organizer_id = auth.uid())
    END
  )
);

-- 4. war_orders
DROP POLICY IF EXISTS "war_orders_select" ON war_orders;
CREATE POLICY "war_orders_select" ON war_orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.id = war_orders.match_id
    AND CASE WHEN is_demo_user(auth.uid()) THEN
      t.is_demo AND (
        t.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = auth.uid())
        OR is_series_demo_member(t.series_id, auth.uid())
      )
    ELSE
      NOT t.is_demo AND (t.visibility = 'public' OR t.organizer_id = auth.uid())
    END
  )
);

-- 5. tournament_blocks
DROP POLICY IF EXISTS "tournament_blocks_select" ON tournament_blocks;
CREATE POLICY "tournament_blocks_select" ON tournament_blocks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_blocks.tournament_id
    AND CASE WHEN is_demo_user(auth.uid()) THEN
      t.is_demo AND (
        t.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = auth.uid())
        OR is_series_demo_member(t.series_id, auth.uid())
      )
    ELSE
      NOT t.is_demo AND (t.visibility = 'public' OR t.organizer_id = auth.uid())
    END
  )
  OR (tournament_blocks.series_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM series s WHERE s.id = tournament_blocks.series_id
    AND CASE WHEN is_demo_user(auth.uid()) THEN
      s.is_demo AND (s.organizer_id = auth.uid() OR is_series_demo_member(s.id, auth.uid()))
    ELSE
      NOT s.is_demo AND (s.visibility = 'public' OR s.organizer_id = auth.uid())
    END
  ))
);

-- 6. war_rounds
DROP POLICY IF EXISTS "war_rounds_select" ON war_rounds;
CREATE POLICY "war_rounds_select" ON war_rounds FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.id = war_rounds.match_id
    AND CASE WHEN is_demo_user(auth.uid()) THEN
      t.is_demo AND (
        t.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = auth.uid())
        OR is_series_demo_member(t.series_id, auth.uid())
      )
    ELSE
      NOT t.is_demo AND (t.visibility = 'public' OR t.organizer_id = auth.uid())
    END
  )
);

-- 7. team_entries
DROP POLICY IF EXISTS "team_entries_select" ON team_entries;
CREATE POLICY "team_entries_select" ON team_entries FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = team_entries.tournament_id
    AND CASE WHEN is_demo_user(auth.uid()) THEN
      t.is_demo AND (
        t.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = auth.uid())
        OR is_series_demo_member(t.series_id, auth.uid())
      )
    ELSE
      NOT t.is_demo AND (t.visibility = 'public' OR t.organizer_id = auth.uid())
    END
  )
);

-- 8. teams (SECURITY DEFINER関数で循環回避済み)
DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams FOR SELECT USING (
  CASE WHEN is_demo_user(auth.uid()) THEN
    -- デモユーザー: デモシリーズ所属チームのみ
    (series_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM series s WHERE s.id = teams.series_id AND s.is_demo AND (
        s.organizer_id = auth.uid() OR is_series_demo_member(s.id, auth.uid())
      )
    ))
    OR (tournament_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tournaments t WHERE t.id = teams.tournament_id AND t.is_demo AND (
        t.organizer_id = auth.uid() OR is_series_demo_member(t.series_id, auth.uid())
      )
    ))
    OR leader_id = auth.uid()
    OR is_team_member(teams.id, auth.uid())
  ELSE
    -- 通常ユーザー
    (series_id IS NULL AND tournament_id IS NULL AND (
      leader_id = auth.uid() OR is_team_member(teams.id, auth.uid())
    ))
    OR (series_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM series s WHERE s.id = teams.series_id AND NOT s.is_demo AND s.visibility = 'public')
      OR EXISTS (SELECT 1 FROM series s WHERE s.id = teams.series_id AND NOT s.is_demo AND s.organizer_id = auth.uid())
      OR leader_id = auth.uid()
      OR is_team_member(teams.id, auth.uid())
    ))
    OR (tournament_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM tournaments t WHERE t.id = teams.tournament_id AND NOT t.is_demo AND t.visibility = 'public')
      OR EXISTS (SELECT 1 FROM tournaments t WHERE t.id = teams.tournament_id AND NOT t.is_demo AND t.organizer_id = auth.uid())
      OR leader_id = auth.uid()
      OR is_team_member(teams.id, auth.uid())
    ))
  END
);

-- 9. team_members (SECURITY DEFINER関数で循環回避済み)
-- is_team_visible関数もデモ隔離に対応
CREATE OR REPLACE FUNCTION is_team_visible(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams t WHERE t.id = p_team_id AND (
      CASE WHEN is_demo_user(p_user_id) THEN
        -- デモユーザー: デモデータ所属チームのみ
        EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.is_demo AND (
          s.organizer_id = p_user_id OR is_series_demo_member(s.id, p_user_id)
        ))
        OR EXISTS (SELECT 1 FROM tournaments tr WHERE tr.id = t.tournament_id AND tr.is_demo AND (
          tr.organizer_id = p_user_id OR is_series_demo_member(tr.series_id, p_user_id)
        ))
        OR t.leader_id = p_user_id
      ELSE
        -- 通常ユーザー
        EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND NOT s.is_demo AND s.visibility = 'public')
        OR EXISTS (SELECT 1 FROM tournaments tr WHERE tr.id = t.tournament_id AND NOT tr.is_demo AND tr.visibility = 'public')
        OR t.leader_id = p_user_id
        OR EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = p_user_id)
        OR EXISTS (SELECT 1 FROM tournaments tr WHERE tr.id = t.tournament_id AND tr.organizer_id = p_user_id)
      END
    )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
