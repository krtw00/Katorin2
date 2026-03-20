# Katorin2 Docs

この `docs` は、現行の Katorin2 を `WMGP 運営専用台帳` として再定義した前提だけを扱う。

過去に存在した「トナメル再現」「公開向け大会サービス」前提の文書は破棄した。今後の判断基準は次の4点に寄せる。

- Katorin2 は `運営専用の非公開台帳` である
- Phase 1 は `WMGP` を最後まで回せることを最優先にする
- 参加者の主導線は Discord のまま維持する
- 将来拡張は `コアロジック分離` で吸収し、今は運営負担軽減を優先する

ドキュメント一覧:

- `rebuild-architecture.md`
  - 全面作り直しの技術選定、採用理由、移行方針
- `phase1-wmgp-ledger.md`
  - 現在のプロダクト要件、スコープ、画面方針
- `db-schema.md`
  - DB ファーストで決めるテーブル一覧と責務
- `status-model.md`
  - Match を中心にした状態遷移と enum の整理
- `domain-model.md`
  - `Account > League > Phase > Week > Match > Round` を軸にしたドメイン整理
- `rule-modules.md`
  - WMGP 固有ロジックと再利用コアの分離方針
- `roadmap.md`
  - Phase 1 から Phase 2 までの展開方針
- `deployment-environments.md`
  - production / staging 分離方針と deploy 手順
- `git-workflow.md`
  - `main / develop / feature/*` のブランチ運用

補足:

- アプリ実装の第一候補は `Rails 8 + Hotwire + Supabase Postgres + Cloud Run`
- Supabase は当面 `Postgres ホスティング` として使い、将来の `Cloud SQL` 移行余地を残す
- ルート URL は宣伝 LP ではなく、`関係者向けの薄い案内トップ` として扱う
- 画像出力の正本は `/home/iguchi/Downloads/WMGP/image1.png` を基準にする
- 決勝系の見え方は `/home/iguchi/Downloads/WMGP/決勝.webp` を参照しつつ、Phase 1 ではまず運用を成立させる
