# Katorin2 Docs

この `docs` は、現行の Katorin2 を `WMGP 運営専用台帳` として再構築した経緯と、 そこから `他リーグ / 大規模大会にも展開可能な汎用台帳基盤` へ進むための設計を扱う。

過去に存在した「トナメル再現」「公開向け大会サービス」前提の文書は破棄した。 今後の判断基準は次の 4 点に寄せる。

- Katorin2 は `運営専用の非公開台帳` である (= 参加者主導線は持たない)
- Phase 1 は `WMGP Season 8 を最後まで回す` ことを優先し、 完了済み
- 参加者の主導線は Discord のまま維持する
- 次フェーズは `Core / WMGP module 分離` の PoC、 その先に `別リーグ / 大規模大会への展開` を見据える

ドキュメント一覧:

- `rebuild-architecture.md`
  - 全面作り直しの技術選定、採用理由、移行方針
- `phase1-wmgp-ledger.md`
  - Phase 1 のスコープと完了済み機能の整理
- `db-schema.md`
  - DB ファーストで決めるテーブル一覧と責務
- `status-model.md`
  - Match を中心にした状態遷移と enum の整理
- `domain-model.md`
  - `Account > League > Phase > Week > Match > Round` を軸にしたドメイン整理
- `rule-modules.md`
  - PoC で進める Core / WMGP module 分離の指針
- `roadmap.md`
  - Phase 1 完了 → Phase 2 PoC → Phase 3 別リーグ展開 までの展開方針
- `deployment-environments.md`
  - production / staging 分離方針と deploy 手順
- `staging-on-demand.md`
  - staging の on-demand 起動 + 本番 snapshot restore 運用
- `git-workflow.md`
  - `main / staging / feature/*` のブランチ運用

補足:

- アプリ実装は `Rails 8 + Hotwire + PostgreSQL + Docker Compose (codenica-vps)`
- ルート URL は宣伝 LP ではなく、`関係者向けの薄い案内トップ` として扱う
- 画像出力の正本は `/home/iguchi/Downloads/WMGP/image1.png` を基準にする
- 決勝系の見え方は `/home/iguchi/Downloads/WMGP/決勝.webp` を参照する
