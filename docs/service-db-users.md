# Service DB Users

service ごとに DB ログインユーザーを分離して運用する。 katorin2 系は 2026-05-16 で完全に codenica-vps Postgres に集約済 (Cloud SQL `main-pg` は konbu のみが残置)。

運用ルール:

- service / job ごとに専用ログインユーザーを使う
- 共有ログインを新規に作らない
- 既存オブジェクト owner は service ユーザー (`katorin2_prod_app` 等) でよい
- 新しい service を追加する時は `psql -U postgres` で role + DB を作成 (provision script は Cloud SQL 専用のため使わない)

現在の対応表:

| Service | Database | DB user | Secret / config source |
|---|---|---|---|
| `katorin2` (codenica-vps docker, production) | codenica-vps Postgres `katorin2` | `katorin2_prod_app` | `/opt/katorin2/secrets.enc.env` (sops/age) |
| `katorin2-staging` (codenica-vps docker) | codenica-vps Postgres `katorin2_staging` | `katorin2_staging_app` | `/opt/katorin2-staging/secrets.enc.env` (sops/age) |
| `duel-log-api` (codenica-vps docker, production) | codenica-vps Postgres `duellog` | `duel_log_app` | `/opt/duel-log-api/secrets.enc.env` (sops/age) |
| `duel-log-api-staging` (codenica-vps docker) | codenica-vps Postgres `duellog_staging` | `duel_log_staging_app` | `/opt/duel-log-api-staging/secrets.enc.env` (sops/age) |
| `konbu` | Cloud SQL `konbu` | `konbu_app` | `konbu-database-url` (VPS 移行対象外、 課金導線あり) |

補足:

- `main-pg-postgres-admin-password`
  - Cloud SQL 管理作業用。通常運用のアプリからは使わない
- `cloudsql-app-user-password`
  - 旧 shared login 用の legacy secret
  - 現行 Cloud Run service / job では参照していない
  - 2026-04-03 に version 1 / 2 を disabled 済み
  - 復旧用途が不要と確認できたら secret 自体を削除する

切替の影響:

- katorin2 の DB ユーザー切替では、VPS 上の既存 `secrets.enc.env` を更新して Compose service を再作成する
- secret の値は取得・表示・ローカルコピーせず、VPS 内の承認済み作業として扱う
- production / staging とも `/up` と Rails からの `SELECT 1` を確認する
- 旧 Cloud Run service / job / Secret Manager は現行 consumer ではなく、GCP 離脱時の削除対象として別管理する

Cloud SQL について:

- `main-pg` は `konbu` が継続利用しているため削除しない
- Cloud SQL のユーザー・DB・管理 secret は、全 consumer とデータ保持方針を確認するまで変更・削除しない
- konbu の Cloud SQL 運用は konbu repo を正本とする
