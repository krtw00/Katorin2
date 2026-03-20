# Deployment Environments

Katorin2 Ledger は `production` と `staging` を別環境として運用する。

方針:

- `production`
  - 実運用
  - Cloud Run service: `katorin2`
  - Firebase Hosting site: `katorin2-site`
  - DB: 本番用 Supabase project
- `staging`
  - demo / 検証
  - Cloud Run service: `katorin2-staging`
  - Firebase Hosting site: `katorin2-staging`
  - DB: staging 用 Supabase project

設計原則:

- 1つのランタイムが本番DBとdemo DBを動的に切り替えない
- `同じアプリを2環境へデプロイ` し、DB も完全に分離する
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

Firebase Hosting deploy:

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=production \
bash scripts/deploy-firebase-katorin2.sh
```

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=staging \
bash scripts/deploy-firebase-katorin2.sh
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

Custom domain:

- `codenica.dev` の権威 DNS は現在 Cloudflare
- `staging.katorin2.codenica.dev` は Firebase Hosting 側で予約済み
- Cloudflare 側に次を追加すると有効化が進む

```txt
CNAME
staging.katorin2.codenica.dev -> katorin2-staging.web.app
```

```txt
TXT
_acme-challenge.staging.katorin2.codenica.dev -> sV2SPVFr06mhd6IIJL4NFshKid4CSPpQkcOCUTP26sc
```

Cloud DNS `codenica-dev` に同内容を入れても、現行の権威 DNS は Cloudflare なので外部公開には使われない。
