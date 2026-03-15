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

## セッションメモ（2026-03-15 #2）

### 完了した作業
- Series/Tournament分離リファクタ全Phase完了（015_series_refactor.sql）
  - seriesテーブル新設、series_config (JSONB)でWMGP/ロケットカップ差異を吸収
  - Zodスキーマ + getTournamentConfig()ヘルパー
- 管理者用オーダー入力UI（AdminOrderForm: 両チーム並列）
- シリーズ対応UI（順位表タブ、プリセット選択、round_number順ソート）
- デモデータ再構築（新モデル: series→tournaments(Week1/2)→matches）
- デモアカウント固定化（demo@katorin2.codenica.dev = 主催者、demo_leader = リーダー）
- チームエントリー申請フロー（team_applications テーブル + UI）
- チーム/メンバーRLSを公開設定連動に修正
- デモデータのRLS制限（is_demo=true → 関係者のみ閲覧）
- UI改善（パンくず、スコアカード、統計カード、情報密度改善）
- クラウドDBにマイグレーション015〜018適用

### 未解決の問題
- **本番でシリーズ一覧にデモシリーズが表示されない**
  - DBにはデータ存在（API検証済み）
  - Vercelデプロイ済み（state: READY、sha: 1a1ec21）
  - Cloudflare DNSプロキシ解除済み
  - シークレットウィンドウでも再現
  - 原因不明: サーバーコンポーネントのSupabaseセッションがデモユーザーのRLSを通していない可能性
  - 調査方法: `pnpm dev` でローカル確認、またはRLSを一時的にデモ制限なしにして切り分け

### 次回の優先事項
1. **本番シリーズ表示問題の解決**（上記未解決問題の調査）
2. テストスクリプト更新（新モデル対応）
3. 画像出力APIのシリーズ対応
4. logo-drafts/の不要SVGファイル整理
