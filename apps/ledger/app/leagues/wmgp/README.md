# WMGP league module

WMGP 固有の rule / renderer / report 実装を寄せる入れ物。

## 構造

- `league_module.rb` — `Wmgp::LeagueModule`。 `RuleModules::Base` を継承し、 boot 時に `RuleModules::Registry` へ登録される (= zeitwerk default の通り `app/leagues` 直下が autoload root)
- `rules/` — 後続 KAT-8 で `Standings::Calculator` をここに移動
- `renderers/` — 後続 KAT-9 で `MatchExports::ResultCardRenderer` を、 KAT-10 で `StandingsExports::TableRenderer` をここに移動
- `reports/` — 公式記録の WMGP 固有部分が必要になった時の入れ物

## 状態

現時点は skeleton。 `rules` / `renderers` の getter は既存の Core 側 service クラスをそのまま返す (= 振る舞い不変)。 後続 Issue (KAT-8〜10) で各実装を本ディレクトリへ移動し、 Core 側は registry 経由で解決する形に切り替える。

## 関連

- `app/services/rule_modules/` — Core IF (`Base` / `Registry`)
- `config/initializers/rule_modules.rb` — boot 時 registration
- `docs/rule-modules.md` — Core / module 分離の方針
