# Deployment Environments

Katorin2 Ledger は `production` と `staging` を別環境として運用する。

方針:

- `production`
  - 実運用
  - Cloud Run service: `katorin2`
  - DB: 本番用 Supabase project
- `staging`
  - demo / 検証
  - Cloud Run service: `katorin2-staging`
  - DB: staging 用 Supabase project

設計原則:

- 1つのランタイムが本番DBとdemo DBを動的に切り替えない
- `同じアプリを2環境へデプロイ` し、DB も完全に分離する
- Cloud Run service と runtime secret も環境ごとに分ける
- demo データ判定はテーブルフラグではなく `環境` で分ける
- staging だけ `LEDGER_SEED_PROFILE=demo` を流す
- production は `LEDGER_SEED_PROFILE=blank` か `bootstrap` を使う

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
  - `main` または `release/*` から deploy する
- `develop`
  - shared integration branch としては使ってよい
  - staging の正本にはしない

理由:

- staging は `開発の最新` ではなく `本番候補の特定 SHA` を確認する場所として使う
- `develop = staging` にすると未完成機能が混ざりやすく、staging で見た内容と本番反映 SHA がずれやすい
- まず `main` を常に deploy 可能に保ち、必要な時だけ `release/*` を切る方が追跡しやすい

runtime env は `Secret Manager` を正本にする。既定 secret 名:

- `katorin2-ledger-runtime-production`
- `katorin2-ledger-runtime-staging`

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
- `LEDGER_SEED_PROFILE=demo`

production の推奨値:

- `APP_HOST=katorin2.codenica.dev`
- `LEDGER_SEED_PROFILE=blank`

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
- custom domain や edge proxy は repo 外のインフラ設定として扱い、この repo では Cloud Run deploy だけを管理する
