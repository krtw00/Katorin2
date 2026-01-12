-- ============================================
-- Katorin2 MVP Database Schema
-- Phase 1: Basic tournament management
-- ============================================

-- ============================================
-- 共通関数
-- ============================================

-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ENUM 型定義
-- ============================================

-- トーナメントステータス
CREATE TYPE tournament_status AS ENUM (
  'draft',        -- 下書き
  'published',    -- 公開（エントリー受付前）
  'recruiting',   -- エントリー受付中
  'in_progress',  -- 開催中
  'completed',    -- 終了
  'cancelled'     -- キャンセル
);

-- トーナメント形式（MVP: single_eliminationのみ使用）
CREATE TYPE tournament_format AS ENUM (
  'single_elimination',
  'double_elimination',
  'swiss',
  'round_robin'
);

-- 対戦形式
CREATE TYPE match_format AS ENUM ('bo1', 'bo3', 'bo5');

-- 公開設定
CREATE TYPE visibility AS ENUM ('public', 'unlisted', 'private');

-- 参加形式（MVP: individualのみ）
CREATE TYPE entry_type AS ENUM ('individual', 'team');

-- 結果報告モード（MVP: organizer_onlyのみ）
CREATE TYPE result_report_mode AS ENUM ('organizer_only', 'participant');

-- 試合ステータス
CREATE TYPE match_status AS ENUM ('pending', 'in_progress', 'completed', 'bye');

-- 通知タイプ
CREATE TYPE notification_type AS ENUM (
  'match_ready',       -- 対戦開始
  'match_result',      -- 結果確定
  'tournament_start',  -- 大会開始
  'report_needed'      -- 結果報告依頼
);

-- ============================================
-- テーブル定義
-- ============================================

-- --------------------------------------------
-- 1. profiles（ユーザープロフィール）
-- --------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  master_duel_id VARCHAR(20),
  discord_id VARCHAR(30),
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_profiles_display_name ON profiles(display_name);
CREATE INDEX idx_profiles_master_duel_id ON profiles(master_duel_id);

-- 更新時タイムスタンプ自動更新
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- 2. tournaments（大会）
-- --------------------------------------------
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報
  title VARCHAR(100) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  organizer_id UUID NOT NULL REFERENCES profiles(id),

  -- 公開設定
  visibility visibility NOT NULL DEFAULT 'public',
  status tournament_status NOT NULL DEFAULT 'draft',

  -- 参加形式（MVP: individualのみ）
  entry_type entry_type NOT NULL DEFAULT 'individual',

  -- トーナメント設定
  tournament_format tournament_format NOT NULL DEFAULT 'single_elimination',
  match_format match_format NOT NULL DEFAULT 'bo3',
  max_participants SMALLINT NOT NULL DEFAULT 32,

  -- エントリー設定
  entry_start_at TIMESTAMPTZ,
  entry_deadline TIMESTAMPTZ,

  -- 結果報告設定（MVP: organizer_onlyのみ）
  result_report_mode result_report_mode NOT NULL DEFAULT 'organizer_only',

  -- 開催日時
  start_at TIMESTAMPTZ,

  -- 進行状態
  current_round SMALLINT DEFAULT 0,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_tournaments_organizer ON tournaments(organizer_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_visibility_status ON tournaments(visibility, status);
CREATE INDEX idx_tournaments_start_at ON tournaments(start_at);
CREATE INDEX idx_tournaments_entry_deadline ON tournaments(entry_deadline);

-- 更新時タイムスタンプ自動更新
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- 3. participants（個人戦参加者）
-- --------------------------------------------
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- エントリー情報
  entry_number SERIAL,
  master_duel_id VARCHAR(20),

  -- シード
  seed SMALLINT,

  -- 結果
  final_placement SMALLINT,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tournament_id, user_id)
);

-- インデックス
CREATE INDEX idx_participants_tournament ON participants(tournament_id);
CREATE INDEX idx_participants_user ON participants(user_id);
CREATE INDEX idx_participants_seed ON participants(tournament_id, seed);

-- --------------------------------------------
-- 4. matches（対戦）
-- --------------------------------------------
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

  -- ラウンド情報
  round SMALLINT NOT NULL,
  match_number SMALLINT NOT NULL,

  -- 対戦者（個人戦）
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),

  -- スコア
  player1_score SMALLINT DEFAULT 0,
  player2_score SMALLINT DEFAULT 0,

  -- 結果
  winner_id UUID REFERENCES profiles(id),
  status match_status NOT NULL DEFAULT 'pending',

  -- 次の試合への参照
  next_match_id UUID REFERENCES matches(id),
  next_match_slot SMALLINT,  -- 1 or 2 (winner goes to slot N of next match)

  -- タイムスタンプ
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tournament_id, round, match_number)
);

-- インデックス
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_tournament_round ON matches(tournament_id, round);
CREATE INDEX idx_matches_player1 ON matches(player1_id);
CREATE INDEX idx_matches_player2 ON matches(player2_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_next_match ON matches(next_match_id);

-- --------------------------------------------
-- 5. notifications（通知）
-- --------------------------------------------
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(100) NOT NULL,
  body TEXT,
  data JSONB,  -- 関連データ（tournament_id, match_id等）
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- Row Level Security (RLS) ポリシー
-- ============================================

-- --------------------------------------------
-- profiles
-- --------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- 自分のプロフィールのみ作成可能（初回登録時）
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 自分のプロフィールのみ更新可能
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- --------------------------------------------
-- tournaments
-- --------------------------------------------
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- 公開大会は誰でも閲覧、非公開は主催者のみ
CREATE POLICY "Public tournaments are viewable"
  ON tournaments FOR SELECT
  USING (visibility = 'public' OR organizer_id = auth.uid());

-- ログインユーザーは大会を作成可能
CREATE POLICY "Authenticated users can create tournaments"
  ON tournaments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND organizer_id = auth.uid());

-- 主催者のみ更新可能
CREATE POLICY "Organizers can update own tournaments"
  ON tournaments FOR UPDATE
  USING (organizer_id = auth.uid());

-- 主催者のみ削除可能
CREATE POLICY "Organizers can delete own tournaments"
  ON tournaments FOR DELETE
  USING (organizer_id = auth.uid());

-- --------------------------------------------
-- participants
-- --------------------------------------------
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- 公開大会の参加者は誰でも閲覧可能
CREATE POLICY "Participants viewable by everyone for public tournaments"
  ON participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id
      AND (t.visibility = 'public' OR t.organizer_id = auth.uid())
    )
  );

-- ログインユーザーは自分のエントリーを作成可能
CREATE POLICY "Users can enter tournaments"
  ON participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 自分のエントリーまたは主催者は削除可能
CREATE POLICY "Users can withdraw or organizers can remove"
  ON participants FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- 主催者はシード等を更新可能
CREATE POLICY "Organizers can update participants"
  ON participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- --------------------------------------------
-- matches
-- --------------------------------------------
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- 公開大会の試合は誰でも閲覧可能
CREATE POLICY "Matches viewable by everyone for public tournaments"
  ON matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id
      AND (t.visibility = 'public' OR t.organizer_id = auth.uid())
    )
  );

-- 主催者のみ試合を作成可能（ブラケット生成時）
CREATE POLICY "Organizers can create matches"
  ON matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- 主催者のみ試合結果を更新可能
CREATE POLICY "Organizers can update matches"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- 主催者のみ試合を削除可能
CREATE POLICY "Organizers can delete matches"
  ON matches FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- --------------------------------------------
-- notifications
-- --------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 自分の通知のみ閲覧可能
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- 自分の通知のみ更新可能（既読にする等）
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- システムが通知を作成（主催者が関数経由で作成することも想定）
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Realtime設定
-- ============================================

-- リアルタイム購読を有効にするテーブル
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
