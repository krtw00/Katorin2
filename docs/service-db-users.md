# Service DB Users

`main-pg` は service ごとに DB ログインユーザーを分離して運用する。

運用ルール:

- Cloud Run service / job ごとに専用ログインユーザーを使う
- 共有ログインを新規に作らない
- 既存オブジェクト owner は `app-user` に残してよいが、`app-user` は `NOLOGIN` に保つ
- 新しい service を追加する時は `scripts/provision-cloudsql-service-user.sh` を使って専用ユーザーを作る

現在の対応表:

| Service | Database | DB user | Secret / config source |
|---|---|---|---|
| `katorin2` | `katorin2` | `katorin2_prod_app` | `katorin2-ledger-runtime-production` |
| `katorin2-staging` | `katorin2-staging` | `katorin2_staging_app` | `katorin2-ledger-runtime-staging` |
| `katorin2-*` jobs | `katorin2` / `katorin2-staging` | service と同じ | Cloud Run Job env |
| `duel-log-api` | `duellog` | `duel_log_app` | `duel-log-database-url` |
| `duel-log-api-staging` | `duellog-staging` | `duel_log_staging_app` | `duel-log-staging-database-url` |
| `konbu` | `konbu` | `konbu_app` | `konbu-database-url` |
| `shadova-log` | `shadova` | `shadova_log_app` | `shadova-log-db-password` + `DB_USERNAME` |

補足:

- `main-pg-postgres-admin-password`
  - Cloud SQL 管理作業用。通常運用のアプリからは使わない
- `cloudsql-app-user-password`
  - 旧 shared login 用の legacy secret
  - 現行 Cloud Run service / job では参照していない
  - 2026-04-03 に version 1 / 2 を disabled 済み
  - 復旧用途が不要と確認できたら secret 自体を削除する

切替の影響:

- DB ユーザー切替では Cloud Run service ごとに新 revision が作られる
- アプリコードの再ビルドは不要でも、設定更新だけで revision rollout は発生する
- `katorin2` 系 job は job definition 更新が必要
- `scripts/deploy-cloudrun-ledger.sh`, `scripts/run-ledger-job.sh`, `scripts/push-ledger-runtime-secret.sh` は `app-user` を拒否する

最小手順:

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
GOOGLE_CLOUD_REGION=asia-northeast1 \
SERVICE_DB_USER=my_service_app \
OWNER_ROLE=app-user \
SECRET_NAME=my-service-database-url \
SECRET_PAYLOAD_KIND=database_url \
DB_NAME=my_database \
bash scripts/provision-cloudsql-service-user.sh
```

その後、Cloud Run service / job の env を新しい secret かユーザーへ切り替えて検証する。
