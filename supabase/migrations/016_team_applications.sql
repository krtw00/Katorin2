-- ============================================
-- 016: チームエントリー申請フロー + RLS修正
-- ============================================

-- ============================================
-- 1. team_applications テーブル
-- ============================================

CREATE TABLE team_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(series_id, team_id)
);

CREATE INDEX idx_team_applications_series ON team_applications(series_id);
CREATE INDEX idx_team_applications_team ON team_applications(team_id);
CREATE INDEX idx_team_applications_status ON team_applications(series_id, status);

-- ============================================
-- 2. team_applications RLS
-- ============================================

ALTER TABLE team_applications ENABLE ROW LEVEL SECURITY;

-- 申請チームのリーダー or シリーズ主催者が閲覧可能
CREATE POLICY "team_applications_select" ON team_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_applications.team_id AND t.leader_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM series s WHERE s.id = team_applications.series_id AND s.organizer_id = auth.uid()
    )
  );

-- チームリーダーが申請可能
CREATE POLICY "team_applications_insert" ON team_applications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_applications.team_id AND t.leader_id = auth.uid()
    )
  );

-- シリーズ主催者が承認/却下可能
CREATE POLICY "team_applications_update" ON team_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM series s WHERE s.id = team_applications.series_id AND s.organizer_id = auth.uid()
    )
  );

-- チームリーダー or シリーズ主催者が削除可能
CREATE POLICY "team_applications_delete" ON team_applications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_applications.team_id AND t.leader_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM series s WHERE s.id = team_applications.series_id AND s.organizer_id = auth.uid()
    )
  );

-- 排他制約は015で緩い形で定義済み（両方NULLも許可）

-- ============================================
-- 4. teams RLS 修正（公開設定連動）
-- ============================================

DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;

CREATE POLICY "teams_select" ON teams FOR SELECT USING (
  -- 未所属チーム: リーダーまたはメンバーのみ
  (series_id IS NULL AND tournament_id IS NULL AND (
    leader_id = auth.uid()
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = teams.id AND tm.user_id = auth.uid())
  ))
  OR
  -- シリーズ所属: シリーズが公開 or 主催者 or メンバー
  (series_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM series s WHERE s.id = teams.series_id AND s.visibility = 'public')
    OR EXISTS (SELECT 1 FROM series s WHERE s.id = teams.series_id AND s.organizer_id = auth.uid())
    OR leader_id = auth.uid()
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = teams.id AND tm.user_id = auth.uid())
  ))
  OR
  -- 大会所属: 大会が公開 or 主催者 or メンバー
  (tournament_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM tournaments t WHERE t.id = teams.tournament_id AND t.visibility = 'public')
    OR EXISTS (SELECT 1 FROM tournaments t WHERE t.id = teams.tournament_id AND t.organizer_id = auth.uid())
    OR leader_id = auth.uid()
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = teams.id AND tm.user_id = auth.uid())
  ))
);

-- ============================================
-- 5. team_members RLS 修正（公開設定連動）
-- ============================================

DROP POLICY IF EXISTS "Team members are viewable by everyone" ON team_members;

CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (
  -- 自分自身のメンバーシップ
  user_id = auth.uid()
  OR
  -- チームが見えるなら（teams RLSで制御）
  EXISTS (
    SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND (
      -- 公開シリーズ
      EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.visibility = 'public')
      OR
      -- 公開大会
      EXISTS (SELECT 1 FROM tournaments tr WHERE tr.id = t.tournament_id AND tr.visibility = 'public')
      OR
      -- リーダー or 主催者
      t.leader_id = auth.uid()
      OR EXISTS (SELECT 1 FROM series s WHERE s.id = t.series_id AND s.organizer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM tournaments tr WHERE tr.id = t.tournament_id AND tr.organizer_id = auth.uid())
    )
  )
);
