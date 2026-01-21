# 用語集

## 目的

Katorin2プロジェクトで使用する用語の定義を提供する。本ドキュメントは用語定義のSSoTである。

## 背景

プロジェクト全体で一貫した用語の理解を促進するため、ドメイン用語・技術用語・略語を整理する。

## ドメイン用語

### 大会関連

| 用語 | 英語 | 説明 |
|------|------|------|
| 大会 | Tournament | 競技イベントの単位。参加者が対戦し順位を決定する |
| シリーズ | Series | 複数の大会をまとめた長期リーグ。ポイント制でランキングを算出 |
| 試合 | Match | 2者間の対戦。勝敗とスコアを記録 |
| ラウンド | Round | トーナメントの段階。1回戦、2回戦、準決勝、決勝など |
| ブラケット | Bracket | トーナメントの対戦表。試合の組み合わせと進行を表示 |
| 参加者 | Participant | 大会に参加登録したユーザーまたはチーム |
| 主催者 | Organizer | 大会またはシリーズを作成・管理する権限を持つユーザー |
| エントリー | Entry | 大会への参加登録行為 |
| チェックイン | Check-in | 大会開始前に参加者が出席を確認する行為 |

### トーナメント形式

| 用語 | 英語 | 説明 |
|------|------|------|
| シングルエリミネーション | Single Elimination | 1回負けると敗退するトーナメント形式 |
| ダブルエリミネーション | Double Elimination | 2回負けると敗退するトーナメント形式。敗者復活あり |
| スイスドロー | Swiss Draw | 全員が同数の試合を行い、勝敗で順位を決める形式 |
| BO1 | Best of 1 | 1本先取。1試合で勝敗決定 |
| BO3 | Best of 3 | 2本先取。最大3試合で勝敗決定 |
| BO5 | Best of 5 | 3本先取。最大5試合で勝敗決定 |
| BYE | BYE | 不戦勝。対戦相手がいない場合に自動勝利 |
| シード | Seed | 強豪選手を分散配置するための順位付け |

### チーム関連

| 用語 | 英語 | 説明 |
|------|------|------|
| チーム | Team | 複数のユーザーで構成されるグループ |
| リーダー | Leader | チームの代表者。メンバー管理権限を持つ |
| メンバー | Member | チームに所属するユーザー |
| 招待 | Invite | チームへの参加を依頼する仕組み。トークンで管理 |
| チーム戦 | Team Battle | チーム単位で参加する大会形式 |
| 個人戦 | Solo | 個人単位で参加する大会形式 |

### ポイント・ランキング

| 用語 | 英語 | 説明 |
|------|------|------|
| ポイントシステム | Point System | シリーズでの順位に応じてポイントを付与する仕組み |
| ランキング | Ranking | ポイント合計による順位表 |
| 順位 | Placement | 大会での最終成績。1位、2位、3-4位など |

## 技術用語

### アーキテクチャ

| 用語 | 説明 |
|------|------|
| Next.js | Reactベースのフルスタックフレームワーク |
| App Router | Next.js 13以降のルーティング方式。ファイルベースルーティング |
| Server Component | サーバー側でレンダリングされるReactコンポーネント |
| Client Component | クライアント側で実行されるReactコンポーネント |
| Supabase | PostgreSQLベースのBaaS。認証・データベース・リアルタイム機能を提供 |
| Edge Function | Supabaseのサーバーレス関数。Deno runtime |

### データベース

| 用語 | 説明 |
|------|------|
| RLS | Row Level Security。行単位のアクセス制御をデータベースレベルで実装 |
| PostgreSQL | リレーショナルデータベース。Supabaseの基盤 |
| マイグレーション | データベーススキーマの変更管理 |
| トリガー | データベースイベント発生時に自動実行される処理 |
| JSONB | PostgreSQLのJSON型。カスタムフィールド保存に使用 |

### 認証・セキュリティ

| 用語 | 説明 |
|------|------|
| OAuth | 外部サービスを使った認証プロトコル。Google、Discord対応 |
| JWT | JSON Web Token。認証情報を含むトークン |
| Anon Key | クライアント用の公開APIキー。RLSに従う |
| Service Role Key | サーバー用の管理APIキー。RLSをバイパス |
| セッション | ユーザーのログイン状態を維持する仕組み |

### リアルタイム

| 用語 | 説明 |
|------|------|
| Realtime | Supabaseのリアルタイム機能。WebSocketベース |
| Subscription | データ変更をリアルタイムで受信する購読 |
| Broadcast | 複数クライアントへの同時通知 |
| Presence | ユーザーのオンライン状態管理 |

### フロントエンド

| 用語 | 説明 |
|------|------|
| shadcn/ui | Tailwind CSSベースのUIコンポーネントライブラリ |
| Tailwind CSS | ユーティリティファーストのCSSフレームワーク |
| React Hook Form | フォーム状態管理ライブラリ |
| Zod | TypeScript向けスキーマバリデーションライブラリ |
| TanStack Query | サーバー状態管理ライブラリ（旧React Query） |

## 略語

| 略語 | 正式名称 | 説明 |
|------|----------|------|
| SSoT | Single Source of Truth | 唯一の情報源。このドキュメントが正式な定義 |
| MVP | Minimum Viable Product | 最小限の実用可能な製品 |
| UI | User Interface | ユーザーインターフェース |
| UX | User Experience | ユーザー体験 |
| API | Application Programming Interface | アプリケーション間のインターフェース |
| CRUD | Create, Read, Update, Delete | 基本的なデータ操作 |
| OGP | Open Graph Protocol | SNS共有時のメタデータ規格 |

## ステータス値

### 大会ステータス（tournament_status）

| 値 | 日本語 | 説明 |
|----|--------|------|
| draft | 下書き | 作成中。公開されていない |
| open | 募集中 | 参加者を募集している |
| in_progress | 進行中 | 大会が開催されている |
| completed | 完了 | 大会が終了した |
| cancelled | キャンセル | 大会が中止された |

### 参加者ステータス（participant_status）

| 値 | 日本語 | 説明 |
|----|--------|------|
| pending | 保留 | エントリー済み、チェックイン前 |
| checked_in | チェックイン済み | 出席確認完了 |
| no_show | 不参加 | チェックインしなかった |

### シリーズステータス（series_status）

| 値 | 日本語 | 説明 |
|----|--------|------|
| active | 開催中 | シリーズが進行中 |
| completed | 完了 | シリーズが終了した |
| cancelled | キャンセル | シリーズが中止された |

### 試合ステータス（match_status）

| 値 | 日本語 | 説明 |
|----|--------|------|
| pending | 未開始 | 試合開始前 |
| in_progress | 進行中 | 試合中 |
| completed | 完了 | 試合終了、結果確定 |

## 関連ドキュメント

- @04-data/database-design.md - データベース設計（ENUM型定義）
- @05-features/requirements.md - 機能要件
- @07-security/rls-policies.md - RLSポリシー設計
- @01-introduction/tech-stack.md - 技術スタック
