# Roadmap

## 現在地

Phase 1 (WMGP Season 8 を運営専用台帳として最後まで回す) は実装・運用ともに完走済み。

次フェーズは `コア / WMGP module 分離` の PoC に移る。 元 Phase 2 (チーム結果報告 + ジャッジ照合) は本 roadmap から削除し、 必要時に Plane Issue で再起票する。

## Rebuild First (完了)

実装前提は `現行 Next.js アプリの延命` ではなく、`Rails 8 ベースの再構築` とした。 完了済み。

実施した内容:

- 新しい技術基盤の確定 (`Rails 8 + Hotwire + PostgreSQL + Cloud Run`)
- Rails アプリの立ち上げ
- Cloud SQL (PostgreSQL) への接続
- WMGP Phase 1 に必要な migration の最小セット

## Phase 1 (完了)

目標: `WMGP Season 8 を運営専用台帳として最後まで回せること`。

完了済みの主要機能:

- ログイン必須の非公開運用
- 薄い案内トップ
- ホームの運営タスク表示
- リーグ中心の情報設計
- チームと参加者の手入力
- Week 作成
- 対戦カード手入力
- 対戦日時管理
- Judge名、ルームID、観戦ID の後追い入力
- ラウンド、卓単位の結果入力
- 自動集計
- 1対戦ごとの結果画像出力
- 順位表画像出力
- 決勝進出と決勝台帳の管理

## Phase 1.5

WMGP の実運用を通して、運営 UI を詰める段階。 PoC と並行して進めてよい。

候補:

- ホームの優先タスク最適化
- 入力フォーム短縮
- 修正導線の改善
- 画像出力オペレーション短縮

着手は Plane Issue 単位で個別に判断する。

## Phase 2: PoC コア / WMGP module 分離

目標: `Phase 1 の振る舞いを変えずに、コア (大会種別非依存) と WMGP 固有 (module) を実装で分離する`。

`rule-modules.md` で設計レベルにとどまっていた責務分離を、 実装に落とす段階。 まずは WMGP 単体で 「分離して動く」 ことを示す PoC とし、 別リーグ投入は本 PoC のスコープ外とする (= Phase 3 に分離)。

### 切り出すコア

- `Core Domain`: League / Phase / Week / Match / MatchResult / RoundResult / BoardResult / Export
- `Core Rules`: 順位計算 / 進行ルール / 決勝進出判定
- `Core Renderers`: 試合結果画像レイアウト基盤
- `Core Reports`: 公式記録レイヤー (将来のチーム報告レイヤーと混ぜない)

### WMGP 固有 (module) に閉じ込めるもの

- 予選ブロック運用の具体ルール
- 勝ち点とタイブレーク順序
- `3人メイン + 任意1人サブ`
- `最大3ラウンド / 2ラウンド先取`
- 結果画像の見た目
- 決勝ブラケットの見た目

### 受入条件

- 既存 WMGP league で `画面 / 画像出力 / 集計結果` が PoC 前後で完全一致する
- `Core` 側コードに `WMGP` 固有概念 (= 勝ち点ルール / 画像レイアウト等) の参照がない
- `WMGP module` 側コードが `Core` の公開インタフェースのみ経由してコアを呼ぶ

## Phase 3: 他リーグ / 大規模大会への展開

目標: `分離したコアに、 WMGP 以外の league module を載せて回す`。

想定する展開先:

- 別運用ルールの中規模リーグ (= 勝ち点 / タイブレーク / 進行が違う)
- 大規模大会形式 (= スイス / ダブルエリミネーション / 多ブロック予選 + 決勝トーナメント)
- 異なる画像レイアウトを要求する league

着手前提:

- Phase 2 の PoC で `Core / WMGP module` の境界が成立していること
- 投入候補リーグの具体スコープが固まっていること (= 抽象的に「汎用化」 はしない)

各 league module は Plane Issue で個別起票し、 1 league = 1 Phase 節目 Issue として扱う。
