# Status Model

## 方針

`status` は UI の見た目用ラベルではなく、`運営が次に何をすべきか` を表す業務状態として定義する。

特に `matches.status` はホームの作業キューと直結するため、最小限に絞る。

## Match Status

Phase 1 の `matches.status` は次の 6 つで固定する。

### draft

対戦カードは存在するが、まだ運用に載っていない状態。

この状態に含むもの:

- Week だけ決まっている
- 対戦チームは入ったが日時未設定
- 一時保存の途中

### scheduled

対戦日時が入り、開催待ちの状態。

この状態に含むもの:

- まだ試合は始まっていない
- Judge 名、ルーム ID、観戦 ID は未入力でもよい

### in_progress

試合進行中の状態。

この状態に含むもの:

- 実際に試合が始まっている
- ラウンド結果を途中まで入力している
- 当日運営が監視対象として扱うべき対戦

### result_pending

試合自体は終わったが、公式記録がまだ閉じていない状態。

この状態に含むもの:

- ラウンドや卓結果が未入力
- 裁定や没収の確認待ち
- 入力途中で再開が必要

### confirmed

公式結果が確定した状態。

この状態に含むもの:

- match result が確定している
- 集計対象として扱ってよい
- 画像出力はまだでもよい

補足:

- 画像出力の完了は `matches.status` に含めない
- 画像の要否は `export_status` で別管理する

### cancelled

試合を通常進行から外した状態。

この状態に含むもの:

- 中止
- 無効
- 運営判断で台帳上閉じた対戦

## Match Status Transition

基本遷移は次を想定する。

`draft -> scheduled -> in_progress -> result_pending -> confirmed`

例外:

- `draft -> cancelled`
- `scheduled -> cancelled`
- `in_progress -> cancelled`
- `result_pending -> in_progress`
  - 入力再開や再確認時
- `confirmed -> result_pending`
  - 確定後に修正が入った時

## なぜこの粒度にするか

分けたいのは次の3点だけである。

- まだ始まっていない
- 進行中または入力途中
- 公式に閉じた

ただし、`進行中` と `終わったが未確定` は運営の作業が違うので分ける。

画像出力は業務上重要だが、試合の進行状態そのものではないため `export_status` に切り出す。

## Export Status

Phase 1 の `matches.export_status` は次の 4 つで十分。

### not_required

画像出力対象外。通常運用ではあまり使わないが、将来の柔軟性のために残す。

### pending

画像未出力、または出力が必要な状態。

### generated

最新の結果に対して画像が出力済み。

### stale

一度画像は出したが、その後に結果修正が入り再出力が必要な状態。

## Result Status

`match_results.result_status` と `rounds.result_status` は詳細結果の完成度を示す。

Phase 1 では次の 3 つでよい。

- `partial`
- `confirmed`
- `void`

補足:

- `matches.status` が業務進行
- `result_status` が結果データの完成度
- `export_status` が画像出力の鮮度

この 3 層を分けることで、状態を 1 カラムに詰め込まずに済む。
