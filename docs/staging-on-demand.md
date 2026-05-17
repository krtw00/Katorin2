# Staging on-demand 運用

staging (`katorin2-staging`) は **常時起動しない** 運用に変更した。 デプロイ検証や本番データを使った解析が必要なときだけ起動し、 起動時に本番 DB (`katorin2`) を staging DB (`katorin2_staging`) へ自動 restore する。 cron / 日次 restore は無し。

## 方針

- staging app コンテナ (`katorin2-staging`) は通常停止 (`docker compose down`)
- 起動時に本番 DB の最新 snapshot で staging DB を drop → create → restore で上書き
- staging 起動中は自分で stop するまでデータが固定 (= 検証中にデータが吹き飛ばない)
- 解析クエリも同じ仕組みで staging DB を直接使えば本番無関係に実行可能

systemd unit は元々存在せず、 staging の自動起動は docker compose の `restart: unless-stopped` だけが効いている。 VPS 再起動時に staging が勝手に立たないようにするには、 `/opt/katorin2-staging/docker-compose.yml` の `restart: unless-stopped` を `restart: "no"` に書き換える (1 回手動で実施すれば永続)。

## 起動 (本番 snapshot 反映 + アプリ起動)

ローカル Mac から:

```bash
ssh codenica-vps 'bash -s' < scripts/staging-up.sh
```

VPS 上で直接実行する場合:

```bash
ssh codenica-vps
bash /path/to/Katorin2/scripts/staging-up.sh
```

実行内容:

1. staging app を `docker compose down` で停止 (DB セッションを離す)
2. `katorin2_staging` の残存セッションを `pg_terminate_backend` で切る
3. `pg_dump --format=custom --no-owner --no-privileges` で `katorin2` を postgres コンテナ内に dump
4. `DROP DATABASE katorin2_staging` → `CREATE DATABASE katorin2_staging OWNER katorin2_staging_app`
5. `pg_restore --no-owner --no-acl --role=katorin2_staging_app` で restore (= objects は staging app user 所有になり、 別途 GRANT 文不要)
6. `/opt/katorin2-staging/up.sh` (sops 復号 + `docker compose up -d`) で staging アプリ起動

完了後、 <https://katorin2-staging.codenica.dev> (Caddy 経由) でログイン可能。

### 環境変数で上書き

スクリプトは以下を環境変数で上書き可能 (= 通常は不要、 別ホスト / 別 DB 名で流用する時用):

| 変数 | 既定値 |
|---|---|
| `POSTGRES_CONTAINER` | `postgres` |
| `PROD_DB` | `katorin2` |
| `STAGING_DB` | `katorin2_staging` |
| `STAGING_DB_USER` | `katorin2_staging_app` |
| `STAGING_COMPOSE_DIR` | `/opt/katorin2-staging` |
| `DUMP_FILE` | `/tmp/katorin2_<timestamp>.dump` |

## 停止

```bash
ssh codenica-vps 'bash -s' < scripts/staging-down.sh
```

staging app コンテナを停止し `.env` を削除する (= sops 復号した平文を残さない)。 DB は次回 `staging-up.sh` の drop で吹き飛ぶので、 そのまま残してよい。

## 解析クエリだけ流したい

staging アプリは要らず staging DB で本番直近データを叩きたい場合は、 staging-up.sh を 1 回流して staging-down.sh で app だけ停止する。 DB は残るので `docker exec -it postgres psql -U postgres -d katorin2_staging` で接続できる。

## トラブルシュート

- **`DROP DATABASE` が失敗する**: 接続中セッションが残っている。 script で `pg_terminate_backend` を実行しているが、 別画面で `psql` 接続している場合は手で抜く
- **`pg_restore` が `--role` で fail**: postgres superuser で接続しているか確認 (`docker exec ... -U postgres`)
- **staging app の起動が遅い / failed**: `docker compose -f /opt/katorin2-staging/docker-compose.yml logs app` でログ確認、 `/opt/katorin2-staging/.env` が生成されているか確認
- **dump 中の disk 不足**: dump は postgres コンテナ内 `/tmp/` (= ボリュームではなく container layer)。 必要なら `DUMP_FILE` を別 path に切り替える

## sensitive data の扱い

`katorin2` 本番には参加者の表示名 / チーム名 / Judge名 / デッキ名等が含まれる。 staging は codenica-vps 内に閉じて同じ運用者が触る限り機密度は production と同等として扱う。 staging URL や DB アクセス権限が他者に広がる時点で別途 masking を検討する。

## 関連

- [`scripts/staging-up.sh`](../scripts/staging-up.sh)
- [`scripts/staging-down.sh`](../scripts/staging-down.sh)
- [`docs/deployment-environments.md`](deployment-environments.md) — production / staging 全体構成
- [`docs/service-db-users.md`](service-db-users.md) — DB ユーザー対応表
