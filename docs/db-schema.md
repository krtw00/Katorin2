# DB Schema Draft

## 方針

DB は UI より先に、`運営が記録する事実` を固定する。

今回の骨格は次で確定する。

`Account > League > Phase > Week > Match > Round`

予選と決勝は別系統のテーブルに分けず、同一リーグ配下の `Phase` 違いとして扱う。

## 設計原則

- `League` が最上位の業務単位
- `Phase` で予選と決勝を分ける
- `Week` は運営上の箱であり日付を持たない
- `Match` が日時と進行情報を持つ
- `Round` が試合内ラウンドを持つ
- 画像出力に必要な情報は `Round` とその下位結果まで持つ
- 将来チーム報告レイヤーを追加する場合も、 公式記録と別テーブルに分離する方針を維持する (= 必要時に Plane Issue で再起票)

状態定義の詳細は `status-model.md` を正本とする。

## テーブル一覧

### organizer_accounts

役割:

- 運営ログイン主体
- 複数リーグの所有者

最低限のカラム:

- `id`
- `email`
- `password_digest`
- `display_name`
- `created_at`
- `updated_at`

### leagues

役割:

- シーズン単位の管理箱

最低限のカラム:

- `id`
- `organizer_account_id`
- `name`
- `slug`
- `rule_module_key`
- `status`
- `started_at`
- `ended_at`
- `created_at`
- `updated_at`

補足:

- `WMGP Season 8` は 1 league として持つ
- `rule_module_key` により将来別大会ルールへ差し替えられる

### phases

役割:

- リーグ内の進行フェーズ管理
- 予選と決勝を分ける

最低限のカラム:

- `id`
- `league_id`
- `name`
- `kind`
- `position`
- `rule_module_key`
- `ranking_rule_key`
- `bracket_enabled`
- `created_at`
- `updated_at`

例:

- `予選`
- `決勝トーナメント`

### blocks

役割:

- 予選ブロック管理

最低限のカラム:

- `id`
- `league_id`
- `phase_id`
- `name`
- `position`
- `created_at`
- `updated_at`

補足:

- playoff phase では空でもよい

### teams

役割:

- リーグ配下チーム

最低限のカラム:

- `id`
- `league_id`
- `block_id`
- `name`
- `short_name`
- `display_name`
- `status`
- `notes`
- `created_at`
- `updated_at`

補足:

- `block_id` は予選で使い、決勝ではそのまま参照を維持する

### participants

役割:

- リーグ配下参加者

最低限のカラム:

- `id`
- `league_id`
- `team_id`
- `name`
- `display_name`
- `position`
- `status`
- `notes`
- `created_at`
- `updated_at`

### weeks

役割:

- フェーズ内の週管理

最低限のカラム:

- `id`
- `league_id`
- `phase_id`
- `number`
- `name`
- `kind`
- `position`
- `locked_at`
- `created_at`
- `updated_at`

補足:

- 日付は持たない
- `Week 1`, `Week 2`, `Final Week` のように扱える

### matches

役割:

- 運用上の最小管理単位
- 対戦カードと進行状態を持つ

最低限のカラム:

- `id`
- `league_id`
- `phase_id`
- `week_id`
- `block_id`
- `home_team_id`
- `away_team_id`
- `scheduled_on`
- `scheduled_time`
- `judge_name`
- `room_id`
- `spectator_room_id`
- `stage_key`
- `bracket_slot`
- `status`
- `export_status`
- `notes`
- `created_at`
- `updated_at`

補足:

- 予選も決勝も同じ `matches` に入れる
- 予選では `block_id` を使う
- 決勝では `stage_key` と `bracket_slot` を使う
- `status` は `draft / scheduled / in_progress / result_pending / confirmed / cancelled`
- `export_status` は `not_required / pending / generated / stale`

### match_results

役割:

- 試合全体の公式結果

最低限のカラム:

- `id`
- `match_id`
- `home_round_wins`
- `away_round_wins`
- `winner_team_id`
- `result_status`
- `decision_type`
- `notes`
- `confirmed_at`
- `created_at`
- `updated_at`

補足:

- `result_status` は `partial / confirmed / void`

### rounds

役割:

- 試合内の各ラウンド

最低限のカラム:

- `id`
- `match_id`
- `number`
- `home_team_id`
- `away_team_id`
- `winner_team_id`
- `result_status`
- `ended_by`
- `order_change_note`
- `notes`
- `created_at`
- `updated_at`

補足:

- `最大3ラウンド / 2ラウンド先取`
- `ended_by` で通常終了、時間切れ、ED などを持てる
- `result_status` は `partial / confirmed / void`

### board_results

役割:

- 各ラウンド 3 卓分の個人結果

最低限のカラム:

- `id`
- `round_id`
- `board_number`
- `home_participant_id`
- `away_participant_id`
- `home_deck_name`
- `away_deck_name`
- `winner_side`
- `result_status`
- `notes`
- `created_at`
- `updated_at`

補足:

- 画像出力はこの粒度まで必要

### exports

役割:

- 画像出力の履歴

最低限のカラム:

- `id`
- `league_id`
- `match_id`
- `export_type`
- `renderer_key`
- `status`
- `file_path`
- `generated_at`
- `created_at`
- `updated_at`

## Phase 1 で投入済みテーブル

Phase 1 の初期 migration で投入済み:

- `organizer_accounts`
- `leagues`
- `phases`
- `blocks`
- `teams`
- `participants`
- `weeks`
- `matches`
- `match_results`
- `rounds`
- `board_results`
- `exports`

## 拡張ポイント

`leagues.rule_module_key` および `phases.rule_module_key / ranking_rule_key` は、 Phase 2 PoC (= Core / WMGP module 分離) で実際に切り替え対象として使う。 PoC 着手前は WMGP 直結値が入っている前提でよい。

将来チーム報告レイヤーを追加する場合は、 公式記録テーブルとは別に `team_*_reports` / `report_diffs` 系を新規 migration で足す。 本 doc に予約テーブルは置かない (= 必要時に Plane Issue で再起票)。
