# Katorin2 データモデル再設計: Series/Tournament 分離

## 概要
- **目的**: 「シリーズ（複数大会の集合）」と「大会（単発イベント）」を正しくモデリングし、オーダー管理者UIを整備する
- **スコープ**: DBスキーマ変更、オーダーUI改修、既存データ全削除→新デモデータ投入
- **前提条件**: 現行データは破棄してよい（デモデータ再構築前提）

## 用語定義（ルールブック準拠）

| 用語 | 意味 | DB上の対応 |
|------|------|---------|
| **シリーズ** | 複数節にまたがる長期イベント（WMGP Season 8、ロケットカップ Ver.J） | `series` |
| **大会 (Tournament)** | シリーズ内の1節、または単発イベント（将軍CS第509回） | `tournaments` |
| **War** | 1チーム対1チームの試合全体 | `matches` |
| **ラウンド (Round)** | War内の3対3の星取戦1セット（最大3ラウンド） | `war_rounds` |
| **マッチ戦** | ラウンド内の個人1対1（BO3 or BO1） | `individual_matches` |
| **オーダー** | Warに臨む出場選手+デッキの組み合わせ | `war_orders` |

## 要件

### 機能要件
- シリーズ（WMGP、ロケットカップ等）を独立エンティティとして管理できる
- 単発大会（将軍CS等）はシリーズなしで作成できる
- チームはシリーズ所属 or 単発大会所属（排他）
- シリーズごとにルール設定（得点計算、オーダー構成、Ban&Pick等）を柔軟に変更できる
- 管理者が両チーム分のオーダーを一画面で入力できる
- チームリーダーも自チームのオーダーを入力できる（現行維持）

### 非機能要件
- 既存のRLS設計パターンを踏襲
- マイグレーションは新規ファイルで対応（既存データ全削除前提）

## 設計

### データモデル

```
series (任意)
  ├── series_config (JSONB: ルール設定)
  ├── teams (シリーズ所属チーム)
  │     └── team_members
  ├── tournament_blocks (ブロック分け、シリーズ単位)
  └── tournaments (各節/ラウンド, round_number で順序管理)
        └── matches (War)
              ├── war_orders (オーダー)
              ├── war_rounds (ラウンド: 3対3星取戦)
              │     └── individual_matches (個人マッチ)
              └── (Ban&Pickはwar_ordersのis_banned/is_pickedで管理)

--- 単発大会の場合 ---
tournaments (series_id = NULL)
  ├── teams (大会所属チーム, チーム戦の場合)
  ├── participants (個人戦の場合)
  └── matches
```

### 新テーブル: `series`

```sql
CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  organizer_id UUID NOT NULL REFERENCES profiles(id),
  visibility visibility NOT NULL DEFAULT 'public',
  status tournament_status NOT NULL DEFAULT 'draft',

  -- チーム戦設定
  entry_type entry_type NOT NULL DEFAULT 'team',
  team_battle_format team_battle_format,
  team_size_min SMALLINT,
  team_size_max SMALLINT,

  -- ルール設定（シリーズごとに柔軟に変更可能）
  series_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 画像テーマ
  theme_config JSONB NOT NULL DEFAULT '{
    "primaryColor": "#3b82f6",
    "secondaryColor": "#1e40af",
    "accentColor": "#f59e0b",
    "bgColor": "#0f172a",
    "textColor": "#f8fafc",
    "fontFamily": "sans-serif"
  }'::jsonb,

  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### series_config 定義

```jsonc
// WMGP Season 8
{
  "orderSize": 3,              // メインオーダー人数
  "subCount": 1,               // サブプレイヤー数
  "playersPerRound": 3,        // 各ラウンド対戦人数
  "banPickEnabled": false,     // Ban&PickはDiscord管理
  "duplicateThemeAllowed": true,
  "qualifierFormat": "round_robin",
  "blockCount": 2,
  "roundsToWin": 2,            // War: 3ラウンド中2本先取
  "matchFormat": "bo3",        // 個人マッチ形式
  "scoring": {
    "winPoints": 3,            // 勝ち点
    "lossPoints": 0,
    "tiebreakers": [
      "totalRoundDiff",        // 総ラウンド得失点差
      "roundMatchDiff",        // ラウンド毎マッチ得失点差合計
      "duelDiff",              // デュエル得失点差合計
      "totalRoundScore",       // ラウンド毎総得点
      "headToHead"             // 直接対決
    ]
  },
  "finals": {
    "format": "single_elimination",
    "qualifiedPerBlock": [1, "2or3"]
  },
  "memberChangeAllowed": true,
  "maxMemberChanges": 2
}

// ロケットカップ Ver.J
{
  "orderSize": 5,              // 5名全員提出
  "subCount": 0,               // サブなし
  "playersPerRound": 3,        // Ban&Pick後3名で対戦
  "banPickEnabled": true,      // Katorin or Discord管理
  "banCount": 2,               // 各チーム2Ban
  "pickCount": 3,              // 各チーム3Pick
  "duplicateThemeAllowed": false, // デッキテーマ被り禁止
  "qualifierFormat": "swiss",
  "blockCount": 1,             // ブロック分けなし
  "roundCount": 3,             // 固定3ラウンド（席ローテーション）
  "roundsToWin": null,         // 先取なし、3ラウンド固定
  "matchFormat": "bo1",        // 個人マッチはBO1(推定)
  "scoring": {
    "teamPointThreshold": 5,   // 5勝以上でチームポイント+1
    "winPoints": 1,            // 勝ち点=個人勝利数
    "tiebreakers": [
      "teamPoints",
      "winPoints",
      "headToHead"
    ]
  },
  "finals": {
    "format": "single_elimination",
    "qualifiedCount": 4
  },
  "memberChangeAllowed": false
}
```

### 既存テーブル変更

```sql
-- tournaments: シリーズへの参照 + 節番号
ALTER TABLE tournaments
  ADD COLUMN series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  ADD COLUMN round_number SMALLINT;  -- シリーズ内の節番号

-- teams: シリーズ or 大会の排他所属
ALTER TABLE teams
  ADD COLUMN series_id UUID REFERENCES series(id),
  ADD COLUMN tournament_id UUID REFERENCES tournaments(id),
  ADD CONSTRAINT teams_belongs_to_one CHECK (
    (series_id IS NOT NULL AND tournament_id IS NULL) OR
    (series_id IS NULL AND tournament_id IS NOT NULL)
  );

-- tournament_blocks: シリーズ単位に移動
ALTER TABLE tournament_blocks
  ADD COLUMN series_id UUID REFERENCES series(id);

-- team_entries: 既存のまま（tournament_id + team_id で紐づけ）
```

### RLSポリシー: series テーブル

```sql
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- 公開シリーズは誰でも閲覧
CREATE POLICY "series_select" ON series
  FOR SELECT USING (visibility = 'public' OR organizer_id = auth.uid());

-- ログインユーザーはシリーズを作成可能
CREATE POLICY "series_insert" ON series
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND organizer_id = auth.uid());

-- 主催者のみ更新可能
CREATE POLICY "series_update" ON series
  FOR UPDATE USING (organizer_id = auth.uid());

-- 主催者のみ削除可能
CREATE POLICY "series_delete" ON series
  FOR DELETE USING (organizer_id = auth.uid());
```

### 設定値取得ロジック

シリーズ配下の大会と単発大会で設定の取得元が異なる。TypeScript側でヘルパー関数を用意し、呼び出し元での分岐を不要にする:

```typescript
// lib/tournament-config.ts
type TournamentConfig = {
  orderSize: number
  subCount: number
  playersPerRound: number
  banPickEnabled: boolean
  // ...
}

// 大会IDからシリーズ or 大会の設定を統一的に取得
async function getTournamentConfig(tournamentId: string): Promise<TournamentConfig> {
  const tournament = await fetchTournament(tournamentId)
  if (tournament.series_id) {
    // シリーズ配下 → series.series_config から取得
    const series = await fetchSeries(tournament.series_id)
    return parseSeriesConfig(series.series_config)
  }
  // 単発大会 → tournaments のカラムから取得
  return {
    orderSize: tournament.order_size,
    subCount: tournament.sub_count,
    playersPerRound: tournament.players_per_round,
    banPickEnabled: false,
    // ...
  }
}
```

**原則**: コンポーネントやページは `getTournamentConfig()` 経由で設定を取得し、`series_config` か `tournaments` カラムかを意識しない。

### ステータス管理（半連動）

- シリーズの `status` は基本手動管理
- 配下大会の最初が `in_progress` → シリーズも自動で `in_progress`
- 全大会が `completed` → シリーズも自動で `completed`
- トリガーまたはアプリ層で実装（初期はアプリ層、必要ならトリガー化）

### tournaments テーブルのカラム整理

シリーズ配下の大会は設定をシリーズから継承するため、以下のカラムは**シリーズ側に移動**:
- `order_size`, `sub_count`, `players_per_round`, `win_point_value` → `series.series_config`
- `block_count`, `rounds_to_win` → `series.series_config`
- `theme_config` → `series.theme_config`
- `team_battle_format`, `team_size_min`, `team_size_max` → `series` カラム

単発大会では引き続き `tournaments` 側のカラムを使う（既存カラムは削除しない）。

### オーダー管理者UI

現行: `/tournaments/[id]/wars/[matchId]/order` → 1チーム分のフォーム

改修後:
- **チームリーダー**: 現行通り自チーム分のみ入力
- **管理者(主催者)**: 両チーム分を1画面で入力可能
  - War詳細ページの管理画面内に統合
  - 左右にチーム1/チーム2のフォームを並べる
  - 各チームのメンバー一覧から選択 → デッキ名・テーマ入力
  - 一括保存

### 処理フロー

```
管理者がWar詳細を開く
  → 「オーダー入力」ボタン
  → 両チーム分のフォーム表示（左: チーム1 / 右: チーム2）
  → チーム1のメンバー選択 + デッキ名・テーマ入力
  → チーム2のメンバー選択 + デッキ名・テーマ入力
  → 一括保存（delete → insert）
```

## タスク分解

### Phase 1: スキーマ変更
- [ ] 1-1. `series` テーブル作成マイグレーション（RLS含む）
- [ ] 1-2. `teams` に `series_id` / `tournament_id` + 排他制約追加
- [ ] 1-3. `tournaments` に `series_id`, `round_number` FK追加
- [ ] 1-4. `tournament_blocks` に `series_id` 追加
- [ ] 1-5. `series_config` の Zod バリデーションスキーマ定義 (`lib/schemas/series-config.ts`)
- [ ] 1-6. `getTournamentConfig()` ヘルパー関数作成 (`lib/tournament-config.ts`)
- [ ] 1-7. `pnpm db:types` で型再生成

### Phase 2: オーダー管理者UI
- [ ] 2-1. 管理者用オーダー入力コンポーネント（両チーム並列表示）
- [ ] 2-2. War詳細ページに管理者用オーダー入力導線追加
- [ ] 2-3. オーダー入力ページの権限ロジック修正

### Phase 3: シリーズ対応UI
- [ ] 3-1. シリーズ作成フォーム
- [ ] 3-2. シリーズ詳細ページ（配下大会一覧 + 順位表）
- [ ] 3-3. シリーズ一覧ページ
- [ ] 3-4. 大会作成時のシリーズ紐づけ

### Phase 4: デモデータ再構築
- [ ] 4-1. 既存データ全削除
- [ ] 4-2. 新モデル対応デモデータ投入スクリプト作成
- [ ] 4-3. WMGP実データを新モデルで再投入

### Phase 5: 既存機能の新モデル対応
- [ ] 5-1. チーム大会管理コンポーネントのシリーズ対応
- [ ] 5-2. ブロック順位表のシリーズ対応（`block_standings` ビューは `tournament_id` で集計しているため、シリーズ全節の累計を取るにはシリーズ配下の全 `tournament_id` でフィルタするか、ビューを `series_id` 対応に拡張する）
- [ ] 5-3. `swiss_rankings` ビューのシリーズ対応（同上）
- [ ] 5-4. 画像出力APIのシリーズ対応
- [ ] 5-5. テストスクリプト更新

## リスク・懸念事項
- **マイグレーション量**: 既存データ全削除前提なので破壊的変更も安全
- **既存カラム温存**: tournaments 側の設定カラムは削除せず残す → 単発大会で引き続き使用。冗長だが互換性を保てる
- **RLS複雑化**: series 経由のアクセス制御が増えるが、パターンは既存踏襲
- **series_config のバリデーション**: JSONBなのでスキーマレベルの型安全性はない → TypeScript側でZodスキーマを定義して検証

## 決定事項
- シリーズと配下大会のステータスは**半連動**（初回in_progress自動化、全完了で自動completed、主催者フィードバック後に調整余地あり）
- 大会の順序は `round_number` + `start_at` でソート
- 個人戦CSのシリーズ化は非対応（新規立ち上げで対応）
- WMGP/ロケットカップの差異は全て `series_config` (JSONB) で吸収可能
