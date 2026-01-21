-- ============================================
-- 招待制大会 & シリーズポイント機能
-- ============================================

-- ============================================
-- ENUM 型定義
-- ============================================

-- エントリーモード
CREATE TYPE entry_mode AS ENUM ('open', 'invite_only');

-- ポイント計算モード
CREATE TYPE point_calculation_mode AS ENUM ('auto', 'manual');

-- 招待ステータス
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- ============================================
-- tournamentsにentry_mode追加
-- ============================================

ALTER TABLE tournaments
  ADD COLUMN entry_mode entry_mode NOT NULL DEFAULT 'open';

COMMENT ON COLUMN tournaments.entry_mode IS 'open: 誰でもエントリー可, invite_only: 招待されたユーザーのみ';

-- ============================================
-- tournament_invites（大会招待）
-- ============================================

CREATE TABLE tournament_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  invited_by UUID NOT NULL REFERENCES profiles(id),
  status invite_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_tournament_invites_tournament ON tournament_invites(tournament_id);
CREATE INDEX idx_tournament_invites_user ON tournament_invites(user_id);
CREATE INDEX idx_tournament_invites_status ON tournament_invites(status);

COMMENT ON TABLE tournament_invites IS '大会への招待管理';

-- ============================================
-- seriesにpoint_calculation_mode追加
-- ============================================

ALTER TABLE series
  ADD COLUMN point_calculation_mode point_calculation_mode NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN series.point_calculation_mode IS 'auto: 大会完了時に自動計算, manual: 主催者が手動確定';

-- ============================================
-- ポイント計算用関数
-- ============================================

-- 大会完了時にシリーズポイントを計算・記録する関数
CREATE OR REPLACE FUNCTION calculate_series_points(p_tournament_id UUID)
RETURNS void AS $$
DECLARE
  v_series_id UUID;
  v_point_system point_system;
  v_point_config JSONB;
  v_entry_type entry_type;
  r_participant RECORD;
  v_points INTEGER;
  v_placement INTEGER;
BEGIN
  -- 大会が所属するシリーズを取得
  SELECT t.series_id INTO v_series_id
  FROM tournaments t
  WHERE t.id = p_tournament_id;

  -- シリーズに所属していない場合は何もしない
  IF v_series_id IS NULL THEN
    RETURN;
  END IF;

  -- シリーズのポイント設定を取得
  SELECT s.point_system, s.point_config, s.entry_type
  INTO v_point_system, v_point_config, v_entry_type
  FROM series s
  WHERE s.id = v_series_id;

  -- 既存のポイントを削除（再計算のため）
  DELETE FROM series_points
  WHERE series_id = v_series_id AND tournament_id = p_tournament_id;

  -- 個人戦の場合
  IF v_entry_type = 'individual' THEN
    FOR r_participant IN
      SELECT
        p.user_id,
        p.final_placement,
        (SELECT COUNT(*) FROM matches m
         WHERE m.tournament_id = p_tournament_id
         AND m.winner_id = p.user_id
         AND m.status = 'completed') AS wins,
        (SELECT COUNT(*) FROM matches m
         WHERE m.tournament_id = p_tournament_id
         AND (m.player1_id = p.user_id OR m.player2_id = p.user_id)
         AND m.winner_id IS NOT NULL
         AND m.winner_id != p.user_id
         AND m.status = 'completed') AS losses
      FROM participants p
      WHERE p.tournament_id = p_tournament_id
        AND p.final_placement IS NOT NULL
    LOOP
      -- ポイント計算
      IF v_point_system = 'ranking' THEN
        v_points := get_points_for_placement(v_point_config, r_participant.final_placement);
      ELSE -- wins
        v_points := (v_point_config->>'points_per_win')::INTEGER * r_participant.wins;
      END IF;

      -- series_pointsに挿入
      INSERT INTO series_points (
        series_id, tournament_id, user_id,
        points, placement, wins, losses
      ) VALUES (
        v_series_id, p_tournament_id, r_participant.user_id,
        v_points, r_participant.final_placement, r_participant.wins, r_participant.losses
      );
    END LOOP;
  ELSE
    -- チーム戦の場合
    FOR r_participant IN
      SELECT
        te.team_id,
        te.final_placement,
        0 AS wins,  -- TODO: チーム戦の勝敗カウント
        0 AS losses
      FROM team_entries te
      WHERE te.tournament_id = p_tournament_id
        AND te.final_placement IS NOT NULL
    LOOP
      -- ポイント計算
      IF v_point_system = 'ranking' THEN
        v_points := get_points_for_placement(v_point_config, r_participant.final_placement);
      ELSE
        v_points := (v_point_config->>'points_per_win')::INTEGER * r_participant.wins;
      END IF;

      -- series_pointsに挿入
      INSERT INTO series_points (
        series_id, tournament_id, team_id,
        points, placement, wins, losses
      ) VALUES (
        v_series_id, p_tournament_id, r_participant.team_id,
        v_points, r_participant.final_placement, r_participant.wins, r_participant.losses
      );
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 順位からポイントを取得するヘルパー関数
CREATE OR REPLACE FUNCTION get_points_for_placement(p_config JSONB, p_placement INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_key TEXT;
  v_value INTEGER;
  v_range_start INTEGER;
  v_range_end INTEGER;
BEGIN
  -- 完全一致を先にチェック
  IF p_config ? p_placement::TEXT THEN
    RETURN (p_config->>p_placement::TEXT)::INTEGER;
  END IF;

  -- 範囲指定をチェック（例: "5-8": 10）
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_config)
  LOOP
    IF v_key LIKE '%-%' THEN
      v_range_start := split_part(v_key, '-', 1)::INTEGER;
      v_range_end := split_part(v_key, '-', 2)::INTEGER;
      IF p_placement BETWEEN v_range_start AND v_range_end THEN
        RETURN v_value::INTEGER;
      END IF;
    END IF;
  END LOOP;

  -- マッチしない場合は0
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 自動ポイント計算トリガー
-- ============================================

CREATE OR REPLACE FUNCTION trigger_auto_calculate_series_points()
RETURNS TRIGGER AS $$
DECLARE
  v_series_id UUID;
  v_calc_mode point_calculation_mode;
BEGIN
  -- completedに変更された場合のみ
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- シリーズに所属しているか確認
    SELECT t.series_id INTO v_series_id
    FROM tournaments t
    WHERE t.id = NEW.id;

    IF v_series_id IS NOT NULL THEN
      -- シリーズのポイント計算モードを確認
      SELECT s.point_calculation_mode INTO v_calc_mode
      FROM series s
      WHERE s.id = v_series_id;

      -- 自動計算モードの場合のみ実行
      IF v_calc_mode = 'auto' THEN
        PERFORM calculate_series_points(NEW.id);
      END IF;
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
-- Row Level Security (RLS) ポリシー
-- ============================================

-- --------------------------------------------
-- tournament_invites
-- --------------------------------------------
ALTER TABLE tournament_invites ENABLE ROW LEVEL SECURITY;

-- 招待は関係者が閲覧可能
CREATE POLICY "Invites viewable by involved users"
  ON tournament_invites FOR SELECT
  USING (
    user_id = auth.uid() OR
    invited_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- 主催者のみ招待可能
CREATE POLICY "Organizers can create invites"
  ON tournament_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- 招待されたユーザーは応答可能（ステータス更新）
CREATE POLICY "Invited users can respond"
  ON tournament_invites FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 主催者は招待を削除可能
CREATE POLICY "Organizers can delete invites"
  ON tournament_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );
