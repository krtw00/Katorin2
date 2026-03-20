# Katorin2 Ledger

Rails 8 ベースの WMGP 運営台帳アプリ。

## Runtime

- Ruby 3.4
- PostgreSQL
- Cloud Run

## Local Development

PostgreSQL は開発用に Docker で起動できる。

```bash
cd apps/ledger
docker compose -f compose.dev.yml up -d
eval "$(rbenv init - zsh)"
bundle install
bundle exec rails db:prepare
bin/dev
```

`LEDGER_DATABASE_URL` を未指定のままでも、development と test は次のローカル DB を使う。

- `postgresql://postgres:postgres@127.0.0.1:5433/ledger_development`
- `postgresql://postgres:postgres@127.0.0.1:5433/ledger_test`

## Environment Split

- `production`
  - Cloud Run: `katorin2`
  - 本番 Supabase project
- `staging`
  - Cloud Run: `katorin2-staging`
  - staging Supabase project

アプリは 1 つの DB を見る。demo データはテーブル内フラグでなく、`staging` 環境そのものに閉じ込める。Cloud Run service と Secret Manager secret も環境ごとに分離する。

## Required Env

- `LEDGER_DATABASE_URL`
- `RAILS_MASTER_KEY`
- `SECRET_KEY_BASE`
- `APP_HOST`

任意:

- `LEDGER_SEED_PROFILE`
  - `blank`
  - `bootstrap`
  - `demo`

## Seed Profiles

- `blank`
  - 何も作らない
- `bootstrap`
  - 共通運営アカウントだけ作る
- `demo`
  - `demo / password` と demo WMGP データを作る

## Current Status

2026-03-20 時点:

- Rails 側は `League`, `Phase`, `Week`, `Match` の作成、更新、参照を優先している
- 業務データの `destroy` ルートと UI は未実装
- `DELETE` が生きているのは `session` のログアウトだけ
- モデル関連には `dependent: :destroy` を設定しているので、削除導線を追加すれば関連データの連鎖削除は可能
- `Match` は `cancelled` status を持つため、物理削除より状態遷移で閉じる運用を優先する余地がある
- 旧 Next.js 側の削除機能は参照用に残っているが、Rails 側へはまだ移植していない

## Deploy

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=production \
RUNTIME_ENV_FILE=/path/to/ledger.runtime.production.yaml \
bash scripts/deploy-cloudrun-ledger.sh
```

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=staging \
RUNTIME_ENV_FILE=/path/to/ledger.runtime.staging.yaml \
bash scripts/deploy-cloudrun-ledger.sh
```
