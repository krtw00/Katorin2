# Ledger Cutover

## 方針

既存の `katorin2.codenica.dev` は Firebase Hosting から Cloud Run `katorin2` を指している。

そのため、サイト差し替えは次で足りる。

- Cloud Run `katorin2` に Rails イメージを再デプロイする
- Firebase Hosting の rewrite は変更しない

つまり、`serviceId: katorin2` を維持したままアプリ本体だけ置き換える。

## 追加したもの

- `apps/ledger/Dockerfile.cloudrun`
- `deploy/google/cloudbuild.ledger.yaml`
- `deploy/google/ledger.runtime.example.yaml`
- `scripts/export-katorin2-cloudrun-env.sh`
- `scripts/deploy-cloudrun-ledger.sh`

## 手順

### 1. 既存 env を Cloud Run から取得

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
GOOGLE_CLOUD_REGION=asia-northeast1 \
scripts/export-katorin2-cloudrun-env.sh > /tmp/katorin2-current.yaml
```

この段階で取れるのは、現行 Next.js が使っている env である。

確認済み:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_*`
- `NEXT_PUBLIC_R2_PUBLIC_URL`

### 2. Rails 用 env を追加

最低限必要:

- `LEDGER_DATABASE_URL`
- `RAILS_MASTER_KEY`
- `SECRET_KEY_BASE`

テンプレートは `deploy/google/ledger.runtime.example.yaml` を参照する。

### 3. 既存 katorin2 サービスへ上書きデプロイ

```bash
GOOGLE_CLOUD_PROJECT=oauthsetting-484201 \
GOOGLE_CLOUD_REGION=asia-northeast1 \
RUNTIME_ENV_FILE=/path/to/ledger.runtime.yaml \
scripts/deploy-cloudrun-ledger.sh
```

## 現在のブロッカー

Cloud Run から既存 env は取得できるが、Rails が必要な `LEDGER_DATABASE_URL` は今のサービスに存在しない。

理由:

- 既存 Next.js は Supabase API 利用だけで動いていた
- Rails は PostgreSQL へ直接接続する必要がある

現時点で repo や Cloud Run service から確認できたのは次まで:

- project ref: `ueqqvjbcyiqftrowivvy`
- pooler host: `aws-1-ap-northeast-1.pooler.supabase.com`
- database: `postgres`
- user prefix: `postgres.ueqqvjbcyiqftrowivvy`

未取得:

- Supabase Postgres password

この 1 点が入れば、そのまま `katorin2` を Rails に差し替えられる。
