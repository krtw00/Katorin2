# Katorin2

トーナメント運営システム - 遊戯王マスターデュエル向け

## 技術スタック

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (PostgreSQL + Auth + Realtime)
- Vercel (ホスティング)

## 開発環境（Docker）

```bash
# 起動（Traefik起動後）
cd ~/work/projects/Katorin2
docker compose up -d

# アクセス
http://katorin.localhost

# ログ確認
docker compose logs -f app

# 停止
docker compose down
```

## ローカル開発

```bash
pnpm install
pnpm dev
# http://localhost:3000
```

## 環境変数

`.env.local`に以下を設定:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

## 主な機能

- 大会作成・管理
- シングルエリミネーションブラケット
- エントリー管理
- リアルタイムトーナメント表
