# 使用状況解析 (2026-05-17 snapshot)

## 調査方法

- staging DB (`katorin2_staging`) に本番 `katorin2` の直近 snapshot を restore (`scripts/staging-up.sh`)
- `pg_stats` (= ANALYZE 後の統計) + `pg_stat_user_tables.n_live_tup` で行数 / NULL 率 / cardinality を取得
- dead 候補は `apps/ledger/{app,lib,config}` の Ruby/ERB/YAML を grep してコード参照をクロスチェック
- 「コード参照ゼロ」 = **dead column 確証**、 「コードあるが運用 0 入力」 = **未使用機能**

## 全体スコープ

- 21 tables、 約 213 columns (= `schema_migrations` 含む)
- 主要テーブル行数: `participants` 527 / `rounds` 377 / `match_lineup_members` 321 / `match_results` 162 / `matches` 163 / `board_results` 1131 / `teams` 67 / `exports` 163
- 単一運用者環境 (= `organizer_accounts` 1 行、 `leagues` 1 行、 `phases` 2 行)

---

## 行数 0 のテーブル

| table | 行数 | 評価 |
|---|---|---|
| `active_storage_attachments` | 0 | 未使用機能 (= `League#header_image` の Active Storage 添付、 一度も upload なし) |
| `active_storage_blobs` | 0 | 同上 |
| `active_storage_variant_records` | 0 | 同上 |
| `bracket_rounds` | 0 | **未到達** (= WMGP Season 8 がまだ予選フェーズで決勝トーナメント未開始)。 削除候補ではない |

---

## dead column 確証 (= 削除候補)

「コード参照ゼロ」 かつ「production で 0 入力」 を満たすカラム。

| カラム | NULL 率 | コード参照 | 評価 |
|---|---|---|---|
| `rounds.order_change_note` (text) | 1.000 | **0 hit** | **完全 dead**。 schema にあるがコード一切参照なし、 運用も 0 件。 削除可 |
| `stage_assets.bracket_size` (integer) | 1.000 | label 行のみ (= `stage_asset.bracket_size` 直接参照 0)| **強い dead**。 bracket size 算出は `phase.bracket_size_effective` (= phase 側) が担う |
| `stage_assets.round_count` (integer) | 1.000 | label 行のみ | 同上。 phase 側 `region_round_count` / `championship_round_count` が担う |
| `stage_assets.group_count` (integer) | 1.000 | label 行のみ | 同上。 block 数は `blocks` table の COUNT で取れる |
| `stage_assets.advancement_value` (integer) | 1.000 | label 行のみ | 同上 |

→ **Plane Issue 候補**: 「`stage_assets` の dead column 4 つを削除し、 phase 側集計に統一」 + 「`rounds.order_change_note` 削除」。 振る舞いは変えない (KAT-6 Phase 2 PoC の文脈とも整合)

---

## password reset 機能 (= 機能丸ごと未使用)

| カラム | NULL 率 | コード参照 | 評価 |
|---|---|---|---|
| `organizer_accounts.reset_password_sent_at` | 1.000 | `OrganizerAccount#generate_reset_password_token!` 等で参照 | 機能は実装済 (`PasswordResetsController` 存在) だが運用で 0 件使用 |
| `organizer_accounts.reset_password_token` | 1.000 | 同上 | 同上 |

→ **Plane Issue 候補**: 「password reset 機能を残すか撤去するか判断」。 残す場合は staging で動作確認、 撤去する場合は controller + column + view + i18n を削除

---

## 未使用機能 (= 機能はあるが運用で使われていない)

UI / CSV import 等で入力できるが、 production で 0 件しか入力されていない。

### memo / notes 系 (5 column)

| カラム | コード参照 | 備考 |
|---|---|---|
| `matches.notes` (text) | `text_area :notes` (matches/_form), permit | 全 163 件で NULL |
| `match_results.notes` (text) | (= match_result_form は無さそうだが) | 全 162 件で NULL |
| `board_results.notes` (text) | recorder で扱う | 全 1131 件で NULL |
| `rounds.notes` (text) | (フォームなし) | 全 377 件で NULL |
| `teams.notes` (text) | `text_area :notes` (teams/_form), CSV import (`team_imports/csv_upserter.rb`) | 全 67 件で NULL |
| `participants.notes` (text) | `text_area :notes` (participants/_form), CSV import | 全 527 件で NULL |

→ **Plane Issue 候補**: 「notes 系 6 column を一括撤去 (= フォーム + permit + CSV import + column 削除)」、 もしくは「運用上必要なら逆に運用ガイド整備」

### Active Storage (League#header_image)

| 対象 | 状態 |
|---|---|
| `active_storage_*` 3 テーブル | 全 0 行 |
| `League#header_image` (form + model + permit) | 実装済、 一度も upload なし |

→ **Plane Issue 候補**: 「League header_image (Active Storage) 機能を撤去」 もしくは「運用で使う判断」

### その他の input が NULL 100% な機能

| カラム | コード参照 | 備考 |
|---|---|---|
| `leagues.ended_at` | form + permit | 全 1 件で NULL = リーグ終了日入力されたことなし |
| `weeks.locked_at` | form + permit | 全 7 件で NULL = week ロック機能未使用 |

→ **Plane Issue 候補**: 「`ended_at` / `locked_at` を撤去 or 運用評価」

---

## enum 設計済だが 1 値のみ運用 (= 拡張余地が未活用)

| カラム | 入っている唯一値 | 行数 | 評価 |
|---|---|---|---|
| `participants.status` | `'active'` | 527 | `inactive` / `withdrawn` 等の他状態未使用 |
| `teams.status` | `'active'` | 67 | 同上 |
| `match_results.decision_type` | `'normal'` | 162 | `walkover` / `forfeit` / `judge_decision` 等未使用 |
| `rounds.ended_by` | `'normal'` | 377 | 同上 |

→ **Plane Issue 候補**: それぞれ enum 拡張運用を見直す。 「不戦勝 / 棄権処理を運営フローに組み込む」 か、 「enum を `'active'` 一値に絞って column 削除」 のどちらか方針決定

---

## 未到達 (= 削除候補ではない、 機能評価対象でもない)

WMGP Season 8 がまだ予選フェーズで bracket 未開始。 以下は予定機能:

- `bracket_rounds` table (0 行)
- `matches.bracket_round_id` / `bracket_slot` / `slot_number` / `away_source_match_id` / `home_source_match_id` / `away_loser_source_match_id` / `home_loser_source_match_id` (全 NULL)
- `matches.stage_key` (全 NULL、 ただし `brackets/phase_builder.rb` が `championship_round_<n>` / `region_<n>_round_<n>` を書き込む)

→ シーズン進行で値が入り始める。 今は保留、 解析対象外。

---

## 統計の確からしさ

- `pg_stats.null_frac` / `n_distinct` は ANALYZE 後の統計に依存。 本解析の前に staging DB で `ANALYZE` を実行済
- 行数は `pg_stat_user_tables.n_live_tup` (= 概算)。 dead tuple がほぼないので実数とほぼ同じ
- staging restore は本日 2026-05-17 15:31 JST 時点の本番 snapshot

---

## 次のアクション (= ユーザー確認 → Plane 起票)

優先度の高い順:

1. **完全 dead column の削除 Issue 起票** (= 受入条件: migration + schema + コード掃除、 振る舞い不変、 テスト緑)
   - `rounds.order_change_note`
   - `stage_assets.{bracket_size, round_count, group_count, advancement_value}` 4 件まとめて

2. **password reset 機能の存続判断 Issue 起票** (= 撤去 or 動作確認の判断材料を整理する Issue)

3. **notes 系 6 column の方針判断 Issue 起票** (= 撤去 or 運用ガイド整備)

4. **Active Storage / header_image / ended_at / locked_at の存続判断**

5. **enum 1 値カラム (status, decision_type, ended_by) の方針判断**

各項目をユーザー確認した上で Plane Issue として個別起票する (= 機能評価系は「ユーザー視点で何が変わるか」 判定するためユーザー入力が要る)。
