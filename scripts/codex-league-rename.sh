#!/usr/bin/env bash
# ============================================================
# Codex連続実行スクリプト: リーグシステム Phase 2 リネーム
# 使い方: bash scripts/codex-league-rename.sh [step_number]
# step_number を指定すると、そのステップから再開
# ============================================================

set -euo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd)"
LOG_DIR="/tmp/codex-league-rename"
mkdir -p "$LOG_DIR"

step=${1:-1}
total=8

run_codex() {
  local n=$1
  local desc=$2
  local prompt=$3
  local log="$LOG_DIR/step${n}.log"

  echo "=========================================="
  echo "[$n/$total] $desc"
  echo "=========================================="

  codex exec --full-auto --cd "$REPO" "$prompt" > "$log" 2>&1
  local rc=$?

  if [ $rc -ne 0 ]; then
    echo "❌ Step $n FAILED (exit code $rc)"
    echo "   Log: $log"
    tail -20 "$log"
    exit 1
  fi

  echo "✅ Step $n completed"
  echo "   Log: $log"

  # 変更があればgit stageしておく
  git add -A 2>/dev/null || true
  echo ""
}

verify_build() {
  echo "🔨 Build check..."
  if pnpm build > "$LOG_DIR/build.log" 2>&1; then
    echo "✅ Build OK"
  else
    echo "❌ Build FAILED"
    tail -30 "$LOG_DIR/build.log"
    exit 1
  fi
}

# ============================================================
# Step 1: 型定義ファイルのリネーム（series.ts → league.ts）
# ============================================================
if [ $step -le 1 ]; then
run_codex 1 "型定義: series.ts → league.ts" '
src/types/series.ts を src/types/league.ts にリネームし、中身の型名を変更してください。

変更内容:
1. ファイルをコピー: src/types/series.ts → src/types/league.ts
2. src/types/league.ts 内の型名を変更:
   - Series → League
   - SeriesStatus → LeagueStatus
   - SeriesFormData → LeagueFormData
   - SeriesWithOrganizer → LeagueWithOrganizer
   - seriesStatusLabels → （既に削除済み、存在しなければスキップ）
3. src/types/series.ts は削除せず、league.ts からの re-export に変更:
   ```typescript
   // 後方互換: league.ts からの re-export
   export * from "./league"
   export type { League as Series, LeagueStatus as SeriesStatus, LeagueFormData as SeriesFormData, LeagueWithOrganizer as SeriesWithOrganizer } from "./league"
   ```
4. database.ts の import があれば league.ts でも同じ import を使う

注意:
- 他のファイルのimportは変更しない（別ステップで行う）
- テストやビルドは実行しない
'
fi

# ============================================================
# Step 2: 型定義ファイルのリネーム（tournament.ts → round.ts + common.ts）
# ============================================================
if [ $step -le 2 ]; then
run_codex 2 "型定義: tournament.ts 分割" '
src/types/tournament.ts の内容を確認し、ラウンド固有の型を src/types/round.ts に分離してください。

変更内容:
1. src/types/tournament.ts を読む
2. src/types/round.ts を新規作成し、以下をコピー:
   - TournamentStatus → RoundStatus に型名変更
   - TournamentFormat → RoundFormat に型名変更
   - Tournament → Round に型名変更（各カラム名も: series_id→league_id, tournament_format→format, round_number→round_order）
   - TournamentWithOrganizer → RoundWithOrganizer
   - 新規追加: is_finals, source_round_id, qualified_per_block, qualified_total フィールド
3. src/types/tournament.ts は以下のみ残す:
   - MatchStatus, match_status 型
   - Profile 型
   - 共通のenum型
   - round.ts からの re-export: `export type { Round as Tournament, RoundStatus as TournamentStatus, ... } from "./round"`
4. database.ts の import を適切に更新

注意:
- 他のファイルのimportは変更しない（別ステップで行う）
- match_format, match_status 等の試合関連の型は tournament.ts に残す
'
fi

# ============================================================
# Step 3: スキーマファイルのリネーム
# ============================================================
if [ $step -le 3 ]; then
run_codex 3 "スキーマ: series-config.ts → league-config.ts" '
src/lib/schemas/series-config.ts を src/lib/schemas/league-config.ts にリネームし、型名を変更してください。

変更内容:
1. src/lib/schemas/series-config.ts を読む
2. src/lib/schemas/league-config.ts を新規作成:
   - SeriesConfig → LeagueConfig
   - seriesConfigSchema → leagueConfigSchema
   - WMGP_CONFIG, ROCKET_CUP_CONFIG 等のプリセットはそのまま維持
   - qualifierFormat を残す（リーグ全体の設定として）
3. league-config.ts の scoring セクションに以下を追加（optional）:
   - teamPointThreshold?: number
   - byeScore?: { roundWins: number, roundLosses: number }
   - forfeitScore?: { roundWins: number, roundLosses: number }
4. finals セクションがなければ追加:
   - finals?: { format: "single_elimination" | "double_elimination", qualifiedPerBlock?: number, qualifiedTotal?: number }
5. src/lib/schemas/series-config.ts は league-config.ts からの re-export に変更

注意: 他のファイルのimportは変更しない
'
fi

# ============================================================
# Step 4: コンポーネントディレクトリの移動
# ============================================================
if [ $step -le 4 ]; then
run_codex 4 "コンポーネント: series/ → league/" '
src/components/series/ ディレクトリを src/components/league/ にリネームしてください。

手順:
1. src/components/league/ ディレクトリを作成
2. src/components/series/ 内の全ファイルを src/components/league/ にコピー
3. src/components/series/ 内のファイルを削除
4. src/components/league/ 内の各ファイルで:
   - import パスの "@/types/series" → "@/types/league" に変更
   - import パスの "@/lib/schemas/series-config" → "@/lib/schemas/league-config" に変更
   - コンポーネント内の SeriesForm → LeagueForm 等の名前変更はしない（別ステップ）
   - Supabaseクエリの .from("series") → .from("leagues") に変更
   - Supabaseクエリの series_id → league_id に変更
   - useTranslations のnamespace はそのまま（翻訳キーは別ステップ）

注意: src/app/ 配下のimportは変更しない（別ステップ）
'
fi

# ============================================================
# Step 5: ページディレクトリの移動（series → leagues）
# ============================================================
if [ $step -le 5 ]; then
run_codex 5 "ページ: series/ → leagues/" '
src/app/[locale]/(main)/series/ を src/app/[locale]/(main)/leagues/ にリネームしてください。

手順:
1. src/app/[locale]/(main)/leagues/ ディレクトリを作成（サブディレクトリ含む再帰的に）
2. src/app/[locale]/(main)/series/ 内の全ファイルを対応する場所にコピー
3. src/app/[locale]/(main)/series/ を削除
4. 移動した全ファイル内で:
   - import の "@/components/series/" → "@/components/league/" に変更
   - import の "@/types/series" → "@/types/league" に変更
   - Supabaseクエリの .from("series") → .from("leagues") に変更
   - Supabaseクエリの .from("tournaments") → .from("rounds") に変更
   - カラム参照の series_id → league_id に変更
   - カラム参照の tournament_id → round_id に変更
   - series_config → league_config に変更
   - href="/series/" → href="/leagues/" に変更
   - href="/tournaments/" → href="/leagues/${id}/rounds/" に変更（該当あれば）

注意: tournaments/ ディレクトリの移動は別ステップ
'
fi

# ============================================================
# Step 6: 全ファイルのimport/クエリ一括更新
# ============================================================
if [ $step -le 6 ]; then
run_codex 6 "全ファイル: import/Supabaseクエリ一括更新" '
src/ 配下の全 .ts/.tsx ファイルで、以下の一括置換を行ってください。

1. import パスの更新:
   - "@/components/series/" → "@/components/league/"
   - "@/types/series" → "@/types/league"
   - "@/lib/schemas/series-config" → "@/lib/schemas/league-config"

2. Supabaseクエリのテーブル名更新:
   - .from("series") → .from("leagues")
   - .from("tournaments") → .from("rounds")
   - .from("tournament_blocks") → .from("round_blocks")
   - .from("series_points") → .from("league_points")
   - .from('\''series'\'') → .from('\''leagues'\'')（シングルクォートの場合）
   - .from('\''tournaments'\'') → .from('\''rounds'\'')

3. カラム名の更新（Supabaseクエリの .eq, .select, .order 等の中）:
   - "series_id" → "league_id"
   - "tournament_id" → "round_id"（matches, team_entries, participants 等のFK）
   - "series_config" → "league_config"
   - "tournament_format" → "format"
   - "round_number" → "round_order"
   - FK結合の "!series_" → "!leagues_"（例: profiles!series_organizer_id_fkey → profiles!leagues_organizer_id_fkey）
   - FK結合の "!tournaments_" → "!rounds_"

4. URL/リンクの更新:
   - href="/series" → href="/leagues"
   - href="/tournaments" → href="/leagues" （リーグ配下のラウンドへのリンクは文脈による）
   - router.push("/series" → router.push("/leagues"
   - router.push("/tournaments" → router.push("/leagues" （文脈による）
   - Link href="/series" → Link href="/leagues"

5. 型名の更新（import で re-export 済みだが直接参照もあれば）:
   - SeriesWithOrganizer → LeagueWithOrganizer（import先が league.ts なら）
   - TournamentWithOrganizer → RoundWithOrganizer（import先が round.ts なら）

注意:
- e2e/ ディレクトリ内は変更しない（別途対応）
- scripts/ ディレクトリ内は変更しない（別途対応）
- messages/*.json は変更しない（別途対応）
- 変更対象が多いのでgrepで全数確認してから置換すること
- FK名の "series_organizer_id_fkey" → "leagues_organizer_id_fkey" 等はSupabaseが自動生成する名前なのでクエリ内の文字列として更新
'
fi

# ============================================================
# Step 7: ナビゲーション・レイアウト更新
# ============================================================
if [ $step -le 7 ]; then
run_codex 7 "ナビゲーション・ミドルウェア更新" '
以下のファイルでリーグシステムへのリネームを反映してください。

1. src/components/layout/ 内（Header, BottomNav等）:
   - 「シリーズ」リンクのhrefを /series → /leagues に変更
   - ナビアイテムのパス判定も更新

2. src/lib/supabase/middleware.ts:
   - /series を参照している箇所があれば /leagues に変更

3. src/app/[locale]/(main)/my/page.tsx:
   - シリーズ関連のクエリ（.from("series")等）を .from("leagues") に変更
   - series_id → league_id

4. src/app/[locale]/(main)/teams/page.tsx:
   - 同上

5. src/app/[locale]/(main)/tournaments/ ディレクトリ内:
   - Supabaseクエリの .from("tournaments") → .from("rounds")
   - tournament_id → round_id
   - series_id → league_id
   - href の更新

注意: まずgrepで対象箇所を全数確認してから変更
'
fi

# ============================================================
# Step 8: ビルド検証
# ============================================================
if [ $step -le 8 ]; then
  verify_build
fi

echo ""
echo "=========================================="
echo "✅ All $total steps completed!"
echo "=========================================="
echo ""
echo "次のアクション:"
echo "  1. git diff で変更をレビュー"
echo "  2. pnpm test:e2e でE2Eテスト（要更新）"
echo "  3. 問題なければ git commit"
