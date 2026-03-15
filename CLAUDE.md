# Katorin2

遊戯王マスターデュエルのオンライントーナメント運営Webアプリ

## Stack
- TypeScript, Next.js 16, React 19
- UI: shadcn/ui, Tailwind CSS
- Backend: Supabase (PostgreSQL)
- Package Manager: pnpm

## Commands
- `pnpm dev` - 開発サーバー起動
- `pnpm build` - ビルド

## Commands
- `supabase start` - ローカルSupabase起動
- `supabase db reset` - DBリセット（マイグレーション再適用）
- `npx tsx scripts/test-tournament-flow.ts` - 個人戦フローテスト
- `npx tsx scripts/test-team-tournament.ts` - チーム戦(ロケットカップ形式)テスト
- `npx tsx scripts/test-wmgp-flow.ts` - WMGP形式テスト

## Architecture
- Next.js App Router
- Supabase で認証・DB・リアルタイム
- Docker Compose で開発環境構築可能

## 対応大会形式
- 個人戦シングルエリミネーション（実装済み・テスト済み）
- チーム戦スイスドロー（ロケットカップ形式、データ層実装済み）
- チーム戦ブロック別総当たり（WMGP形式、データ層実装済み）

## セッションメモ（2026-03-15）

### 完了した作業
- 個人戦シングルエリミネーションの致命的バグ修正（BYE自動進出、UUID化）
- 管理画面にステータス遷移UI・参加者除外機能追加
- ビルドエラー修正（SSRページのforce-dynamic化、env未設定時フォールバック）
- ローカルSupabase環境構築（.env.local自動設定）
- チーム大会データ層実装（マイグレーション011〜013）
  - war_orders, swiss_standings, war_rounds, tournament_blocks テーブル
  - スイスドロー + 総当たり対戦カード生成ロジック
  - WMGP形式: ブロック別総当たり + 3v3星取戦(BO3) + 6段階タイブレーカー
  - 大会設定の可変化（order_size, sub_count, players_per_round, win_point_value）
  - 画像テーマ設定（theme_config JSONB）
- テストスクリプト3本（個人戦54テスト、チーム戦28テスト、WMGP10テスト、全パス）

### 作業中
- チーム大会のUI実装（Phase 2）
  - 管理画面: ラウンド進行・マッチメイキング・オーダー管理・結果入力
  - 公開ページ: 順位表・War結果・ブロック一覧
- 画像出力API（Phase 3）

### 判断・決定事項
- Ban&PickはDiscord管理、Katorinは結果記録のみ
- WMGP形式を本番運用ターゲットに設定
- 大会設定を可変化（order_size等）で複数形式に対応
- 画像テーマはtournaments.theme_config (JSONB)で大会ごとにカスタマイズ可能に

### 次回の優先事項
1. チーム大会UI実装（管理画面のWar進行管理）
2. 結果入力UI（3v3星取戦×BO3ラウンド）
3. 画像出力API（next/og使用、theme_config反映）
