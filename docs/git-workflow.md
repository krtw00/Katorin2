# Git Workflow

Katorin2 は次のブランチ運用に固定する。

- `main`
  - 常に deploy 可能な正本
- `staging`
  - staging に出す次の本番候補
  - 日常の統合作業場
- `feature/*`
  - 日常作業

ツリー:

```text
main
└── staging
    └── feature/*
```

基本フロー:

1. 通常作業は `staging` から `feature/*` を切る
2. 個別作業は `feature/* -> staging` で反映する
3. `staging` を staging 環境に deploy して確認する
4. 問題なければ `staging -> main` を PR で反映する
5. `main` を production に deploy する
6. `main` で hotfix した場合は `staging` に戻す

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

- `staging`
  - direct push 可
  - PR 任意
- `main`
  - direct push 禁止 (admin も bypass 不可、 `enforce_admins=true`)
  - PR 経由のみ
  - CI (`test` job) 緑が merge 必須
  - **main への PR は head=`staging` 以外を CI で reject** (`branch-base-check` workflow)
    - `feature/*` から main への直 PR は `branch-base-check` が fail して merge 不可
    - 必ず `feature/* -> staging -> main` の 2 段を経由する

緊急時の例外 (= staging を経由できない hotfix):

通常は hotfix も `staging` 経由で出す (= `staging` を一旦 main に揃えてから `feature/hotfix-*` を切る)。 どうしても staging を経由できない場合だけ次の手順で一時的に bypass する:

1. GitHub 設定 (`Settings -> Branches -> main`) で required status checks から `branch-base-check` を一時除外する
2. hotfix branch -> main で PR を作って merge
3. main を staging に揃え直す (= `staging` を `main` に reset hard + force push)
4. required status checks に `branch-base-check` を戻す

例外操作は事後に Plane Issue に経緯を残す。

deploy 対応:

- staging は `staging` を出す
- production は `main` を出す
- deploy script は branch と environment の不一致を既定で拒否する
- 緊急時だけ `ALLOW_BRANCH_MISMATCH=1` で override する

補足:

- staging は `staging` branch の確認環境として扱う
- `staging` の変更は小さく積み、production に出したい単位を崩しすぎない
