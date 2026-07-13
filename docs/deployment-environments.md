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

1. GitHub Actions の Buildx で `apps/ledger/Dockerfile.cloudrun` (image 名は歴史的、 中身は VPS でも動く Rails 本番 image) を build し、 `ghcr.io/krtw00/katorin2:production-<full_sha>` として GHCR に push
2. SSH (`ubuntu@codenica-vps`) で `/opt/katorin2/docker-compose.yml` の image を `ghcr.io/krtw00/katorin2@sha256:<digest>` に置換
3. `docker compose pull && ./up.sh` で再起動 (entrypoint で `db:prepare` = migration 自動実行)
4. container が指定 digest を使っていること、 `http://127.0.0.1:8012/up`、 Rails からの DB `SELECT 1` を確認

VPS 上の構成: `/opt/katorin2/{docker-compose.yml, secrets.enc.env, up.sh}`、 image digest pin あり、 sops/age 暗号化。 deploy workflow は secret の値を取得・表示・ローカルへコピーせず、 VPS 上の既存 `secrets.enc.env` と `up.sh` を使う。 secret 変更は deploy と分離した承認済みの VPS 内作業として扱う。

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

1. GitHub Actions の Buildx で `apps/ledger/Dockerfile.cloudrun` を build し、 `ghcr.io/krtw00/katorin2:staging-<full_sha>` として GHCR に push
2. SSH (`ubuntu@codenica-vps`) で `/opt/katorin2-staging/docker-compose.yml` の image を `ghcr.io/krtw00/katorin2@sha256:<digest>` に置換
3. `docker compose pull && ./up.sh` で再起動 (= entrypoint で `db:prepare` = migration 自動実行)
4. container が指定 digest を使っていること、 `http://127.0.0.1:8002/up`、 Rails からの DB `SELECT 1` を確認

deploy のたびに staging app は起動状態になる。 DB は触らない (= `katorin2_staging` の中身はそのまま)。 本番 snapshot を当て直したい時は別途 [`scripts/staging-up.sh`](../scripts/staging-up.sh) を手動で流す ([`docs/staging-on-demand.md`](staging-on-demand.md) 参照)。

手動 deploy は GitHub Actions の `Deploy Staging` workflow を `workflow_dispatch` で `main` branch に対して実行する。 production は同様に `Deploy` workflow を使う。

VPS 上で再起動だけしたい時: `cd /opt/katorin2-staging && ./up.sh`

完全停止: `cd /opt/katorin2-staging && docker compose down && rm -f .env`

staging も deploy workflow は secret の値を取得・表示・ローカルへコピーせず、 VPS 上の既存 `secrets.enc.env` と `up.sh` を使う。 secret 変更は deploy と分離した承認済みの VPS 内作業として扱う。

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
