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
