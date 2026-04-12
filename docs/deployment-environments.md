# Deployment Environments

Katorin2 Ledger は `production` と `staging` を別環境として運用する。

方針:

- `production`
  - 実運用
  - Cloud Run service: `katorin2`
  - DB: Cloud SQL `katorin2` @ `main-pg`
  - DB user: `katorin2_prod_app`
- `staging`
  - demo / 検証
  - Cloud Run service: `katorin2-staging`
  - DB: Cloud SQL `katorin2-staging` @ `main-pg`
  - DB user: `katorin2_staging_app`

設計原則:

- 1つのランタイムが本番DBとdemo DBを動的に切り替えない
- `同じアプリを2環境へデプロイ` し、DB も完全に分離する
- Cloud Run service と runtime secret も環境ごとに分ける
- DB ログインユーザーは service ごとに分け、他サービスと共有しない
- staging がデモ環境を兼ねる（デモデータは staging のみ）
- production にはデモデータを入れない

Cloud Run deploy:

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=production \
bash scripts/deploy-cloudrun-ledger.sh
```

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=staging \
bash scripts/deploy-cloudrun-ledger.sh
```

branch 方針:

- `production`
  - `main` からだけ deploy する
- `staging`
  - `staging` から deploy する
- `staging` branch
  - staging 用の統合作業場として使う

理由:

- staging は `staging` branch の確認環境として使う
- `main` は production 専用にして、staging 確認後に `staging -> main` を反映する方がシンプルに回る

runtime env は `Secret Manager` を正本にする。既定 secret 名:

- `katorin2-ledger-runtime-production`
- `katorin2-ledger-runtime-staging`

runtime env の推奨 DB ユーザー:

- `production`
  - `LEDGER_DATABASE_USERNAME=katorin2_prod_app`
- `staging`
  - `LEDGER_DATABASE_USERNAME=katorin2_staging_app`

secret 更新:

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=staging \
RUNTIME_ENV_FILE=/path/to/ledger.runtime.staging.yaml \
bash scripts/push-ledger-runtime-secret.sh
```

seed profile:

- `blank`
  - データを作らない
- `bootstrap`
  - 共通運営アカウントだけ作る
- `demo`
  - demo 運営アカウントと WMGP サンプルデータを作る

staging の推奨値:

- `APP_HOST=katorin2-staging.web.app`

production の推奨値:

- `APP_HOST=katorin2.codenica.dev`

Cloud Run one-shot job:

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=staging \
JOB_COMMAND="./bin/rails db:seed" \
bash scripts/run-ledger-job.sh
```

staging / production の切り分け:

- `production` は `katorin2` service と `katorin2-ledger-runtime-production` secret を使う
- `staging` は `katorin2-staging` service と `katorin2-ledger-runtime-staging` secret を使う
- `katorin2` 系の job も対応する service 専用 DB ユーザーを使う
- custom domain や edge proxy は repo 外のインフラ設定として扱い、この repo では Cloud Run deploy だけを管理する

service ごとの DB ユーザー対応は `docs/service-db-users.md` を正本にする。
