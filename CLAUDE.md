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
- **シリーズ** (`series`): 複数節にまたがる長期イベント（WMGP, ロケットカップ等）
- **大会** (`tournaments`): シリーズ内の1節、または単発イベント（将軍CS等）
- **War** (`matches`): チーム対チームの試合全体
- ルール設定は `series.series_config` (JSONB) でシリーズごとに柔軟に変更可能
- 設定取得は `getTournamentConfig()` で統一（シリーズ/単発を自動判定）
- 設計書: `docs/plan-series-refactor.md`

## 対応大会形式
- 個人戦シングルエリミネーション
- チーム戦スイスドロー（ロケットカップ形式: Ban&Pick、デッキテーマ被り禁止）
- チーム戦ブロック別総当たり（WMGP形式: 3v3星取戦BO3、6段階タイブレーカー）
- ルールプリセット: `src/lib/schemas/series-config.ts` に `WMGP_CONFIG` / `ROCKET_CUP_CONFIG`

## デモアカウント
| 役割 | メール | パスワード | 用途 |
|------|--------|-----------|------|
| 主催者 | `demo@katorin2.codenica.dev` | `KatorinDemo2026!` | WMGPシリーズの主催者。管理画面・申請承認が可能 |
| リーダー | `demo_leader@katorin2.codenica.dev` | `KatorinDemo2026!` | Tyrant Typhoonのチームリーダー。オーダー提出・エントリー申請が可能 |

デモデータ投入: `npx tsx scripts/seed-demo-data.ts`（冪等、再実行可能）

## 注意事項
- `pnpm db:types` 実行後、database.ts末尾のレガシーexport（TournamentFormat等）が消えるので手動で再追加が必要
- ローカルでは `supabase gen types typescript --local` を使う（`--linked` はクラウドDB参照）
- Discordトークンがgit履歴に残っている可能性あり（パスワード変更でトークン無効化済み前提）

## 判断・決定事項
- 「シリーズ」と「大会」は明確に分離（series/tournament）
- Ban&PickはDiscord管理、Katorinは結果記録のみ
- チームはシリーズ所属 or 単発大会所属（排他）、未所属も可（申請前）
- チームエントリーは申請→主催者承認フロー（team_applications テーブル）
- チーム/メンバーの閲覧はシリーズ/大会の公開設定に連動（RLS）
- 画像テーマはseries.theme_config or tournaments.theme_config (JSONB)
- ストレージはCloudflare R2（バケット: katorin2-assets）
- 元ネタ「水界の秘石カトリン」＋依頼者の岩石族コミュニティに合わせたデザイン
- デモデータ（is_demo=true）は関係者のみ閲覧可能（RLS制限）
- 大会一覧にはシリーズ配下の大会を表示しない（series_id IS NULLフィルタ）

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
