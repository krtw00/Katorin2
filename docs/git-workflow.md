# Git Workflow

Katorin2 は次のブランチ運用に固定する。

- `main`
  - 常に deploy 可能な正本
- `beta`
  - staging に出す次の本番候補
  - 日常の統合作業場
- `feature/*`
  - 日常作業

ツリー:

```text
main
└── beta
    └── feature/*
```

基本フロー:

1. 通常作業は `beta` から `feature/*` を切る
2. 個別作業は `feature/* -> beta` で反映する
3. `beta` を staging に deploy して beta 確認する
4. 問題なければ `beta -> main` を PR で反映する
5. `main` を production に deploy する
6. `main` で hotfix した場合は `beta` に戻す

ローカル制御:

- `.githooks/pre-commit`
  - `main` での直接 commit を拒否
- `.githooks/pre-push`
  - `origin/main` への直接 push を拒否

セットアップ:

```bash
bash scripts/setup-git-hooks.sh
```

GitHub 側:

- `beta`
  - direct push 可
  - PR 任意
- `main`
  - direct push 禁止
  - PR 経由のみ

deploy 対応:

- staging は `beta` を出す
- production は `main` を出す
- deploy script は branch と environment の不一致を既定で拒否する
- 緊急時だけ `ALLOW_BRANCH_MISMATCH=1` で override する

補足:

- staging は `beta` の確認環境として扱う
- `beta` の変更は小さく積み、production に出したい単位を崩しすぎない
