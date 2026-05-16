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
  - Cloud SQL: `katorin2` @ `main-pg`
  - DB user: `katorin2_prod_app`
- `staging`
  - codenica-vps docker (`/opt/katorin2-staging/`)
  - codenica-vps Postgres docker: `katorin2_staging`
  - DB user: `katorin2_staging_app`
  - URL: <https://katorin2-staging.codenica.dev>

アプリは 1 つの DB を見る。demo データはテーブル内フラグでなく、`staging` 環境そのものに閉じ込める。production と staging はランタイムも DB も完全に分離する。DB ログインユーザーも service ごとに分離し、他サービスと共有しない。

共通の DB ユーザー運用は [docs/service-db-users.md](../../docs/service-db-users.md) を参照。

## Required Env

- `LEDGER_DATABASE_NAME`
- `LEDGER_DATABASE_USERNAME`
- `LEDGER_DATABASE_PASSWORD`
- `LEDGER_DATABASE_HOST`
- `RAILS_MASTER_KEY`
- `SECRET_KEY_BASE`
- `APP_HOST`

## Seed

`bin/rails db:seed` で bootstrap アカウントとデモデータを投入する。ステージング環境がデモ環境を兼ねる。

## Current Status

2026-03-20 時点:

- Rails 側は `League`, `Phase`, `Week`, `Match` の作成、更新、参照を優先している
- 業務データの `destroy` ルートと UI は未実装
- `DELETE` が生きているのは `session` のログアウトだけ
- モデル関連には `dependent: :destroy` を設定しているので、削除導線を追加すれば関連データの連鎖削除は可能
- `Match` は `cancelled` status を持つため、物理削除より状態遷移で閉じる運用を優先する余地がある
- 旧 Next.js 側の削除機能は参照用に残っているが、Rails 側へはまだ移植していない

## Deploy

production (Cloud Run):

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=production \
RUNTIME_ENV_FILE=/path/to/ledger.runtime.production.yaml \
bash scripts/deploy-cloudrun-ledger.sh
```

staging (codenica-vps): `../../docs/deployment-environments.md` を参照。 image push は Cloud Build、 反映は VPS 上で `docker compose pull && /opt/katorin2-staging/up.sh`。
