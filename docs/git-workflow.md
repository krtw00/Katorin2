# Git Workflow

Katorin2 は次のブランチ運用に固定する。

- `main`
  - 常に deploy 可能な正本
- `develop`
  - 共有の統合作業場
  - deploy の基準にはしない
- `release/*`
  - staging で確認する本番候補
- `feature/*`
  - 日常作業

基本フロー:

1. 通常作業は `main` から `feature/*` を切る
2. 個別作業は `feature/* -> main` を PR で反映する
3. 共有検証や一時退避が必要なら `develop` へ直 push してよい
4. staging でまとめて確認したい期間だけ `release/*` を切る
5. staging 確認後、必要な修正は `release/*` に積み、最終的に `main` へ戻す

ローカル制御:

- `.githooks/pre-commit`
  - `main` と `release/*` での直接 commit を拒否
- `.githooks/pre-push`
  - `origin/main` と `origin/release/*` への直接 push を拒否

セットアップ:

```bash
bash scripts/setup-git-hooks.sh
```

GitHub 側:

- `develop`
  - direct push 可
  - PR 任意
- `main`
  - direct push 禁止
  - PR 経由のみ
- `release/*`
  - direct push 禁止
  - PR 経由のみ

deploy 対応:

- staging は `main` または `release/*` の特定 SHA を出す
- production は staging で確認した同一 SHA を `main` から出す
- deploy script は branch と environment の不一致を既定で拒否する
- 緊急時だけ `ALLOW_BRANCH_MISMATCH=1` で override する

補足:

- `develop` は共有実験用か一時統合用に限定する
- `develop` を staging の正本ブランチとしては使わない
