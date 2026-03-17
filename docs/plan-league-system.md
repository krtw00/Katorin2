# リーグシステム全面改定（series → leagues, tournaments → rounds）

## 概要

### 目的
現在の「シリーズ」を「リーグ」に、「大会」を「ラウンド」に改名・再設計する。リーグはラウンド単位で管理され、各ラウンドの形式（総当たり/スイスドロー/シングルエリミ/ダブルエリミ）を運営が自由に設定できる。WMGP（総当たり→決勝トーナメント）とロケットカップ（スイスドロー→決勝トーナメント）の両方を1つのシステムで運営可能にする。

### スコープ
- DB: テーブル物理リネーム（`series` → `leagues`, `tournaments` → `rounds` 等）
- 各ラウンドの形式を運営が自由に設定
- 決勝進出条件の設定・自動チーム引き継ぎ
- チーム戦ブラケット表示（エリミネーション形式ラウンド）
- ポイント計算の柔軟性（WMGP式/ロケット式/カスタム）
- 没収試合・不戦勝(BYE)処理

### スコープ外
- Ban&Pick のリアルタイムUI（Discord管理、Katorinは結果記録のみ）
- オーダー変更のリアルタイム管理（同上）
- 個人戦リーグ（チーム戦のみ）
- チャット機能（電気通信事業法の関係で見送り）

### 前提条件
- 本番未運用のため**破壊的変更OK**。整合性を最優先し、技術的負債を残さない
- 既存のWar形式（matches → war_rounds → individual_matches）はそのまま活用
- マイグレーションは全テーブルリネーム + 既存データ移行スクリプト付き

---

## 要件

### 機能要件

#### 1. リーグ管理
- リーグの作成・編集・削除
- リーグ内にラウンドを任意個数追加（順序管理）
- 各ラウンドの形式を個別設定: `round_robin` / `swiss` / `single_elimination` / `double_elimination`
- リーグ全体のルール設定（オーダー構成、マッチ形式等）は `league_config` (JSONB) で管理

#### 2. ラウンド管理
- ラウンドごとに独立したステータス管理（draft → in_progress → completed）
- ラウンドの形式に応じて内部構造が変わる:
  - **round_robin**: ブロック分け + 総当たり対戦カード生成
  - **swiss**: スイスドロー対戦カード生成
  - **single_elimination / double_elimination**: ブラケット生成（チーム名表示）

#### 3. 決勝進出
- 運営が「予選ラウンド完了後、各ブロック上位N位が決勝ラウンドに進出」を設定可能
- 自動で対象チームを次ラウンドの参加チームとして引き継ぎ
- 手動での進出チーム追加・除外も可能

#### 4. ポイント計算
- WMGP式: War勝利で勝点N pt、6段階タイブレーカー
- ロケット式: 個人マッチM勝以上でチームポイント+1、勝ち点別計算
- カスタム: 運営が自由に設定
- ラウンド完了時に自動計算 + 手動再計算ボタン

#### 5. チーム戦ブラケット
- エリミ形式ラウンドで `RealtimeBracket` をチーム名表示に対応
- 各試合カードにWarスコア（例: 2-1）表示、クリックでWar詳細へ

#### 6. 没収試合・不戦勝
- 没収試合: 運営が手動で「没収」マーク → 規定スコアで敗北扱い
- BYE: 奇数チーム時の自動割り当て → 規定スコアで勝利扱い
- スコアはリーグ設定で定義可能（WMGP: 1-2没収、ロケット: 5-4 BYE）

---

## 設計

### データモデル変更

#### テーブルリネーム（物理的に実行）

| 旧テーブル名 | 新テーブル名 | 旧FK名 | 新FK名 |
|-------------|-----------|--------|--------|
| `series` | `leagues` | `series_id` | `league_id` |
| `tournaments` | `rounds` | `tournament_id` | `round_id` |
| `tournament_blocks` | `round_blocks` | - | - |
| `series_points` | `league_points` | - | - |
| `team_applications` | `team_applications` | `series_id` → `league_id` | - |
| `team_entries` | `team_entries` | `tournament_id` → `round_id` | - |

**matches, war_orders 等のFK変更（テーブル名は維持）:**

| テーブル | 旧FK | 新FK |
|---------|------|------|
| `matches` | `tournament_id` | `round_id` |
| `matches` | `block_id` → `tournament_blocks.id` | `block_id` → `round_blocks.id` |
| `war_orders` | （変更なし、match_id経由） | （変更なし） |
| `war_rounds` | （変更なし、match_id経由） | （変更なし） |
| `individual_matches` | （変更なし、match_id経由） | （変更なし） |
| `participants` | `tournament_id` | `round_id` |

※ `war_rounds`, `individual_matches`, `war_orders` はmatch_id経由のためFK変更不要。

#### 新規/変更カラム

**rounds テーブル（旧 tournaments）:**
```sql
-- 既存の tournament_format をそのまま活用
-- 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin'

-- 追加カラム
is_finals BOOLEAN DEFAULT FALSE,           -- 決勝ラウンドフラグ
source_round_id UUID REFERENCES rounds(id), -- 進出元ラウンド
qualified_per_block INTEGER,               -- 各ブロックからN位まで進出
qualified_total INTEGER,                   -- 全体からN位まで進出（スイス用）

-- リネーム
series_id → league_id                      -- FK変更
round_number → round_order                 -- 意味を明確化
tournament_format → format                 -- 簡潔に
```

**leagues テーブル（旧 series）:**
```sql
-- リネームのみ。カラム構成は変更なし
-- series_config → league_config（カラム名変更）
```

**matches テーブル:**
```sql
-- FKリネーム
tournament_id → round_id

-- 追加カラム
is_forfeit BOOLEAN DEFAULT FALSE,  -- 没収試合フラグ
is_bye BOOLEAN DEFAULT FALSE,      -- 不戦勝フラグ
```

#### league_config 型定義（拡張）

```typescript
type LeagueConfig = {
  // オーダー構成
  orderSize: number           // メインプレイヤー数
  subCount: number            // サブプレイヤー数
  playersPerRound: number     // 1ラウンドの対戦人数
  matchFormat: 'bo1' | 'bo3' | 'bo5'
  roundsToWin: number         // War内の先取ラウンド数

  // 特殊ルール（Discord管理、記録のみ）
  banPickEnabled: boolean
  duplicateThemeAllowed: boolean

  // スコアリング
  scoring: {
    winPoints: number              // War勝利時の勝点（WMGP: 3）
    lossPoints: number             // War敗北時の勝点（通常: 0）
    teamPointThreshold?: number    // ロケット式: N勝以上でTP+1
    byeScore?: {
      roundWins: number            // BYE時ラウンド勝数
      roundLosses: number
    }
    forfeitScore?: {
      roundWins: number            // 没収時ラウンド勝数
      roundLosses: number
    }
    tiebreakers: (
      | 'win_points'              // 勝点
      | 'round_diff'              // ラウンド得失点差
      | 'match_diff'              // マッチ得失点差
      | 'individual_diff'         // 個人マッチ得失点差
      | 'total_rounds_won'        // ラウンド総得点
      | 'head_to_head'            // 直接対決
      | 'team_points'             // チームポイント（ロケット式）
    )[]
  }

  // 決勝設定
  finals?: {
    format: 'single_elimination' | 'double_elimination'
    qualifiedPerBlock?: number     // 各ブロックからN位まで
    qualifiedTotal?: number        // 全体からN位まで（スイスドロー用）
  }
}
```

#### ビュー変更

```sql
-- block_standings → round_block_standings（ラウンド内ブロック順位）
-- swiss_rankings → round_swiss_rankings
-- league_standings（新規）: リーグ全体の累計順位

-- league_standings の定義概要:
-- rounds × team_entries × matches を結合し、
-- リーグ内全ラウンドのチーム成績を累計集計。
-- league_config.scoring.tiebreakers の順序でソート。
-- カラム: league_id, team_id, team_name, team_avatar_url,
--         total_win_points, wins, losses, round_diff, match_diff,
--         individual_diff, total_rounds_won, rank
```

#### 用語の衝突回避

「ラウンド」がDB上2つの意味で使われるため、以下で区別する:
- **ラウンド (Round)**: リーグ内の週/節。`rounds` テーブル。UIでは「Week 1」「決勝」等。
- **ウォーラウンド (War Round)**: War内の3v3星取戦1セット。`war_rounds` テーブル。UIでは「Round 1」「Round 2」等。

コード上は `round` = リーグのラウンド、`warRound` = War内ラウンドで命名統一。

### ルーティング変更

```
旧                                → 新
/series                           → /leagues
/series/[id]                      → /leagues/[id]
/series/[id]/edit                 → /leagues/[id]/edit
/series/[id]/meta                 → /leagues/[id]/meta
/series/[id]/ranking              → /leagues/[id]/ranking
/series/new                       → /leagues/new
/tournaments                      → 廃止（リーグ外の単発大会は当面非対応）
/tournaments/[id]                 → /leagues/[leagueId]/rounds/[roundId]
/tournaments/[id]/manage          → /leagues/[leagueId]/rounds/[roundId]/manage
/tournaments/[id]/wars            → /leagues/[leagueId]/rounds/[roundId]/wars
/tournaments/[id]/wars/[matchId]  → /leagues/[leagueId]/rounds/[roundId]/wars/[matchId]
/tournaments/[id]/bracket         → /leagues/[leagueId]/rounds/[roundId]/bracket
/tournaments/[id]/standings       → /leagues/[leagueId]/rounds/[roundId]/standings
/tournaments/new                  → 廃止（リーグ詳細から「ラウンド追加」で作成）
```

### ファイル構成変更

```
src/app/[locale]/(main)/
  leagues/                    ← 旧 series/
    page.tsx                  リーグ一覧
    new/page.tsx              リーグ作成
    [id]/
      page.tsx                リーグ詳細
      edit/page.tsx           リーグ編集
      meta/page.tsx           メタ分析
      ranking/page.tsx        ランキング
      rounds/                 ← 旧 tournaments/
        [roundId]/
          page.tsx            ラウンド詳細
          manage/page.tsx     ラウンド管理
          bracket/page.tsx    ブラケット表示
          standings/page.tsx  順位表
          wars/
            page.tsx          War一覧
            [matchId]/
              page.tsx        War詳細
              order/page.tsx  オーダー提出
  teams/                      変更なし

src/components/
  league/                     ← 旧 series/
    LeagueForm.tsx
    BlockAssignment.tsx
    TeamApplicationForm.tsx
    ApplicationManage.tsx
    ManualPointsConfirm.tsx
  round/                      ← 旧 tournament/ の一部
    RoundManage.tsx           ← TeamTournamentManage.tsx
  tournament/                 ← 個人戦・ブラケット等の汎用コンポーネント
    RealtimeBracket.tsx       チーム戦対応追加
    MatchReportDialog.tsx
    ...

src/types/
  league.ts                   ← 旧 series.ts
  round.ts                    ← 旧 tournament.ts（ラウンド固有の型）
  tournament.ts               汎用型（matchステータス等）
```

### UI変更

#### リーグ詳細ページ (`/leagues/[id]`)
```
[リーグヘッダー: バナー + タイトル + ステータス]
[統計: ラウンド数 | チーム数 | 状態]
[タブ: 順位表 | ラウンド | チーム | 申請管理 | メタ分析 | 概要]

ラウンドタブ:
  ┌────────────────────────────────────────────┐
  │ R1  予選 Week 1   [総当たり]     [完了]    │ → クリックでラウンド詳細
  │ R2  予選 Week 2   [総当たり]     [進行中]  │
  │ R3  予選 Week 3   [総当たり]     [未開始]  │
  │ R4  決勝トーナメント [シングルエリミ] [未開始] │ ← is_finals=true
  ├────────────────────────────────────────────┤
  │ [+ ラウンドを追加]                           │
  └────────────────────────────────────────────┘
```

#### ラウンド詳細ページ (`/leagues/[leagueId]/rounds/[roundId]`)
- round_robin / swiss: War一覧 + 順位表（現在と同じ）
- single_elimination / double_elimination: **チーム名ブラケット** + War一覧

#### チーム戦ブラケット
- `team1_id` / `team2_id` がある場合はチーム名を表示
- 各試合カードにWarスコア（例: `Team A 2-1 Team B`）表示
- クリックでWar詳細にリンク
- ブラケット生成時にteam_entriesからシードを割り当て

### 処理フロー

#### 決勝進出フロー
```
1. 運営がリーグ詳細から「+ ラウンド追加」→ 形式=single_elimination、is_finals=true
2. 進出元ラウンドと進出条件（各ブロックN位 or 全体N位）を設定
3. 進出元ラウンドが completed → リーグ詳細に「進出チーム確定」ボタン表示
4. 運営がクリック → round_block_standings / round_swiss_rankings から上位チーム自動抽出
5. 決勝ラウンドの team_entries に自動登録
6. 運営が決勝ラウンド管理画面でブラケット生成
7. 各試合はWar形式で実施・結果入力 → ブラケット自動更新
```

---

## タスク分解

### Phase 1: DBマイグレーション（物理リネーム）
- [ ] マイグレーション作成: テーブルリネーム（ALTER TABLE ... RENAME TO）
- [ ] FK・インデックス・ビュー・トリガー・RLSポリシーの全更新
- [ ] rounds テーブルに `is_finals`, `source_round_id`, `qualified_per_block`, `qualified_total` 追加
- [ ] matches テーブルに `is_forfeit`, `is_bye` 追加
- [ ] `league_config` のZodスキーマ拡張（scoring.byeScore, forfeitScore, tiebreakers, finals）
- [ ] ビューリネーム（block_standings → round_block_standings 等）
- [ ] `supabase db reset` で動作確認

### Phase 2: 型定義・ファイル構成変更
- [ ] `database.ts` 再生成（`pnpm db:types`）+ レガシーexport更新
- [ ] `src/types/series.ts` → `src/types/league.ts`（型名リネーム: Series→League, SeriesConfig→LeagueConfig等）
- [ ] `src/types/tournament.ts` → `src/types/round.ts` + `src/types/common.ts`（MatchStatus等の汎用型を分離）
- [ ] `src/lib/schemas/series-config.ts` → `src/lib/schemas/league-config.ts`

### Phase 2b: ファイル移動・ルーティング
- [ ] `src/components/series/` → `src/components/league/`（5ファイル）
- [ ] `src/components/tournament/TeamTournamentManage.tsx` → `src/components/round/RoundManage.tsx`
- [ ] `src/app/[locale]/(main)/series/` → `src/app/[locale]/(main)/leagues/`（約15ファイル）
- [ ] `src/app/[locale]/(main)/tournaments/` → `src/app/[locale]/(main)/leagues/[id]/rounds/`（約20ファイル）
- [ ] ナビゲーション更新（Header, BottomNav: 「シリーズ」→「リーグ」、リンク先変更）

### Phase 2c: クエリ・翻訳更新
- [ ] Supabaseクエリのテーブル名更新: `.from('series')` → `.from('leagues')` 等（grep で全数把握→一括置換）
- [ ] Supabaseクエリのカラム名更新: `series_id` → `league_id`, `tournament_id` → `round_id` 等
- [ ] 翻訳キー更新: messages/*.json の `series` → `league`、`tournament` → `round` 関連
- [ ] import文の全更新（型・コンポーネントパス変更に伴う）

### Phase 3: ラウンド形式の柔軟化
- [ ] ラウンド作成UI: リーグ詳細の「+ラウンド追加」ボタンから作成。フォーム項目: タイトル、形式（4択）、is_finals、source_round_id（決勝の場合）
- [ ] ラウンド管理画面の形式別分岐（RoundManage コンポーネント: format に応じて round_robin/swiss/elimination のUI切り替え）
- [ ] エリミネーション形式でのブラケット生成UI（チームIDベースでシード割り当て）
- [ ] ラウンドステータス管理: draft → in_progress → completed の遷移ボタン（現在のtournament manage と同等）

### Phase 4: チーム戦ブラケット
- [ ] RealtimeBracket.tsx にチーム名表示対応
- [ ] ブラケット試合カードにWarスコア表示 + War詳細リンク
- [ ] チームIDでのブラケット生成ロジック

### Phase 5: 決勝進出
- [ ] 決勝ラウンド設定UI（進出元・条件）
- [ ] 「進出チーム確定」自動抽出ロジック
- [ ] team_entries 自動登録

### Phase 6: ポイント・没収試合・BYE
- [ ] 没収試合マーク機能
- [ ] BYE処理改善（設定可能スコア）
- [ ] ポイント計算ロジック拡張（ロケット式teamPointThreshold対応）
- [ ] タイブレーカー設定UI

### Phase 7: テスト・検証
- [ ] E2Eテスト更新（リーグフロー）
- [ ] テストスクリプト更新（scripts/test-*.ts）
- [ ] デモデータ更新（seed-demo-data.ts）

---

## リスク・懸念事項

| リスク | 対策 |
|--------|------|
| テーブルリネームの影響範囲（全ファイル） | Phase 1→2→2b→2cを連続実行し中間状態を作らない。1コミットにまとめる |
| RLSポリシーの全書き換え（現在約30ポリシー） | `SELECT policyname FROM pg_policies` で全数抽出→チェックリスト化 |
| ルーティング変更の規模（約35ファイル移動） | ディレクトリ一括移動後、`grep -r 'series\|tournament'` で漏れチェック |
| 既存のE2Eテスト全壊 | Phase 7 で全書き換え。ビルド通過を中間検証 |
| 「ラウンド」の用語衝突 | コード上は `round` vs `warRound` で命名統一。UIは「Week N」vs「Round N」で区別 |

---

## 未決事項

- [ ] 単発大会（リーグ外）を今後サポートするか → 当面廃止で良いか？（#34 依頼者相談待ち）
- [ ] 決勝進出の「2位or3位」条件（WMGP: 各ブロック1位 + 2位or3位）→ `qualifiedPerBlock` で何位まで、に加えてワイルドカード枠が必要？
- [ ] ロケットカップの「席順ローテーション」→ Discord管理で十分（Katorinは関与しない）
