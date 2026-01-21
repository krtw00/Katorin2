-- ============================================
-- チーム戦ポイント計算機能
-- ============================================

-- ============================================
-- matchesにwinner_team_id追加
-- ============================================

ALTER TABLE matches
  ADD COLUMN winner_team_id UUID REFERENCES teams(id);

CREATE INDEX idx_matches_winner_team ON matches(winner_team_id);

COMMENT ON COLUMN matches.winner_team_id IS 'チーム戦での勝利チーム';

-- ============================================
-- ポイント計算関数の更新（チーム戦対応）
-- ============================================

-- 大会完了時にシリーズポイントを計算・記録する関数（更新版）
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
        -- チームの勝利数：winner_team_idがこのチームの試合数
        (SELECT COUNT(*) FROM matches m
         WHERE m.tournament_id = p_tournament_id
         AND m.winner_team_id = te.team_id
         AND m.status = 'completed') AS wins,
        -- チームの敗北数：参加した試合のうち、相手チームが勝った試合数
        (SELECT COUNT(*) FROM matches m
         WHERE m.tournament_id = p_tournament_id
         AND (m.team1_id = te.team_id OR m.team2_id = te.team_id)
         AND m.winner_team_id IS NOT NULL
         AND m.winner_team_id != te.team_id
         AND m.status = 'completed') AS losses
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

-- ============================================
-- チーム戦の勝者を自動設定するトリガー
-- ============================================

-- individual_matchesの結果から勝利チームを判定する関数
CREATE OR REPLACE FUNCTION determine_match_winner_team(p_match_id UUID)
RETURNS UUID AS $$
DECLARE
  v_team1_id UUID;
  v_team2_id UUID;
  v_team1_wins INTEGER;
  v_team2_wins INTEGER;
  v_required_wins INTEGER;
BEGIN
  -- マッチのチーム情報を取得
  SELECT team1_id, team2_id INTO v_team1_id, v_team2_id
  FROM matches
  WHERE id = p_match_id;

  -- チーム戦でない場合はNULL
  IF v_team1_id IS NULL OR v_team2_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 各チームの勝利数をカウント
  -- team1のプレイヤー（player1_id）が勝った数
  SELECT COUNT(*) INTO v_team1_wins
  FROM individual_matches im
  WHERE im.match_id = p_match_id
    AND im.winner_id = im.player1_id
    AND im.status = 'completed';

  -- team2のプレイヤー（player2_id）が勝った数
  SELECT COUNT(*) INTO v_team2_wins
  FROM individual_matches im
  WHERE im.match_id = p_match_id
    AND im.winner_id = im.player2_id
    AND im.status = 'completed';

  -- 勝者判定（過半数を取ったチームが勝利）
  SELECT CEILING((SELECT COUNT(*) FROM individual_matches WHERE match_id = p_match_id)::DECIMAL / 2)
  INTO v_required_wins;

  IF v_team1_wins >= v_required_wins THEN
    RETURN v_team1_id;
  ELSIF v_team2_wins >= v_required_wins THEN
    RETURN v_team2_id;
  ELSE
    RETURN NULL; -- まだ決着がついていない
  END IF;
END;
$$ LANGUAGE plpgsql;

-- individual_matchが更新されたときにmatchのwinner_team_idを更新するトリガー
CREATE OR REPLACE FUNCTION trigger_update_match_winner_team()
RETURNS TRIGGER AS $$
DECLARE
  v_winner_team_id UUID;
BEGIN
  -- individual_matchが完了した場合のみ
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- 勝利チームを判定
    v_winner_team_id := determine_match_winner_team(NEW.match_id);

    -- 勝利チームが決まった場合、matchを更新
    IF v_winner_team_id IS NOT NULL THEN
      UPDATE matches
      SET winner_team_id = v_winner_team_id,
          status = 'completed',
          completed_at = NOW()
      WHERE id = NEW.match_id
        AND winner_team_id IS NULL;  -- まだ決着がついていない場合のみ更新
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER individual_match_completed
  AFTER UPDATE ON individual_matches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_match_winner_team();

-- INSERT時も対応（直接completedで挿入される場合）
CREATE TRIGGER individual_match_inserted
  AFTER INSERT ON individual_matches
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION trigger_update_match_winner_team();

-- ============================================
-- コメント追加
-- ============================================

COMMENT ON FUNCTION determine_match_winner_team(UUID) IS 'individual_matchesの結果から勝利チームを判定';
COMMENT ON FUNCTION trigger_update_match_winner_team() IS 'individual_match完了時にmatchのwinner_team_idを自動更新';
