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
  - codenica-vps (133.18.124.75) 上の docker container
  - DB: codenica-vps Postgres docker (`katorin2_staging`)
  - DB user: `katorin2_staging_app`
  - 公開 URL: <https://katorin2-staging.codenica.dev> (Caddy 経由)

設計原則:

- 1つのランタイムが本番DBとdemo DBを動的に切り替えない
- production と staging は完全に分離する
- DB ログインユーザーは service ごとに分け、他サービスと共有しない
- staging がデモ環境を兼ねる（デモデータは staging のみ）
- production にはデモデータを入れない

## production deploy

`main` branch への push で `.github/workflows/deploy-google.yml` が走り、 Cloud Run service `katorin2` を更新する。 手動実行する場合:

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=production \
bash scripts/deploy-cloudrun-ledger.sh
```

runtime env は Secret Manager `katorin2-ledger-runtime-production` を正本にする。 推奨値:

```yaml
LEDGER_DATABASE_USERNAME: katorin2_prod_app
APP_HOST: katorin2.codenica.dev
```

secret 更新:

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=production \
RUNTIME_ENV_FILE=/path/to/ledger.runtime.production.yaml \
bash scripts/push-ledger-runtime-secret.sh
```

migration / one-shot job:

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
APP_ENV=production \
JOB_COMMAND="./bin/rails db:migrate" \
bash scripts/run-ledger-job.sh
```

## staging deploy (codenica-vps)

staging は codenica-vps 上で docker compose 経由で稼働する。 構成は `/opt/katorin2-staging/{docker-compose.yml, secrets.enc.env, up.sh}`。 詳細は [`docs/migrations/cloud-to-vps-2026-05.md`](https://github.com/krtw00/Katorin2/blob/main/docs/migrations/cloud-to-vps-2026-05.md) ではなく `~/dev/docs/migrations/cloud-to-vps-2026-05.md` (= dev 機ローカル) を参照。

image の更新フロー:

1. ローカル/CI でコード修正 → Cloud Build で Artifact Registry に push:
   ```bash
   GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
   gcloud builds submit --config deploy/google/cloudbuild.ledger.yaml \
     --substitutions=_IMAGE=asia-northeast1-docker.pkg.dev/oauthsetting-484201/apps/katorin2-staging:<tag>
   ```
2. digest を控え、 `/opt/katorin2-staging/docker-compose.yml` の `image` を更新
3. VPS で `gcloud auth print-access-token` (Mac 側で生成して scp) → `docker login asia-northeast1-docker.pkg.dev`
4. `cd /opt/katorin2-staging && docker compose pull && ./up.sh`

VPS 上で再起動: `cd /opt/katorin2-staging && ./up.sh`

完全停止: `cd /opt/katorin2-staging && docker compose down && rm -f .env`

secret 編集 (Mac で実施):

```bash
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt \
  sops /opt/katorin2-staging/secrets.enc.env
# 編集後 scp で VPS に上書き
```

seed profile:

- `blank`: データを作らない
- `bootstrap`: 共通運営アカウントだけ作る
- `demo`: demo 運営アカウントと WMGP サンプルデータを作る

staging の現在値: `LEDGER_SEED_PROFILE=demo`、 `APP_HOST=katorin2-staging.codenica.dev`。

## branch 方針

- `main` から production deploy
- `staging` branch は integration 用に残しているが、 自動 deploy は紐付かない (Cloud Run staging は廃止済)

service ごとの DB ユーザー対応は `docs/service-db-users.md` を正本にする。
