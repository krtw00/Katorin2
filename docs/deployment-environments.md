# Deployment Environments

Katorin2 Ledger は `production` と `staging` を別環境として運用する。 両方とも codenica-vps (133.18.124.75) 上で稼働する。

方針:

- `production`
  - 実運用
  - codenica-vps 上の docker container (`/opt/katorin2/`, port 8012)
  - DB: codenica-vps Postgres docker (`katorin2`)
  - DB user: `katorin2_prod_app`
  - 公開 URL: <https://katorin2.codenica.dev> (Caddy 経由)
- `staging`
  - demo / 検証
  - codenica-vps 上の docker container (`/opt/katorin2-staging/`, port 8002)
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

`main` branch への push で `.github/workflows/deploy.yml` が走る。 流れ:

1. Cloud Build で `Dockerfile.cloudrun` (image 名は歴史的、 中身は VPS でも動く Rails 本番 image) を `production-ledger-<short_sha>` tag で AR に push
2. SSH (`ubuntu@codenica-vps`) で `/opt/katorin2/docker-compose.yml` の image digest を sed 置換
3. `docker compose pull && ./up.sh` で再起動 (entrypoint で `db:prepare` = migration 自動実行)
4. `http://127.0.0.1:8012/up` の health check で deploy 完了確認

VPS 上の構成: `/opt/katorin2/{docker-compose.yml, secrets.enc.env, up.sh}`、 image SHA pin あり、 sops/age 暗号化。 secret 編集は Mac で:

```bash
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt \
  sops /opt/katorin2/secrets.enc.env
# 編集後 scp で VPS に上書き
```

migration は entrypoint で自動実行されるので明示 job 不要。 任意で手動実行する場合:

```bash
ssh codenica-vps "cd /opt/katorin2 && docker compose run --rm app ./bin/rails db:migrate"
```

完全停止 / 再起動:

```bash
ssh codenica-vps "cd /opt/katorin2 && docker compose down && rm -f .env"
ssh codenica-vps "cd /opt/katorin2 && ./up.sh"
```

## staging deploy (codenica-vps)

staging は codenica-vps 上で docker compose 経由で稼働する。 構成は `/opt/katorin2-staging/{docker-compose.yml, secrets.enc.env, up.sh}`。 詳細は [`docs/migrations/cloud-to-vps-2026-05.md`](https://github.com/krtw00/Katorin2/blob/main/docs/migrations/cloud-to-vps-2026-05.md) ではなく `~/dev/docs/migrations/cloud-to-vps-2026-05.md` (= dev 機ローカル) を参照。

staging は常時起動せず on-demand 運用に変更した。 起動 / 停止と本番 DB snapshot の自動 restore 手順は [`docs/staging-on-demand.md`](staging-on-demand.md) を参照。

`main` への push (= PR merge 経由) で `.github/workflows/deploy-staging.yml` が走り、 staging image の更新と app 再起動が自動化される。 production の `deploy.yml` と並列に独立した job として動く。 流れ:

1. Cloud Build で `apps/ledger/Dockerfile.cloudrun` を `staging-<short_sha>` tag で AR (`katorin2-staging`) に push
2. SSH (`ubuntu@codenica-vps`) で `/opt/katorin2-staging/docker-compose.yml` の image digest を sed 置換 (= `katorin2-staging@sha256:...` 形式の pin 前提)
3. `docker compose pull && ./up.sh` で再起動 (= entrypoint で `db:prepare` = migration 自動実行)
4. `http://127.0.0.1:8002/up` の health check で deploy 完了確認

deploy のたびに staging app は起動状態になる。 DB は触らない (= `katorin2_staging` の中身はそのまま)。 本番 snapshot を当て直したい時は別途 [`scripts/staging-up.sh`](../scripts/staging-up.sh) を手動で流す ([`docs/staging-on-demand.md`](staging-on-demand.md) 参照)。

手動 deploy (= 緊急時 / CI 不通時) の fallback:

1. Cloud Build を手で投げる:
   ```bash
   GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
   gcloud builds submit --config deploy/google/cloudbuild.ledger.yaml \
     --substitutions=_IMAGE=asia-northeast1-docker.pkg.dev/oauthsetting-484201/apps/katorin2-staging:staging-<short_sha>
   ```
2. digest を控え、 `/opt/katorin2-staging/docker-compose.yml` の `image` を更新
3. VPS で `gcloud auth print-access-token` (Mac 側で生成して scp) → `docker login asia-northeast1-docker.pkg.dev`
4. `cd /opt/katorin2-staging && docker compose pull && ./up.sh`

または GitHub Actions の `Deploy Staging` workflow を `workflow_dispatch` で手動実行する。

VPS 上で再起動だけしたい時: `cd /opt/katorin2-staging && ./up.sh`

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

## Active Storage (添付ファイルの永続化)

Active Storage は `DiskService` (`/rails/storage`)。 これを **永続ボリュームにマウントしないと、 デプロイ (`docker compose up` でコンテナ再作成) のたびに blob 実体ファイルが全消失**する (DB の添付レコードだけ残り画像が壊れる)。 KAT-34。

staging (`/opt/katorin2-staging/docker-compose.yml`) / production (`/opt/katorin2/docker-compose.yml`) とも、 app service に名前付きボリュームを割り当てる:

```yaml
services:
  app:
    volumes:
      - katorin2_staging_storage:/rails/storage   # prod は katorin2_storage
volumes:
  katorin2_staging_storage:
```

- image digest の sed 置換 (deploy.yml / deploy-staging.yml) とは非干渉なので、 ボリューム設定は deploy をまたいで残る。
- 生成済みカード (`public/generated`) は派生データなのでボリューム不要 (デプロイ後の初回 download で自動再生成される)。
- VPS の compose は repo 管理外。 新規ホスト構築時はこのボリューム設定を忘れないこと。

## branch 方針

- `main` から production deploy (`.github/workflows/deploy.yml`) と staging deploy (`.github/workflows/deploy-staging.yml`) が並列に走る
- `staging` branch は integration 用に残しているが、 自動 deploy は紐付かない (= 必要なら `workflow_dispatch` で手動実行)

service ごとの DB ユーザー対応は `docs/service-db-users.md` を正本にする。
