# データベース設計

## 概要

- DBMS: PostgreSQL (Supabase)
- 認証: Supabase Auth
- リアルタイム: Supabase Realtime

## Phase区分

本ドキュメントは将来の理想設計を含みます。現在のマイグレーション状況との対応を以下に示します。

| Phase | 状態 | 含まれる機能 |
|-------|------|-------------|
| **Phase 1** | 実装済み | 基本的な大会運営（シングルエリミ、個人戦、主催者による結果入力） |
| **Phase 2** | 未実装 | チェックイン、デッキ登録、カスタムフィールド、チーム招待通知 |

### 実装との乖離（Phase 2として予定）

以下の項目はドキュメントに記載されていますが、現在のマイグレーションには未実装です：

- `tournament_status` ENUM: `check_in` ステータス
- `notification_type` ENUM: `check_in_reminder`, `team_invite`
- `tournaments` テーブル: `check_in_enabled`, `check_in_start_at`, `check_in_deadline`, `deck_registration_mode`, `swiss_rounds`
- `custom_fields`, `custom_answers` テーブル（現在は`tournaments.custom_fields` JSONBで簡易実装）

## ER図（概要）

```
┌─────────┐     ┌─────────────┐     ┌─────────┐
│  users  │────<│participants │>────│tournaments│
└─────────┘     └─────────────┘     └─────────┘
     │                                    │
     │          ┌─────────┐              │
     └─────────<│ matches │>─────────────┘
                └─────────┘
                     │
              ┌──────┴──────┐
              │             │
        ┌─────────┐  ┌─────────────┐
        │  decks  │  │match_decks  │
        └─────────┘  └─────────────┘

┌─────────┐     ┌─────────────┐     ┌─────────┐
│  teams  │────<│team_members │>────│  users  │
└─────────┘     └─────────────┘     └─────────┘
     │
     └─────────<│team_entries │>────│tournaments│

┌─────────┐     ┌─────────────┐
│ series  │────<│ tournaments │
└─────────┘     └─────────────┘
```

---

## テーブル定義

### 1. profiles（ユーザープロフィール）

Supabase Auth の `auth.users` と連携するプロフィールテーブル

```sql
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
```

---

### 2. series（シリーズ/リーグ）

```sql
CREATE TYPE series_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE entry_type AS ENUM ('individual', 'team');
CREATE TYPE point_system AS ENUM ('ranking', 'wins');

CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  organizer_id UUID NOT NULL REFERENCES profiles(id),
  entry_type entry_type NOT NULL DEFAULT 'individual',
  point_system point_system NOT NULL DEFAULT 'ranking',
  point_config JSONB NOT NULL DEFAULT '{}',
  -- point_config例:
  -- ranking: {"1": 100, "2": 70, "3": 50, "4": 30, "5-8": 10}
  -- wins: {"points_per_win": 10, "points_per_loss": 0}
  start_date DATE,
  end_date DATE,
  status series_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_series_organizer ON series(organizer_id);
CREATE INDEX idx_series_status ON series(status);
CREATE INDEX idx_series_dates ON series(start_date, end_date);
```

---

### 3. tournaments（大会）

```sql
CREATE TYPE tournament_status AS ENUM (
  'draft',        -- 下書き
  'published',    -- 公開（エントリー受付前）
  'recruiting',   -- エントリー受付中
  'check_in',     -- チェックイン中
  'in_progress',  -- 開催中
  'completed',    -- 終了
  'cancelled'     -- キャンセル
);

CREATE TYPE tournament_format AS ENUM (
  'single_elimination',
  'double_elimination',
  'swiss',
  'round_robin'
);

CREATE TYPE match_format AS ENUM ('bo1', 'bo3', 'bo5');
CREATE TYPE visibility AS ENUM ('public', 'unlisted', 'private');
CREATE TYPE result_report_mode AS ENUM ('organizer_only', 'participant');
CREATE TYPE deck_registration_mode AS ENUM ('none', 'entry', 'per_match', 'both');
CREATE TYPE team_battle_format AS ENUM ('knockout', 'point');
CREATE TYPE team_creation_mode AS ENUM ('user', 'organizer');

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報
  title VARCHAR(100) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  organizer_id UUID NOT NULL REFERENCES profiles(id),

  -- シリーズ関連
  series_id UUID REFERENCES series(id) ON DELETE SET NULL,

  -- 公開設定
  visibility visibility NOT NULL DEFAULT 'public',
  status tournament_status NOT NULL DEFAULT 'draft',

  -- 参加形式
  entry_type entry_type NOT NULL DEFAULT 'individual',
  team_battle_format team_battle_format,  -- チーム戦時のみ
  team_size_min SMALLINT,                 -- チーム戦時のみ
  team_size_max SMALLINT,                 -- チーム戦時のみ
  team_creation_mode team_creation_mode,  -- チーム戦時のみ

  -- トーナメント設定
  tournament_format tournament_format NOT NULL DEFAULT 'single_elimination',
  match_format match_format NOT NULL DEFAULT 'bo3',
  max_participants SMALLINT NOT NULL DEFAULT 32,
  swiss_rounds SMALLINT,  -- スイスドロー時のラウンド数

  -- エントリー設定
  entry_start_at TIMESTAMPTZ,
  entry_deadline TIMESTAMPTZ,

  -- チェックイン設定
  check_in_enabled BOOLEAN NOT NULL DEFAULT false,
  check_in_start_at TIMESTAMPTZ,
  check_in_deadline TIMESTAMPTZ,

  -- 結果報告設定
  result_report_mode result_report_mode NOT NULL DEFAULT 'organizer_only',

  -- デッキ登録設定
  deck_registration_mode deck_registration_mode NOT NULL DEFAULT 'none',

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
CREATE INDEX idx_tournaments_series ON tournaments(series_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_visibility_status ON tournaments(visibility, status);
CREATE INDEX idx_tournaments_start_at ON tournaments(start_at);
CREATE INDEX idx_tournaments_entry_deadline ON tournaments(entry_deadline);

-- 制約
ALTER TABLE tournaments ADD CONSTRAINT chk_team_settings
  CHECK (
    (entry_type = 'individual') OR
    (entry_type = 'team' AND team_battle_format IS NOT NULL
     AND team_size_min IS NOT NULL AND team_size_max IS NOT NULL)
  );
```

---

### 4. participants（個人戦参加者）

```sql
CREATE TYPE check_in_status AS ENUM ('pending', 'checked_in', 'no_show');

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- エントリー情報
  entry_number SERIAL,
  master_duel_id VARCHAR(20),

  -- チェックイン
  check_in_status check_in_status NOT NULL DEFAULT 'pending',
  checked_in_at TIMESTAMPTZ,

  -- シード
  seed SMALLINT,

  -- 結果
  final_placement SMALLINT,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_participants_tournament ON participants(tournament_id);
CREATE INDEX idx_participants_user ON participants(user_id);
CREATE INDEX idx_participants_seed ON participants(tournament_id, seed);
```

---

### 5. teams（チーム）

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  leader_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_leader ON teams(leader_id);
CREATE INDEX idx_teams_name ON teams(name);
```

---

### 6. team_members（チームメンバー）

```sql
CREATE TYPE team_role AS ENUM ('leader', 'member');

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
```

---

### 7. team_invites（チーム招待）

```sql
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invite_token VARCHAR(32) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses SMALLINT DEFAULT 1,
  use_count SMALLINT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_invites_token ON team_invites(invite_token);
CREATE INDEX idx_team_invites_team ON team_invites(team_id);
```

---

### 8. team_entries（チーム戦エントリー）

```sql
CREATE TABLE team_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),

  entry_number SERIAL,
  check_in_status check_in_status NOT NULL DEFAULT 'pending',
  checked_in_at TIMESTAMPTZ,
  seed SMALLINT,
  final_placement SMALLINT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tournament_id, team_id)
);

CREATE INDEX idx_team_entries_tournament ON team_entries(tournament_id);
CREATE INDEX idx_team_entries_team ON team_entries(team_id);
```

---

### 9. team_rosters（出場メンバー）

```sql
CREATE TABLE team_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_entry_id UUID NOT NULL REFERENCES team_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  play_order SMALLINT NOT NULL,  -- 出場順（勝ち抜き戦用）

  UNIQUE(team_entry_id, user_id),
  UNIQUE(team_entry_id, play_order)
);

CREATE INDEX idx_team_rosters_entry ON team_rosters(team_entry_id);
```

---

### 10. matches（対戦）

```sql
CREATE TYPE match_status AS ENUM ('pending', 'in_progress', 'completed', 'bye');
CREATE TYPE bracket_side AS ENUM ('winners', 'losers', 'grand_final');

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

  -- ラウンド情報
  round SMALLINT NOT NULL,
  match_number SMALLINT NOT NULL,
  bracket_side bracket_side,  -- ダブルエリミ用

  -- 対戦者（個人戦）
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),

  -- 対戦チーム（チーム戦）
  team1_id UUID REFERENCES teams(id),
  team2_id UUID REFERENCES teams(id),

  -- スコア
  player1_score SMALLINT DEFAULT 0,
  player2_score SMALLINT DEFAULT 0,

  -- 結果
  winner_id UUID,  -- player/team のID
  status match_status NOT NULL DEFAULT 'pending',

  -- 次の試合への参照
  next_match_id UUID REFERENCES matches(id),
  next_match_slot SMALLINT,  -- 1 or 2

  -- タイムスタンプ
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tournament_id, round, match_number, bracket_side)
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_tournament_round ON matches(tournament_id, round);
CREATE INDEX idx_matches_player1 ON matches(player1_id);
CREATE INDEX idx_matches_player2 ON matches(player2_id);
CREATE INDEX idx_matches_team1 ON matches(team1_id);
CREATE INDEX idx_matches_team2 ON matches(team2_id);
CREATE INDEX idx_matches_status ON matches(status);
```

---

### 11. individual_matches（チーム戦内の個人戦）

```sql
CREATE TABLE individual_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,

  play_order SMALLINT NOT NULL,  -- 対戦順
  player1_id UUID NOT NULL REFERENCES profiles(id),
  player2_id UUID NOT NULL REFERENCES profiles(id),

  player1_score SMALLINT DEFAULT 0,
  player2_score SMALLINT DEFAULT 0,
  winner_id UUID REFERENCES profiles(id),
  status match_status NOT NULL DEFAULT 'pending',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(match_id, play_order)
);

CREATE INDEX idx_individual_matches_match ON individual_matches(match_id);
```

---

### 12. match_reports（結果報告）

```sql
CREATE TABLE match_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id),

  claimed_winner_id UUID NOT NULL,
  claimed_player1_score SMALLINT NOT NULL,
  claimed_player2_score SMALLINT NOT NULL,

  screenshot_url TEXT,
  note TEXT,

  -- 承認状態
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_by UUID REFERENCES profiles(id),
  confirmed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_reports_match ON match_reports(match_id);
CREATE INDEX idx_match_reports_reporter ON match_reports(reporter_id);
```

---

### 13. decks（デッキマスタ）

```sql
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 所属（どちらか一方）
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,

  name VARCHAR(50) NOT NULL,
  icon_url TEXT,
  category VARCHAR(30),
  sort_order SMALLINT DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 大会かシリーズのどちらかに必ず所属
  CONSTRAINT chk_deck_belongs CHECK (
    (tournament_id IS NOT NULL AND series_id IS NULL) OR
    (tournament_id IS NULL AND series_id IS NOT NULL)
  )
);

CREATE INDEX idx_decks_tournament ON decks(tournament_id);
CREATE INDEX idx_decks_series ON decks(series_id);
```

---

### 14. participant_decks（エントリー時デッキ登録）

```sql
CREATE TABLE participant_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES decks(id),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(participant_id, deck_id)
);

CREATE INDEX idx_participant_decks_participant ON participant_decks(participant_id);
```

---

### 15. match_decks（対戦時デッキ記録）

```sql
CREATE TABLE match_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 対戦（チーム戦の場合はindividual_match）
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  individual_match_id UUID REFERENCES individual_matches(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES profiles(id),
  deck_id UUID NOT NULL REFERENCES decks(id),
  is_winner BOOLEAN,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- どちらかのmatch_idは必須
  CONSTRAINT chk_match_reference CHECK (
    (match_id IS NOT NULL AND individual_match_id IS NULL) OR
    (match_id IS NULL AND individual_match_id IS NOT NULL)
  )
);

CREATE INDEX idx_match_decks_match ON match_decks(match_id);
CREATE INDEX idx_match_decks_individual ON match_decks(individual_match_id);
CREATE INDEX idx_match_decks_deck ON match_decks(deck_id);
CREATE INDEX idx_match_decks_user ON match_decks(user_id);
```

---

### 16. series_points（シリーズポイント）

```sql
CREATE TABLE series_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

  -- 個人またはチーム
  user_id UUID REFERENCES profiles(id),
  team_id UUID REFERENCES teams(id),

  points INTEGER NOT NULL DEFAULT 0,
  placement SMALLINT,
  wins SMALLINT DEFAULT 0,
  losses SMALLINT DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 個人かチームのどちらか
  CONSTRAINT chk_point_target CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR
    (user_id IS NULL AND team_id IS NOT NULL)
  ),

  UNIQUE(series_id, tournament_id, user_id),
  UNIQUE(series_id, tournament_id, team_id)
);

CREATE INDEX idx_series_points_series ON series_points(series_id);
CREATE INDEX idx_series_points_user ON series_points(user_id);
CREATE INDEX idx_series_points_team ON series_points(team_id);
```

---

### 17. notifications（通知）

```sql
CREATE TYPE notification_type AS ENUM (
  'match_ready',       -- 対戦開始
  'match_result',      -- 結果確定
  'tournament_start',  -- 大会開始
  'check_in_reminder', -- チェックインリマインダー
  'team_invite',       -- チーム招待
  'report_needed'      -- 結果報告依頼
);

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

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

---

### 18. custom_fields（カスタム入力項目）※Phase 2

```sql
CREATE TYPE field_type AS ENUM ('text', 'number', 'select', 'checkbox');

CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

  label VARCHAR(50) NOT NULL,
  field_type field_type NOT NULL,
  options JSONB,  -- selectの場合の選択肢
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order SMALLINT DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_fields_tournament ON custom_fields(tournament_id);
```

---

### 19. custom_answers（カスタム項目回答）※Phase 2

```sql
CREATE TABLE custom_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(participant_id, field_id)
);

CREATE INDEX idx_custom_answers_participant ON custom_answers(participant_id);
```

---

## 共通関数

```sql
-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガー適用
CREATE TRIGGER update_series_updated_at
  BEFORE UPDATE ON series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Row Level Security (RLS) ポリシー

### profiles

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- 自分のプロフィールのみ更新可能
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### tournaments

```sql
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- 公開大会は誰でも閲覧
CREATE POLICY "Public tournaments are viewable"
  ON tournaments FOR SELECT
  USING (visibility = 'public' OR organizer_id = auth.uid());

-- 主催者のみ作成・更新可能
CREATE POLICY "Organizers can create tournaments"
  ON tournaments FOR INSERT
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update own tournaments"
  ON tournaments FOR UPDATE
  USING (organizer_id = auth.uid());
```

### participants

```sql
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- 大会参加者は閲覧可能
CREATE POLICY "Participants viewable by tournament members"
  ON participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id
      AND (t.visibility = 'public' OR t.organizer_id = auth.uid())
    )
  );

-- 自分のエントリーのみ作成・削除可能
CREATE POLICY "Users can enter tournaments"
  ON participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can withdraw from tournaments"
  ON participants FOR DELETE
  USING (user_id = auth.uid());
```

### teams

```sql
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- チームは誰でも閲覧可能
CREATE POLICY "Teams are viewable by everyone"
  ON teams FOR SELECT
  USING (true);

-- ログインユーザーは作成可能
CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND leader_id = auth.uid());

-- リーダーのみ更新・削除可能
CREATE POLICY "Leaders can update teams"
  ON teams FOR UPDATE
  USING (leader_id = auth.uid());

CREATE POLICY "Leaders can delete teams"
  ON teams FOR DELETE
  USING (leader_id = auth.uid());
```

### matches

```sql
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- 大会の試合は参加者・主催者が閲覧可能
CREATE POLICY "Matches viewable by tournament members"
  ON matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id
      AND (t.visibility = 'public' OR t.organizer_id = auth.uid())
    )
  );

-- 主催者のみ更新可能
CREATE POLICY "Organizers can update matches"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );
```

### notifications

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 自分の通知のみ閲覧・更新可能
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());
```

---

## Realtime設定

```sql
-- リアルタイム購読を有効にするテーブル
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE individual_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE team_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

## ビュー（統計用）

### デッキ統計ビュー

```sql
CREATE VIEW deck_stats AS
SELECT
  d.id AS deck_id,
  d.name AS deck_name,
  d.tournament_id,
  d.series_id,
  COUNT(md.id) AS usage_count,
  COUNT(CASE WHEN md.is_winner = true THEN 1 END) AS win_count,
  COUNT(CASE WHEN md.is_winner = false THEN 1 END) AS loss_count,
  CASE
    WHEN COUNT(md.id) > 0
    THEN ROUND(COUNT(CASE WHEN md.is_winner = true THEN 1 END)::NUMERIC / COUNT(md.id) * 100, 2)
    ELSE 0
  END AS win_rate
FROM decks d
LEFT JOIN match_decks md ON md.deck_id = d.id
GROUP BY d.id, d.name, d.tournament_id, d.series_id;
```

### シリーズランキングビュー

```sql
CREATE VIEW series_rankings AS
SELECT
  sp.series_id,
  sp.user_id,
  sp.team_id,
  COALESCE(p.display_name, t.name) AS name,
  SUM(sp.points) AS total_points,
  COUNT(sp.tournament_id) AS tournaments_played,
  SUM(sp.wins) AS total_wins,
  SUM(sp.losses) AS total_losses,
  RANK() OVER (PARTITION BY sp.series_id ORDER BY SUM(sp.points) DESC) AS rank
FROM series_points sp
LEFT JOIN profiles p ON p.id = sp.user_id
LEFT JOIN teams t ON t.id = sp.team_id
GROUP BY sp.series_id, sp.user_id, sp.team_id, p.display_name, t.name;
```

---

## マイグレーション順序

1. 共通関数・ENUM型
2. profiles
3. series
4. tournaments
5. teams
6. team_members
7. team_invites
8. participants
9. team_entries
10. team_rosters
11. matches
12. individual_matches
13. match_reports
14. decks
15. participant_decks
16. match_decks
17. series_points
18. notifications
19. custom_fields (Phase 2)
20. custom_answers (Phase 2)
21. RLSポリシー
22. ビュー
23. Realtime設定
