# Rule Modules

## 方針

Phase 1 で WMGP 直結に書いた台帳・集計・画像出力を、 Phase 2 PoC で `Core (大会種別非依存) / WMGP module (固有実装)` に分離する。 振る舞いは変えない。

最終的な狙いは Phase 3 で `別リーグ / 大規模大会` を `Core + 別 league module` の組み合わせとして載せられるようにすること。

このため、 本 doc は 「設計」 ではなく `PoC で何をどこに切り出すか` の指針として読む。

## 分離する責務

### Core Domain

大会種別に依存しない台帳オブジェクト。 PoC 対象。

- League
- Phase
- Week
- Match
- MatchResult
- RoundResult
- BoardResult
- Export

これらのモデル / 関連 / バリデーションは `Core` 側に置き、 league 種別に応じた振る舞い差は module 側で注入する。

### Core Rules

リーグや大会の進行ルールを差し替え可能にする。 PoC 対象。

- 順位計算 (勝ち点 / タイブレーク順序)
- 進行ルール (総当たり / スイス / ダブルエリミ等の枠組み)
- 決勝進出判定
- トーナメント進行

`Core` には抽象インタフェースのみ置き、 具体ロジックは module 側に置く。

### Core Renderers

同じ試合データを別レイアウトで描画できるようにする。 PoC 対象。

- 試合結果画像 (1 対戦単位)
- 順位表画像
- 決勝ブラケット

`Core` 側には renderer 呼び出しの統一インタフェースを置き、 個別レイアウト実装は module 側に置く。

### Core Reports

結果入力と照合の責務分離。 PoC では `公式記録レイヤーを切り出す` ところまで。

- 公式記録 (= Phase 1 で実装済の入力経路)
- 将来のチーム報告レイヤー (= 元 Phase 2 で想定していたもの。 必要時に Plane Issue で再起票)

PoC 時点では `公式記録` のみを Core 側に置き、 チーム報告レイヤーを後付けできる余地を残す。

## WMGP module に閉じ込めるもの

WMGP 固有として `module` 側に閉じ込める責務:

- 予選ブロック運用の具体ルール
- 勝ち点とタイブレーク順序
- `3人メイン + 任意1人サブ`
- `最大3ラウンド / 2ラウンド先取`
- WMGP 結果画像の見た目
- WMGP 決勝ブラケットの見た目

これらは `Core` から見て差し替え可能な実装の 1 つとして扱う。

## PoC の判定基準

PoC が完了したと言える条件:

- 既存 WMGP league で `画面 / 画像出力 / 集計結果` が PoC 前後で完全一致する
- `Core` 側コードに `WMGP` 固有概念 (= 勝ち点ルール / 画像レイアウト等) の参照がない
- `WMGP module` 側コードが `Core` の公開インタフェースのみ経由してコアを呼ぶ
- 別 league module を載せる場所 (= ディレクトリ / 登録方法) が明確になっている

別 league module を実際に載せるのは Phase 3。 PoC では `載せられる形になっている` ことだけを示す。

## 既存コードの位置づけ

Phase 1 で書いた Rails 実装は `WMGP 直結` で動いている前提で扱う。 PoC ではこれを切り出し対象として扱い、 module 側に寄せるべきコードと Core 側に残すべきコードを判別していく。

旧 Next.js 実装の `src/lib/tournament/*.ts` は参考資料に留め、 移植対象とはしない。

## 実装原則

- 入力 UI は league 種別ごとに最適化してよい (= UI は module 側でよい)
- 集計ロジックは UI から独立させる
- 画像レイアウトは renderer として分離する
- 公式記録レイヤーとチーム報告レイヤーは混ぜない
- 抽象化は PoC で必要になった分だけ入れる (= 先回り抽象化はしない)

## ディレクトリ案

PoC 着手時に Plane Issue で確定するが、 現時点での目安:

- `app/models` — Core Domain
- `app/services/rules` — Core Rules 抽象 + 共通実装
- `app/services/reports` — Core Reports (公式記録)
- `app/renderers` — Core Renderers 抽象
- `app/leagues/wmgp` または同等の名前空間 — WMGP module (rules / renderers / 固有 view)

重要なのは名前よりも、 `WMGP 固有ルール` と `使い回すコア` を混ぜないこと。
