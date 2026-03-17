# Katorin2

遊戯王マスターデュエルのオンライントーナメント運営Webアプリ（海外対応Tonamel代替）

## Stack
- TypeScript, Next.js 16, React 19
- UI: shadcn/ui, Tailwind CSS
- DB/Auth/Realtime: Supabase (PostgreSQL)
- Storage: Cloudflare R2
- Hosting: Vercel (https://katorin2.codenica.dev)
- DNS/CDN: Cloudflare
- i18n: next-intl (ja/en)
- Package Manager: pnpm

## Commands
- `pnpm dev` - 開発サーバー起動
- `pnpm build` - ビルド
- `pnpm db:types` - Supabase型自動生成（※末尾にレガシーexport手動追加が必要）
- `supabase start` - ローカルSupabase起動
- `supabase db reset` - ローカルDBリセット
- `supabase db push` - クラウドDBにマイグレーション適用
- `npx tsx scripts/test-tournament-flow.ts` - 個人戦フローテスト
- `npx tsx scripts/test-team-tournament.ts` - チーム戦(ロケットカップ形式)テスト
- `npx tsx scripts/test-wmgp-flow.ts` - WMGP形式テスト
- `npx tsx scripts/seed-demo-data.ts` - 本番にデモデータ投入（要 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY）

## Architecture
- Next.js App Router
- Supabase で認証・DB・リアルタイム
- Cloudflare R2 でファイルストレージ（署名付きURL方式）
- next/og で画像出力API

## データモデル
- **リーグ** (`leagues`): 複数ラウンドにまたがる長期イベント（WMGP, ロケットカップ等）
- **ラウンド** (`rounds`): リーグ内の1節（予選Week、決勝トーナメント等）
- **War** (`matches`): チーム対チームの試合全体
- ルール設定は `leagues.league_config` (JSONB) でリーグごとに柔軟に変更可能
- 設定取得は `getTournamentConfig()` で統一（リーグ/単発を自動判定）
- 設計書: `docs/plan-league-system.md`

## 対応大会形式
- 個人戦シングルエリミネーション / ダブルエリミネーション
- チーム戦スイスドロー（ロケットカップ形式: Ban&Pick、デッキテーマ被り禁止）
- チーム戦ブロック別総当たり（WMGP形式: 3v3星取戦BO3、6段階タイブレーカー）
- チーム戦シングルエリミネーション（決勝トーナメント）
- ルール設定: `src/lib/schemas/league-config.ts` に `WMGP_CONFIG` / `ROCKET_CUP_CONFIG`

## デモアカウント
| 役割 | メール | パスワード | 用途 |
|------|--------|-----------|------|
| 主催者 | `demo@katorin2.codenica.dev` | `KatorinDemo2026!` | WMGPシリーズの主催者。管理画面・申請承認が可能 |
| リーダー | `demo_leader@katorin2.codenica.dev` | `KatorinDemo2026!` | Tyrant Typhoonのチームリーダー。オーダー提出・エントリー申請が可能 |

デモデータ投入: `npx tsx scripts/seed-demo-data.ts`（冪等、再実行可能）

## 注意事項
- `pnpm db:types` 実行後、先頭に `Connecting to db 5432` が出力されるので手動で削除が必要
- ローカルでは `supabase gen types typescript --local` を使う（`--linked` はクラウドDB参照）
- Discordトークンがgit履歴に残っている可能性あり（パスワード変更でトークン無効化済み前提）

## 判断・決定事項
- 「リーグ」と「ラウンド」で分離（leagues/rounds）。旧名: シリーズ/大会
- Ban&Pick・オーダー管理はDiscord管理、Katorinは結果記録のみ
- チームはリーグ所属 or 単発ラウンド所属（排他）、未所属も可（申請前）
- チームエントリーは申請→主催者承認フロー（team_applications テーブル）
- チーム/メンバーの閲覧はリーグ/ラウンドの公開設定に連動（RLS）
- 画像テーマはleagues.theme_config or rounds.theme_config (JSONB)
- ストレージはCloudflare R2（バケット: katorin2-assets）
- 元ネタ「水界の秘石カトリン」＋依頼者の岩石族コミュニティに合わせたデザイン
- デモデータ（is_demo=true）は関係者のみ閲覧可能（RLS制限）
- ラウンド一覧にはリーグ配下のラウンドを表示しない（league_id IS NULLフィルタ）

## セッションメモ（2026-03-17 午後）

### 完了した作業

#### リーグシステム Phase 2〜7 全完了
- **Phase 2**: アプリ層リネーム（series→leagues, tournaments→rounds）73ファイル
- **Phase 3**: ラウンド形式柔軟化（AddRoundDialog, エリミ分岐, ステータス管理）
- **Phase 4**: チーム戦ブラケット表示（TeamRow, BracketMatch型拡張）
- **Phase 5**: 決勝進出（finals-promotion.ts, FinalsPromotionButton）
- **Phase 6**: 没収試合・BYE・タイブレーカー設定UI
- **Phase 7**: テストスクリプト・E2Eのリーグ対応更新

#### WMGPフロー完全検証
- テストスクリプト18/18パス（予選総当たり+決勝ノックアウト）
- ルールブック準拠: ブロック別総当たり→各ブロック上位2チーム→シングルエリミ
- 3v3星取戦BO3、2ラウンド先取、6段階タイブレーカー順位

#### クリーンアップ
- database.ts再生成（is_forfeit/is_bye/is_finals等の新カラム反映）
- as anyキャスト4箇所除去
- ブラケットページのチーム戦統合（isTeamBattle + teams join）
- Vercelデプロイ成功 + 本番DBマイグレーション適用

### 判断・決定事項
- オーダー管理はスコープ外（Discord管理の領分）、Katorinは試合結果記録のみ
- WMGPフローをまず確実に通し、そこから汎用化する方針
- Codex CLIのworktree並列実行パターンを確立（旧コードベースからの分岐に注意）

### 未解決の問題
- ルート構造変更（/tournaments/[id] → /leagues/[leagueId]/rounds/[roundId]）未着手
- byeScore/forfeitScoreのフォームUI未実装（スキーマのみ）
- 単発大会のスコープ（#34）: 依頼者相談待ち
- 通知機能（#13）: ブラウザ通知のみ or メールまでやるか未決定

### 次回の優先事項
1. UI通し確認（ブラウザでWMGPフローを実際に操作）
2. デモデータ更新（決勝ラウンド・BYE・没収試合のサンプル追加）
3. ルート構造のネスト化検討（/leagues/[id]/rounds/[roundId]）
4. ロケットカップ形式のフロー検証

---

## セッションメモ（2026-03-17 午前）

### 完了した作業

#### E2Eテスト・バグ修正
- Playwright E2Eテスト追加（シリーズ一連フロー7ステップ）
- RLSバグ修正: 主催者がチームのseries_id更新できない問題（031マイグレーション）

#### i18n（国際化）
- ハードコード日本語350箇所をnext-intl翻訳キーに置換（31ファイル）
- 翻訳キー569→853（284キー追加、ja/en完全対応）
- types/のラベルマップ削除→labels名前空間に移行

#### Issue整理
- 8件新規起票（#32-#39）
- クローズ: #32(テストスクリプト更新)、#21(ローディング改善)、#20(チームアバター)、#19(プロフィール編集)、#37(マイページアクション)
- #16(チーム戦ブラケット)を再オープン→リーグシステム設計に統合

#### マイページアクション実装
- 個人戦/チーム戦の「次の試合」「結果報告待ち」をアクションカードに表示

#### リーグシステム Phase 1（DBマイグレーション）
- テーブル物理リネーム: series→leagues, tournaments→rounds, tournament_blocks→round_blocks, series_points→league_points
- カラムリネーム: series_id→league_id, tournament_id→round_id, series_config→league_config等
- 新規カラム: rounds(is_finals, source_round_id等), matches(is_forfeit, is_bye)
- RLSポリシー71件、ビュー、関数、トリガー全更新
- 設計書: docs/plan-league-system.md（92点レビュー済み）

### 作業中

#### リーグシステム Phase 2（アプリ層リネーム）
- **git stash** に保存: `WIP: Phase 2 リーグリネーム（ビルド未通過）`
- Codexで8ステップのリネームスクリプト実行済み（Step 1-7完了、Step 8ビルド検証で失敗）
- 残問題:
  1. `src/types/league.ts` が旧テーブル名 `Database['public']['Tables']['series']` を参照（database.ts再生成で'leagues'に変わったため不整合）
  2. `parseSeriesConfig` → `parseLeagueConfig` のリネーム漏れ（tournament-config.tsは手動修正済み）
  3. leagues/配下のページファイルの一部importが旧パスのまま
- 次回の手順:
  1. `git stash pop` でWIP復元
  2. `src/types/league.ts` の `Database['public']['Tables']['series']` → `Database['public']['Tables']['leagues']` に修正
  3. 残りのimport/クエリ漏れを `grep` で全数確認→修正
  4. `pnpm build` が通るまで繰り返し修正
  5. ビルド通過後コミット

### 判断・決定事項
- 「シリーズ」→「リーグ」、「大会」→「ラウンド」に全面改名
- テーブル名は物理リネーム（本番未運用のため破壊的変更OK）
- 各ラウンドの形式（総当たり/スイス/エリミ）は運営が自由に設定可能
- Ban&Pick/オーダー変更はDiscord管理、Katorinは結果記録のみ
- Codex CLIでコーディング委譲する運用フロー構築（scripts/codex-league-rename.sh）

### 未解決の問題
- Phase 2のビルドエラー（stashに保存中）
- 通知機能（#13）: ブラウザ通知のみ or メールまでやるか未決定
- 単発大会のスコープ（#34）: 依頼者相談待ち

### Codex失敗の原因分析と改善策

#### 原因
Phase 2を8つの独立した `codex exec` に分割したが、順序依存がある作業だった:
1. **database.ts再生成のタイミング**: どのステップにも含めなかった。Supabaseクエリが新テーブル名を使うのに型定義は旧名のまま→型エラー大量発生
2. **各ステップが前ステップの結果を見ない**: `codex exec` は毎回新プロセス。Step 4の変更をStep 5は知らない→同じファイルを二重に触って矛盾
3. **置換の順序問題**: re-exportファイルがあるのにimport側がどちらを使うか統一されなかった

#### 改善策（次回のPhase 2やり直し方針）
```
❌ 8つの独立した codex exec
✅ sed/perl一括置換 → git mv → codex exec 1回（ビルド修正のみ）
```
具体手順:
1. `git stash drop` でWIPを破棄（中途半端な状態なので）
2. `supabase gen types typescript --local > src/types/database.ts` で型再生成
3. `sed -i` でテーブル名・カラム名・importパスを全ファイル一括置換（Codex不要、bashの方が確実）
4. `git mv` でファイル/ディレクトリの物理移動
5. Codexには「pnpm buildが通るまでビルドエラーを全て修正して」だけ投げる

### 次回の優先事項
1. **Phase 2 やり直し**: 上記改善策でsed一括置換→git mv→Codexビルド修正
2. **Phase 3-7**: ラウンド形式柔軟化、チーム戦ブラケット、決勝進出等
3. E2Eテスト・テストスクリプトのリーグ対応更新
4. Vercelデプロイ確認

## セッションメモ（2026-03-16）

### 完了した作業

#### デモデータ・RLS修正
- デモデータ表示問題の解決（原因: 本番DBにデータ未投入 + RLSキャッシュ関数のパラメータ名エラー）
- RLSマイグレーション019〜022: teams/team_members循環参照修正、デモユーザー隔離、自動is_demoトリガー
- RLSパフォーマンス改善023〜024: is_demo_user/is_series_demo_memberのセッション変数キャッシュ化
- キャッシュパラメータ名修正030: UUIDをキー名に使えない問題を修正

#### UIリデザイン
- モバイルボトムナビ（大会/シリーズ/チーム/マイページ、safe-area対応）
- Header改修（lucide-reactアイコン、backdrop-blur、コンパクト化）
- 共通コンポーネント（StatusIndicator, MetaItem, PageHeader, EmptyState, BannerImage, PieChart）
- 一覧: サムネイル+アイコン化、ピックアップカード構成
- 詳細: ヒーローバナー、統計アイコン、順位表モバイル列出し分け、チームAvatar
- SeriesFormにカバー画像アップロード追加
- 右寄せレイアウト修正、余白統一（py-8→py-6）

#### 機能実装（6 Issue）
- #6 シリーズ自動ポイント計算（DB trigger + series_points テーブル）
- #8 チェックイン機能（CheckInButton + 管理画面フィルタ）
- #23 ダブルエリミネーション（bracket-generator + RealtimeBracket拡張）
- #25 参加者結果報告（MatchReportDialog + Server Action + 自動確定/disputed）
- #27 デッキ統計・メタ分析（deck-stats + /series/[id]/meta + 円グラフ + オーダー提出状況）
- #29 Discord連携（OAuth + Webhook通知 + フォームURL入力）

#### パフォーマンス
- Vercel Function Regionを東京(hnd1)に設定
- 全ページからforce-dynamic削除
- 主要ページのクエリをPromise.allで並列化
- loading.tsx（Skeleton UI）4ルート追加
- AuthProviderでHeader/BottomNav認証チェック重複解消

#### フォーム簡素化・運用改善
- プリセット廃止→カスタムルール設定のみ（大会形式/チーム構成/スコアリング/オプション）
- シリーズ: entry_type/visibility選択を削除（常にteam/public）
- シリーズ配下の大会: 公開設定非表示、チームエントリー自動引き継ぎ
- 単発大会のチーム戦: 詳細ルール削除→チーム人数上限のみ
- 大会作成時のseries_id連携修正（固定表示、選択不可）
- ルール変更ロック機構（recruiting以降はロック、明示的解除ボタン）
- ブロック振り分けUI（BlockAssignment: ブロック追加/削除/チーム割り当て）

#### CI・インフラ
- Supabase CI修正（SUPABASE_ACCESS_TOKEN更新 + Node.js 24対応）
- Issue整理: 9件クローズ（実装済み）、6件クローズ（今日実装）、3件却下

### 判断・決定事項
- シリーズは常にチーム戦（個人戦シリーズはない）、Discord管理フロー前提
- 単発大会のスコープは依頼者と相談中（チャット機能→電気通信事業法の届出が必要なため見送り）
- スカウティング機能は削除（メタ分析に統合）
- デモユーザー（@katorin2.codenica.dev）はデモデータのみ閲覧、通常ユーザーは非デモのみ

### 未解決の問題
- Next.js 16のルートlayoutに`<html>`/`<body>`が必要な問題（ローカルdev時にエラー。本番は動作）
- ローカルのnext-intl `localePrefix: 'as-needed'` でリライトが効かない（`/series`→404、`/ja/series`→OK）

### 次回の優先事項
1. **Playwright E2Eテスト**: シリーズ一連フロー（作成→チーム申請→承認→ブロック振分→対戦→結果→順位表）の自動テスト
2. **依頼者フィードバック対応**: デモアカウントで実際に触ってもらった結果の修正
3. **単発大会の扱い**: 依頼者と相談中。シリーズのみ or 単発も含めるか
4. テストスクリプト更新（新モデル対応）
5. 画像出力APIのシリーズ対応
6. logo-drafts/の不要SVGファイル整理
