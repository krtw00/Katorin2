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

## 対応大会形式
- 個人戦シングルエリミネーション（実装済み・テスト済み）
- チーム戦スイスドロー（ロケットカップ形式、全層実装済み）
- チーム戦ブロック別総当たり（WMGP形式、全層実装済み）

## 注意事項
- `pnpm db:types` 実行後、database.ts末尾のレガシーexport（TournamentFormat等）が消えるので手動で再追加が必要
- Discordトークンがgit履歴に残っている可能性あり（パスワード変更でトークン無効化済み前提）

## セッションメモ（2026-03-15）

### 完了した作業
- 個人戦シングルエリミネーション致命バグ修正（BYE自動進出、UUID化）
- 管理画面にステータス遷移UI・参加者除外機能追加
- ビルドエラー修正（force-dynamic化、envフォールバック）
- チーム大会データ層（マイグレーション011〜014）
- スイスドロー/総当たり対戦カード生成ロジック
- WMGP形式: ブロック別総当たり + 3v3星取戦(BO3) + 6段階タイブレーカー
- 大会設定の可変化（order_size, players_per_round, win_point_value等）
- テストスクリプト3本（個人戦54, チーム戦28, WMGP10, 全パス）
- Vercelデプロイ + Cloudflare DNS設定（katorin2.codenica.dev）
- Supabaseクラウドにマイグレーション適用
- Cloudflare R2ストレージ統合（バケット: katorin2-assets）
- supabase gen types 自動生成に移行
- Zod + React Hook Form 導入
- チーム大会管理UI（ブロック分け・対戦カード自動生成・進行管理）
- オーダー提出フォーム（メイン+サブ×デッキ名/テーマ）
- War一覧/詳細/結果入力ページ
- ブロック順位表ページ（WMGP形式/スイスドロー両対応）
- 画像出力API（War結果画像・順位表画像、theme_configでカスタマイズ可）
- 大会作成フォームにチーム戦設定追加
- ファビコン刷新（岩石+秘石カトリンモチーフ）
- ヘッダー「Katorin2」+アイコン表示
- 大会詳細ページをチーム戦/個人戦で分岐表示
- WMGPのDiscordから実データ取得 → デモデータ投入（16チーム96人、14試合結果付き）
- デモ管理者アカウント作成（demo@katorin2.codenica.dev / KatorinDemo2026!）

### 判断・決定事項
- Ban&PickはDiscord管理、Katorinは結果記録のみ
- WMGP形式を本番運用ターゲット
- 画像テーマはtournaments.theme_config (JSONB)で大会ごとにカスタマイズ
- ストレージはSupabase Storage(1GB制限)からCloudflare R2(10GB無料)に移行
- スタックは現状が最適解（変えるべきは開発体験レイヤーのみ）
- 元ネタ「水界の秘石カトリン」＋依頼者の岩石族コミュニティに合わせたデザイン

### 次回の優先事項
1. オーダー入力を管理者/チームリーダー両方から可能にする
2. 管理者用War一括オーダー入力UI（両チーム分を一画面で）
3. チームエントリーUI（チームリーダーが大会にエントリーするフォーム）
4. 画像出力の改善（デッキ名表示、レイアウト調整）
5. logo-drafts/の不要SVGファイルを整理
