# Git Workflow

Katorin2 は次のブランチ運用に固定する。

- `main`
  - production
- `develop`
  - staging
- `feature/*`
  - 日常作業

基本フロー:

1. `develop` から `feature/*` を切る
2. 作業は `feature/*` にだけ commit する
3. `feature/* -> develop` を PR で反映する
4. staging 確認後、`develop -> main` を PR で反映する

ローカル制御:

- `.githooks/pre-commit`
  - `main` と `develop` での直接 commit を拒否
- `.githooks/pre-push`
  - `origin/main` と `origin/develop` への直接 push を拒否

セットアップ:

```bash
bash scripts/setup-git-hooks.sh
```

GitHub 側:

- `main`
  - direct push 禁止
  - PR 経由のみ
- `develop`
  - direct push 禁止
  - PR 経由のみ

deploy 対応:

- `develop` の内容を staging に出す
- `main` の内容を production に出す
- deploy script は branch と environment の不一致を既定で拒否する
- 緊急時だけ `ALLOW_BRANCH_MISMATCH=1` で override する
