# Katorin2

Katorin2 is now a Rails-first repository for the WMGP operations ledger.

Primary app:

- `apps/ledger`
  - Rails 8 application

Supporting paths:

- `docs`
  - product, domain, and deployment notes for the Rails rebuild
- `.github/workflows`
  - Buildx + GHCR image publishing and codenica-vps deployment
- `scripts`
  - operational helpers for the Rails app

## Development

```bash
cd apps/ledger
bin/setup
bin/dev
```

## Test

```bash
cd apps/ledger
bin/rails test
```

## Deploy

Pushing `main` runs the independent production and staging deploy workflows. Both publish the Rails image to `ghcr.io/krtw00/katorin2` and update the corresponding codenica-vps Compose service by digest.

- production: `.github/workflows/deploy.yml`
- staging: `.github/workflows/deploy-staging.yml`

Use `workflow_dispatch` on `main` for a manual deploy. See `docs/deployment-environments.md` for the runtime paths and health checks.
