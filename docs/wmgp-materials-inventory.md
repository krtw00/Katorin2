# WMGP Materials Inventory

参照元: `/home/iguchi/Downloads/WMGP`

## Files

- `WMGPルールブック-Season8.pdf`
  - 9 pages
  - Season 8 のルールブック
- `WMGP　参加者.xlsx`
  - 3 sheets
  - 参加チーム・プレイヤー・MDID の表
- `WMGP　参加者 - 【play off team】.pdf`
  - 19 pages
  - playoff team の参加者一覧 PDF 出力
- `discord_kit_2026_03_17 00_00_00_2026_03_18 00_00_00.txt`
  - Discord の議論ログ
- `image1.png`
  - Discord ログ上で「リザルト表の例」として参照されている画像
- `GroupAweek7room1IMPERIAL_ORDER_vs_Rabbit.png`
  - 試合結果または対戦記録系の画像と見られる
- `決勝.webp`
  - 決勝関連の画像

## Extracted Notes

### 1. Discord log

プロダクト方針として読み取れた点:

- チャット機能は一旦不要
- コミュニケーションは Discord に集約
- アプリは「運営用台帳」として扱う
- 主目的は試合結果データ入力と運営コスト削減
- ブラウザアプリ前提
- 通知自動化や Discord 連携は将来的に余地あり
- チーム側に操作させるより、運営側が情報を集中管理する方針
- PoC は WMGP 専用で進め、他大会対応は後続

Discord ログ内で言及されていた機能候補:

- 終了したラウンドの記録
- 画像作成
- チーム情報管理
- 通知
- ポイント計算自動化

### 2. Rule book

ルールブックから抽出した主要業務ルール:

- 1チームは 6 名以上 15 名以下
- 代表者が Discord でメンバー追加・削除を申請
- メンバー変更申請は日曜 23:59 締切、翌週反映
- 移籍はチームごとに大会中 2 回まで
- エントリー上限は 64 チーム
- 対戦カード通知は毎週月曜
- 日程確定は金曜 23:59 まで
- オーダー提出は試合 2 時間前まで
- 試合は 3 対 3 の星取戦
- 最大 3 ラウンド、2 ラウンド先取で勝利
- 各ラウンドは 50 分制限
- サイドチェンジ申告と時間制限あり
- Discord のタイムスタンプを時間基準として扱う

アプリ側で扱う必要が強そうな概念:

- Team
- Team member
- Team representative
- Transfer / roster change
- Match card
- Schedule deadline
- Order submission
- Deck submission
- Round result
- Warning / penalty

### 3. Participants spreadsheet

Excel のシート構成:

- `【play off team】`
  - 32 teams
  - playoff 対象チームのロスター
- `シート2`
  - 62 teams
  - 予選を含むチーム一覧と見られる
- `(No Change) Qualifying Tourname`
  - 62 teams
  - qualifying 用の固定スナップショットと見られる

確認できた構造:

- `teamname`
- `player`
- `MDID`

1 チームあたり複数プレイヤーと MDID を持つ表で、現在のアプリに必要な
`team`, `participant`, `external_player_id` の初期モデリング参考になる。

### 4. Playoff participants PDF

`WMGP　参加者 - 【play off team】.pdf` は Excel の `【play off team】` シートを PDF 化したものと見られる。

用途:

- 共有用の静的配布資料
- roster 凍結時点の証跡
- 画面出力やエクスポートの参考

## Immediate Product Implications

- WMGP 向け PoC は「運営専用台帳」に寄せるのが妥当
- Discord は業務外コミュニケーションの母体として残し、アプリは入力と集計に集中する
- 認証より先に、試合・ラウンド・オーダー・結果・通知の管理フローを固める価値が高い
- 参加者 Excel と playoff PDF は import / export 設計のベース資料として使える
- ルールブックから締切、人数制限、ラウンド制、提出フローをアプリ仕様へ落とし込める
