# Katorin2

Katorin2 is now a Rails-first repository for the WMGP operations ledger.

Primary app:

- `apps/ledger`
  - Rails 8 application

Supporting paths:

- `docs`
  - product, domain, and deployment notes for the Rails rebuild
- `deploy/google`
  - Cloud Build and runtime env templates for the Rails app
- `scripts`
  - deploy and operational helpers for the Rails app

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

Use the Rails deploy helper from the repository root:

```bash
bash scripts/deploy-cloudrun-ledger.sh
```

Runtime env template:

- `deploy/google/ledger.runtime.example.yaml`
