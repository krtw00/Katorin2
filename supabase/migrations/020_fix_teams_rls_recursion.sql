-- ============================================
-- 019: teams/team_members RLSをデモデータ対応
-- SECURITY DEFINER関数でteams↔team_membersの循環参照を回避
-- ============================================

-- teams↔team_membersの循環を断ち切るSECURITY DEFINER関数
CREATE OR REPLACE FUNCTION is_team_member(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members WHERE team_id = p_team_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. teams
DROP POLICY IF EXISTS "teams_select" ON teams;

CREATE POLICY "teams_select" ON teams FOR SELECT USING (
  -- 未所属チーム: リーダーまたはメンバーのみ
  (series_id IS NULL AND tournament_id IS NULL AND (
    leader_id = auth.uid()
    OR is_team_member(teams.id, auth.uid())
  ))
  OR
  -- シリーズ所属
  (series_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM series s WHERE s.id = teams.series_id AND NOT s.is_demo AND s.visibility = 'public')
    OR EXISTS (SELECT 1 FROM series s WHERE s.id = teams.series_id AND s.is_demo AND (
      s.organizer_id = auth.uid() OR is_series_demo_member(s.id, auth.uid())
    ))
    OR EXISTS (SELECT 1 FROM series s WHERE s.id = teams.series_id AND NOT s.is_demo AND s.organizer_id = auth.uid())
    OR leader_id = auth.uid()
    OR is_team_member(teams.id, auth.uid())
  ))
  OR
  -- 大会所属
  (tournament_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM tournaments t WHERE t.id = teams.tournament_id AND NOT t.is_demo AND t.visibility = 'public')
    OR EXISTS (SELECT 1 FROM tournaments t WHERE t.id = teams.tournament_id AND t.is_demo AND (
      t.organizer_id = auth.uid()
      OR is_series_demo_member(t.series_id, auth.uid())
    ))
    OR EXISTS (SELECT 1 FROM tournaments t WHERE t.id = teams.tournament_id AND NOT t.is_demo AND t.organizer_id = auth.uid())
    OR leader_id = auth.uid()
    OR is_team_member(teams.id, auth.uid())
  ))
);

-- 2. team_members: teamsテーブルを参照せずSECURITY DEFINER関数で判定
DROP POLICY IF EXISTS "team_members_select" ON team_members;

-- チームの親(series/tournament)の可視性をRLS無視で判定
CREATE OR REPLACE FUNCTION is_team_visible(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams t WHERE t.id = p_team_id AND (
      -- 非デモ公開シリーズ
      EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND NOT s.is_demo AND s.visibility = 'public')
      OR
      -- デモシリーズ: 主催者 or メンバー
      EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.is_demo AND (
        s.organizer_id = p_user_id OR is_series_demo_member(s.id, p_user_id)
      ))
      OR
      -- 非デモ公開大会
      EXISTS (SELECT 1 FROM tournaments tr WHERE tr.id = t.tournament_id AND NOT tr.is_demo AND tr.visibility = 'public')
      OR
      -- デモ大会
      EXISTS (SELECT 1 FROM tournaments tr WHERE tr.id = t.tournament_id AND tr.is_demo AND (
        tr.organizer_id = p_user_id OR is_series_demo_member(tr.series_id, p_user_id)
      ))
      OR
      -- リーダー or 主催者
      t.leader_id = p_user_id
      OR EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = p_user_id)
      OR EXISTS (SELECT 1 FROM tournaments tr WHERE tr.id = t.tournament_id AND tr.organizer_id = p_user_id)
    )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (
  user_id = auth.uid()
  OR is_team_visible(team_members.team_id, auth.uid())
);
