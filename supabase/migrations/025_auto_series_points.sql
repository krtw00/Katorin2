-- ============================================
-- 025: シリーズ自動ポイント計算機能
-- 大会(tournament)完了時に block_standings から
-- series_config.scoring を用いてポイントを自動計算
-- ============================================

-- ============================================
-- 1. series_points テーブル再作成
-- ============================================

CREATE TABLE series_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- ポイント情報
  points INTEGER NOT NULL DEFAULT 0,
  wins SMALLINT NOT NULL DEFAULT 0,
  losses SMALLINT NOT NULL DEFAULT 0,
  round_diff INTEGER NOT NULL DEFAULT 0,
  match_diff INTEGER NOT NULL DEFAULT 0,
  total_rounds_won INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 重複防止
  UNIQUE(series_id, tournament_id, team_id)
);

CREATE INDEX idx_series_points_series ON series_points(series_id);
CREATE INDEX idx_series_points_tournament ON series_points(tournament_id);
CREATE INDEX idx_series_points_team ON series_points(team_id);

-- 更新時タイムスタンプ
CREATE TRIGGER update_series_points_updated_at
  BEFORE UPDATE ON series_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. RLS
-- ============================================

ALTER TABLE series_points ENABLE ROW LEVEL SECURITY;

-- 公開シリーズのポイントは誰でも閲覧可能
CREATE POLICY "series_points_select" ON series_points
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM series s
      WHERE s.id = series_points.series_id
        AND (s.visibility = 'public' OR s.organizer_id = auth.uid())
    )
  );

-- 主催者のみ管理可能
CREATE POLICY "series_points_insert" ON series_points
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM series s
      WHERE s.id = series_id AND s.organizer_id = auth.uid()
    )
  );

CREATE POLICY "series_points_update" ON series_points
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM series s
      WHERE s.id = series_points.series_id AND s.organizer_id = auth.uid()
    )
  );

CREATE POLICY "series_points_delete" ON series_points
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM series s
      WHERE s.id = series_points.series_id AND s.organizer_id = auth.uid()
    )
  );

-- ============================================
-- 3. ポイント計算関数
-- block_standings + series_config.scoring を使用
-- ============================================

CREATE OR REPLACE FUNCTION calculate_series_points(p_tournament_id UUID)
RETURNS void AS $$
DECLARE
  v_series_id UUID;
  v_win_points INTEGER;
  v_loss_points INTEGER;
  r_standing RECORD;
BEGIN
  -- 大会のシリーズを取得
  SELECT t.series_id INTO v_series_id
  FROM tournaments t
  WHERE t.id = p_tournament_id;

  IF v_series_id IS NULL THEN
    RETURN;
  END IF;

  -- series_config.scoring からポイント設定を取得
  SELECT
    COALESCE((s.series_config->'scoring'->>'winPoints')::INTEGER, 3),
    COALESCE((s.series_config->'scoring'->>'lossPoints')::INTEGER, 0)
  INTO v_win_points, v_loss_points
  FROM series s
  WHERE s.id = v_series_id;

  -- 既存のポイントを削除（再計算）
  DELETE FROM series_points
  WHERE series_id = v_series_id AND tournament_id = p_tournament_id;

  -- block_standings から集計して挿入
  FOR r_standing IN
    SELECT
      bs.team_id,
      bs.wins,
      bs.losses,
      bs.round_diff,
      bs.match_diff,
      bs.total_rounds_won
    FROM block_standings bs
    WHERE bs.tournament_id = p_tournament_id
  LOOP
    INSERT INTO series_points (
      series_id, tournament_id, team_id,
      points, wins, losses,
      round_diff, match_diff, total_rounds_won
    ) VALUES (
      v_series_id,
      p_tournament_id,
      r_standing.team_id,
      (r_standing.wins * v_win_points) + (r_standing.losses * v_loss_points),
      r_standing.wins,
      r_standing.losses,
      r_standing.round_diff,
      r_standing.match_diff,
      r_standing.total_rounds_won
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 自動計算トリガー
-- tournaments.status が 'completed' に変更されたとき発火
-- ============================================

CREATE OR REPLACE FUNCTION trigger_auto_calculate_series_points()
RETURNS TRIGGER AS $$
BEGIN
  -- completedに変更された場合のみ
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- シリーズに所属している場合のみ
    IF NEW.series_id IS NOT NULL THEN
      PERFORM calculate_series_points(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tournament_completed_auto_points
  AFTER UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_calculate_series_points();

-- ============================================
-- 5. Realtime
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE series_points;
