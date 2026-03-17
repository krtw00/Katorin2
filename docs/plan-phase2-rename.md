# Phase 2: アプリ層リネーム実行計画

## 概要

### 目的
Phase 1（DBマイグレーション）で物理リネーム済みのテーブルに合わせ、アプリケーション層のコード全体を更新する。

### スコープ
- 型定義ファイルのリネーム・更新
- Supabaseクエリのテーブル名・カラム名更新
- コンポーネント/ルートのディレクトリ移動
- import文・翻訳キーの全更新
- ビルド通過まで修正

### スコープ外
- ルーティング構造の変更（tournaments → leagues/[id]/rounds ネスト化は Phase 2b+）
- 新機能追加（決勝進出、没収試合等は Phase 3以降）

### 前提
- Phase 1 DBマイグレーション適用済み（`leagues`, `rounds`, `round_blocks`, `league_points`）
- `database.ts` 再生成済み（新テーブル名で出力済み）
- 本番未運用のため破壊的変更OK

---

## 実行手順

### Step 1: 型定義ファイル

| 操作 | 旧 | 新 |
|------|-----|-----|
| リネーム+内容更新 | `src/types/series.ts` | `src/types/league.ts` |
| リネーム+内容更新 | `src/types/tournament.ts` | `src/types/round.ts` |
| リネーム+内容更新 | `src/lib/schemas/series-config.ts` | `src/lib/schemas/league-config.ts` |
| 内容更新 | `src/lib/tournament-config.ts` | 同ファイル（関数名・クエリ更新） |
| 内容更新 | `src/types/team.ts` | 同ファイル（tournament_id → round_id等） |

型名変更:
- `Series*` → `League*`（SeriesRow, SeriesInsert, SeriesUpdate, SeriesConfig, SeriesWithOrganizer等）
- `Tournament` → `Round`（TournamentRow → Round等。ただし TournamentFormat, TournamentStatus は DB enum名のため維持）
- `seriesConfigSchema` → `leagueConfigSchema`
- `parseSeriesConfig` → `parseLeagueConfig`

### Step 2: sed一括置換（DBクエリ・カラム参照）

対象: `src/` 配下の全 `.ts`, `.tsx` ファイル

```bash
# テーブル名（.from() 引数）
.from('series')           → .from('leagues')
.from('tournaments')      → .from('rounds')
.from('tournament_blocks') → .from('round_blocks')
.from('series_points')    → .from('league_points')

# カラム名（select, eq, order等の引数文字列内）
series_id    → league_id
tournament_id → round_id
series_config → league_config
```

### Step 3: ディレクトリ移動（git mv）

```bash
git mv src/components/series src/components/league
git mv 'src/app/[locale]/(main)/series' 'src/app/[locale]/(main)/leagues'
```

※ `src/app/[locale]/(main)/tournaments/` は当面維持（内部クエリのみ更新）

### Step 4: sed一括置換（import文・パス参照）

```bash
# import パス
@/types/series              → @/types/league
@/types/tournament          → @/types/round
@/components/series/        → @/components/league/
@/lib/schemas/series-config → @/lib/schemas/league-config

# URLパス（リンク・リダイレクト）
/series/   → /leagues/
/series'   → /leagues'
```

### Step 5: i18n翻訳キー更新

`messages/ja.json`, `messages/en.json` のキー:
- `series` 名前空間 → `leagues` 名前空間
- `tournament` 名前空間内の series 参照更新

### Step 6: ナビゲーション更新

- BottomNav: 「シリーズ」→「リーグ」、href `/series` → `/leagues`
- Header/サイドバー: 同上

### Step 7: Codexビルド修正

```bash
codex exec --full-auto --cd /home/iguchi/dev/Katorin2 "pnpm buildが通るまでビルドエラーを全て修正して。database.tsは変更しないこと。"
```

### Step 8: 検証

- `pnpm build` 通過確認
- `grep -r "from('series')\|from('tournaments')" src/` で残存チェック
- `grep -r "series_id\|tournament_id" src/` で残存チェック（team.ts手動型を含む）

---

## リスク・懸念事項

| リスク | 対策 |
|--------|------|
| sed置換の誤爆（series が別文脈で使われる） | 置換前にgrep結果を目視確認。`time_series`等は存在しないことを確認済み |
| tournament_id がWar関連で残るべき箇所 | DB上は全てround_idに変更済み。コード上の手動型定義のみ要更新 |
| i18n キー変更でUIが壊れる | ja/en両方を同時更新。翻訳漏れはビルド時に検出される |

## 未決事項

- [ ] tournaments ルートの廃止タイミング（Phase 2b でネスト化 or 当面維持）
- [ ] database.ts 末尾のレガシーexport追記（TournamentFormat等の再export）
