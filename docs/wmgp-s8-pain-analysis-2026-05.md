# WMGP Season 8 運営・アプリ 困りごと洗い出し (2026-05-20)

## 調査方法

3 層を突き合わせて「運営の手作業」「アプリの穴」を洗い出した。

- **Discord ログ**: DiscordChatExporter で公開チャンネル + 運営内部チャンネルを JSON エクスポート (s8 期間 = 2026-03 以降)。質問部屋 (JP/EN/ID)、s8-試合結果 / 集計 / メンバー変更 / チーム移動、運営チャット / help-judge / keikoku 等。
- **本番 DB**: staging (`katorin2_staging`) の本番 snapshot を read-only 集計 ([`staging-on-demand.md`](staging-on-demand.md))。6 週経過時点。
- **コード**: `apps/ledger` を読み、公開ページ有無 / locale 実装を確定。

個人名・MD ID 等は本ドキュメントから除外し、件数とパターンのみ記載する。

## 全体像 (本番 snapshot)

- teams **67** / participants **541** (全員 status=active) / matches **184** / match_results 183 / exports (match_result_card) **183**
- league `wmgp` は 6 週進行中だが status=`draft` のまま。phase = 予選(regular_season) + 予選ステージ(playoff)。

---

## 既に着手済み (= 洗い出し対象外)

運営チャットの要望 → 実装が既に回っている。直近コミットの多くがこのチャット由来:

| 要望 (運営チャット) | 対応 |
|---|---|
| 順位計算式 (勝点→R勝数→…→選手勝数 / 旧 Excel 手計算) | KAT-8 |
| week のデッキ別集計 + CSV | KAT-22 |
| home/away チーム管理への導線 | KAT-21 |
| スコアシートにチームアイコン | KAT-24 (staging) |

過去バグ (1-1/0-1 入力エラー・iPhone 削除ボタン・3-0 が W 表記にならない・W/L 色・多言語化エラー・画像生成停止) も都度修正済み。

---

## 洗い出し (ネットで新しい項目)

各項目に Discord / DB / コードの根拠を併記。末尾の「起票」は Plane KAT Issue。

### 1. 試合日程調整 (スケジューラ) — 運営最大の紛争源
- **生声**: root 運営「スケジュール今回めちゃ揉める…スケジューラの作り方がわからん…対策考える」。AM/PM・12h/24h 取り違えで実紛争、無反応チームを運営が手動仲裁、口論の仲裁まで発生。
- **DB**: 184 試合中 日付 21 / 時刻 20 しか入力されていない (room_id・judge_name はほぼ全件)。TZ カラム無し。
- **公開**: 「異なる国で TZ 把握に 2 日かかる、事前開示したい」。
- → **起票: feature** (TZ 対応の日程調整フロー)

### 2. ルーム貸し & ジャッジ手配 — 運営の最大の時間泥棒
- **生声**: help-judge はほぼ全部これ。「今日ルーム 4 つ欲しい」「9 時 12 時いける人？」を 24h・週 12 試合を実質 4 人で回す。Room ID を手で配布。
- アプリは room_id / judge_name を事後記録するのみ。空き状況・割当の支援は重く、アプリの守備範囲が曖昧。
- → **未起票・Discord 運用で確定**。試合中に Katorin を見ない以上、ルーム/ジャッジの即応調整は Discord が最適。アプリは room_id / judge_name の事後記録のみ維持する

### 3. 失格・不戦勝・no-game の結果処理が手作業
- **生声**: 未登録 MD ID 出場 → 失格でスコアを手計算で再調整。no-game 持ち越しも発生。
- **DB**: `match_results.decision_type` 全 183 = normal、`rounds.ended_by` 全 normal (失格/不戦勝/no-game が一切記録されていない)。
- **公開**: judge「未登録 ID で出場した例があるので MDID を必ず出して」。
- → **起票: feature** (DQ/不戦勝/no-game 処理 + 登録 ID↔出場 ID バリデーション)

### 4. 結果カードを手で Discord に貼っている (自動化 ROI 最大)
- **DB**: `exports.match_result_card` generated **183** (≒ confirmed 181)。
- **Discord**: 試合結果 ch に **184 画像 / 3 投稿者** (実質 1 人が ~140 枚)。
- → アプリが全試合分のカードを生成済みなのに人力ポスト。webhook 自動投稿 / 週一括出力で ~180 手作業が消える。
- → **起票: enhancement**

### 5. ロスター: 削除が残らない・複数 ID の置き場が無い・セルフ申請が無い
- **DB**: participants 541 全 active (withdrawn 0)。`member_id` は 1 人 1 カラムだが規定は最大 3 ID。533/541 が期中 (week1 以降) 追加。
- **Discord**: メンバー変更 ch 132 件 / 53 人を自由文で運営に投げ → 手転記。「add ID to 既存選手」頻出 (2 個目 ID の行き場が無い証拠)、`@運営 staff` の催促のみの行が多数。
- → **起票: feature** (セルフ申請 + 複数 MD ID + 脱退状態管理)

### 6. 参加者向け公開ページが無い (= 結果が見れない / 英訳要望の真因)
- **コード**: standings / matches / phases は全て organizer 認証背後 (`require_authentication`)。公開 slug / token 無し。
- **コード**: locale は ja↔en 切替が**既に実装済み** (available_locales [ja,en]、切替 UI あり) だが、認証背後なので国際参加者に届かない。
- **公開**: JP/EN 両方「結果 (スコアシート) が見れない / 全部出る？」「stats を英訳して」。
- → 公開ページを作れば「結果が見れない」も「英訳して」も同時に解ける (en 対応は流用)。
- → **起票: feature**

### 7. 結果入力フローの改善 (運営が 5/17 に直接要望)
- **生声**: オーダー選手を結果入力に手再入力 / 結果入力画面から各チーム管理へ遷移できない (iPhone で詰まる) / **複数人同時編集不可** (一人が下書き化すると他ジャッジが触れない、並列 12 試合と相性最悪)。
- → **起票: enhancement × 2** (導線改善 / 複数人同時編集)

---

## 起票一覧 (Plane KAT)

1. (feature) TZ 対応の試合日程調整フロー — **KAT-25**
2. (feature) 参加者向け公開ページ (順位・結果・日程) — **KAT-26**
3. (feature) ロスター変更のセルフ申請フロー — **KAT-27**
4. (feature) 失格・不戦勝・no-game の結果処理 + ID バリデーション — **KAT-28**
5. (enhancement) 結果カードの Discord 自動投稿 — **KAT-29**
6. (enhancement) 結果入力フローの導線改善 — **KAT-30**
7. (enhancement) 結果入力の複数人同時編集対応 — **KAT-31**

未起票: ルーム貸し & ジャッジ手配支援 — **Discord 運用で確定** (試合中アプリ非参照のため、アプリは事後記録のみ維持)。

## データ出典

- Discord エクスポート: `~/wmgp-export/*.json` (個人参照、git 管理外)、抽出テキスト `~/wmgp-export/extracted/`
- 本番 snapshot 集計: staging DB read-only (本ドキュメント作成時点)
