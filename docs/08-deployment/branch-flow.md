# Branch Flow

## Deploy targets

| Branch | Cloud Run | Firebase Hosting | Supabase |
| --- | --- | --- | --- |
| `staging` | `katorin2-staging` | `katorin2-staging` | `lggbrlfhkerulgyxelwr` |
| `main` | `katorin2` | `katorin2-site` | `ueqqvjbcyiqftrowivvy` |

## Intended flow

1. Push work to `staging`
2. Verify on staging
3. Merge or fast-forward the same commits into `main`
4. Let production deploy from `main`

## GitHub configuration

- `ENABLE_STAGING=true`
- `STAGING_CLOUD_RUN_SERVICE=katorin2-staging`
- `STAGING_FIREBASE_HOSTING_SITE=katorin2-staging`
- `STAGING_SUPABASE_PROJECT_REF=lggbrlfhkerulgyxelwr`
- `SUPABASE_PROJECT_REF=ueqqvjbcyiqftrowivvy`
- `KATORIN2_STAGING_RUNTIME_ENV`
- `KATORIN2_RUNTIME_ENV`
- `SUPABASE_STAGING_DB_PASSWORD`
- `SUPABASE_DB_PASSWORD`

## Notes

- `staging` and `main` must deploy the same application type. Do not point `staging` at legacy Rails while `main` points at Next.js.
- Supabase migrations follow the branch target: `staging` updates staging DB, `main` updates production DB.
