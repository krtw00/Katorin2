# Katorin2 ドキュメントレビューレポート

作成日: 2026-01-20

## レビュー概要

本レビューは、docs/ディレクトリ内のドキュメントを「将来の理想の設計」として評価し、ドキュメント間の矛盾、不足情報、実装との乖離、改善点を洗い出したものです。

### レビュー対象ドキュメント

| ファイル | 内容 |
|----------|------|
| 00-INDEX.md | ドキュメントインデックス |
| 01-introduction/tech-stack.md | 技術スタック |
| 04-data/database-design.md | データベース設計 |
| 05-features/requirements.md | 機能要件 |
| 06-interfaces/screen-design.md | 画面設計 |
| 08-deployment/oauth-setup.md | OAuth認証セットアップ |
| 09-development/issues.md | 開発Issue一覧 |
| 10-decisions/refactoring-design.md | リファクタリング設計書 |

---

## 1. ドキュメント間の矛盾点

### 1.1 tournament_status ENUM定義の不一致

**場所:**
- docs/04-data/database-design.md: `check_in` ステータスが含まれる
- supabase/migrations/001_mvp_schema.sql: `check_in` ステータスが含まれない

**詳細:**
```sql
-- docs/04-data/database-design.md
CREATE TYPE tournament_status AS ENUM (
  'draft', 'published', 'recruiting', 'check_in', 'in_progress', 'completed', 'cancelled'
);

-- supabase/migrations/001_mvp_schema.sql (実際のマイグレーション)
CREATE TYPE tournament_status AS ENUM (
  'draft', 'published', 'recruiting', 'in_progress', 'completed', 'cancelled'
);
```

**推奨対応:** ドキュメントの`check_in`ステータスが将来実装予定なのであれば、Phase区分を明記する。または実際のマイグレーションに追加する。

### 1.2 custom_fieldsの実装方式の不一致

**場所:**
- docs/04-data/database-design.md: `custom_fields`と`custom_answers`テーブルを定義（正規化）
- supabase/migrations/002_add_custom_fields.sql: tournaments.custom_fields (JSONB) として実装

**詳細:**
ドキュメントでは正規化されたテーブル設計を示しているが、実際のマイグレーションはJSON形式で実装されている。

```sql
-- ドキュメント: 正規化されたテーブル設計
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  label VARCHAR(50) NOT NULL,
  field_type field_type NOT NULL,
  ...
);

-- 実装: JSONBカラム
ALTER TABLE tournaments ADD COLUMN custom_fields JSONB DEFAULT '[]'::jsonb;
```

**推奨対応:** どちらの設計が最終的な方針かを明確にする。JSON方式は柔軟だが、検索・集計には不向き。

### 1.3 tournamentsテーブルのカラム不一致

**場所:**
- docs/04-data/database-design.md
- supabase/migrations/001_mvp_schema.sql + 002 + 003 + 004 + 005

**詳細:**
ドキュメントには以下のカラムが記載されているが、実際のマイグレーションには含まれていない：

| カラム | docs | migrations |
|--------|------|------------|
| check_in_enabled | あり | なし |
| check_in_start_at | あり | なし |
| check_in_deadline | あり | なし |
| deck_registration_mode | あり | なし |
| swiss_rounds | あり | なし |

**推奨対応:** 将来実装予定のカラムは明確にPhase 2としてマーキングするか、先行してマイグレーションを作成する。

### 1.4 通知タイプの不一致

**場所:**
- docs/04-data/database-design.md: 6種類
- supabase/migrations/001_mvp_schema.sql: 4種類

**詳細:**
```sql
-- ドキュメント
CREATE TYPE notification_type AS ENUM (
  'match_ready', 'match_result', 'tournament_start',
  'check_in_reminder', 'team_invite', 'report_needed'
);

-- マイグレーション
CREATE TYPE notification_type AS ENUM (
  'match_ready', 'match_result', 'tournament_start', 'report_needed'
);
```

`check_in_reminder`と`team_invite`が不足している。

### 1.5 URL構造の不一致

**場所:**
- docs/06-interfaces/screen-design.md: `/mypage`, `/mypage/edit`
- README.md: `/my/`配下
- 実際のコード: `src/app/[locale]/(main)/`構造（i18n対応）

**詳細:**
画面設計では`/mypage`となっているが、READMEでは`/my/`、実装では`[locale]`付きのルーティングになっている。

**推奨対応:** 画面設計ドキュメントを実装に合わせて更新するか、i18n対応を考慮したURL設計を明記する。

---

## 2. 不足している情報

### 2.1 アーキテクチャドキュメントの欠如

00-INDEX.mdでは`02-architecture/`ディレクトリが記載されているが、実際のディレクトリ構造には存在しない。以下のドキュメントが不足している：

- ディレクトリ構造の詳細
- コンポーネント設計ガイドライン
- 状態管理の方針
- API設計ガイドライン

### 2.2 セキュリティドキュメントの欠如

`07-security/`ディレクトリがINDEXに記載されているが存在しない。以下が不足：

- RLSポリシーの設計意図と詳細
- セキュリティベストプラクティス
- 認証・認可のフロー説明

### 2.3 テスト戦略ドキュメントの欠如

テストに関するドキュメントが一切存在しない：

- ユニットテスト方針
- 統合テスト方針
- E2Eテスト方針
- テストカバレッジ目標

### 2.4 環境構築ドキュメントの不足

`08-deployment/oauth-setup.md`は存在するが、以下が不足：

- ローカル環境構築手順（詳細版）
- 環境変数一覧と説明
- Docker環境のセットアップ（もしあれば）
- CI/CDパイプラインの説明

### 2.5 API仕様書の欠如

Server ActionsやAPI Routesの仕様が文書化されていない：

- エンドポイント一覧
- リクエスト/レスポンス形式
- エラーコード一覧
- 認証要件

### 2.6 シリーズ機能の詳細仕様不足

- ポイント計算ロジックの詳細（ranking方式の範囲指定 `"5-8": 10` の解釈方法）
- 自動ポイント計算のトリガータイミング
- ポイント修正・取り消しフロー

### 2.7 リアルタイム機能の設計ドキュメント不足

- Supabase Realtimeの使用パターン
- チャンネル設計
- 接続管理の方針

---

## 3. 古い情報や実装と乖離している可能性のある記述

### 3.1 tech-stack.mdの進捗チェックリスト

**場所:** docs/01-introduction/tech-stack.md

**問題:**
```markdown
## 進捗

- [x] UIライブラリの決定 → shadcn/ui
- [x] 機能要件の整理 → doc/requirements.md
- [ ] データベース設計
- [ ] 画面設計
```

データベース設計と画面設計は既に完了しているが、チェックリストが更新されていない。また、参照先が`doc/`（旧パス）になっている。

### 3.2 README.mdのNext.jsバージョン

**場所:** README.md

**問題:**
```markdown
- **フレームワーク**: Next.js 16 (App Router)
```

Next.js 16は現時点で存在しない。実際のバージョンを確認し、正確な記述に修正が必要。

### 3.3 screen-design.mdの画面番号重複

**場所:** docs/06-interfaces/screen-design.md

**問題:**
画面番号31が2回使用されている：
- 31. 大会メタゲーム統計 `/tournaments/[id]/stats`
- 31. 結果カード生成 `/tournaments/[id]/share/result/[matchId]`

**推奨対応:** 番号を修正（35が正しい）

### 3.4 refactoring-design.mdのファイル行数

**場所:** docs/10-decisions/refactoring-design.md

**問題:**
```markdown
**現状**: 12,032行の巨大なモノリシックコンポーネント (SeriesForm.tsx)
**現状**: 5,781行 (TeamForm.tsx)
**現状**: 846行 (TournamentForm.tsx)
```

これらの数値が現在のコードベースと一致しているか定期的な確認が必要。リファクタリング実施後に更新されていない可能性がある。

### 3.5 issues.mdの作成日

**場所:** docs/09-development/issues.md

**問題:**
```markdown
作成日: 2026-01-18
```

Issue一覧は作成日だけでなく、最終更新日も記載し、各Issueのステータス（完了/未完了）を定期的に更新すべき。

### 3.6 旧docディレクトリとdocsディレクトリの重複

**問題:**
プロジェクト内に`doc/`と`docs/`の両方が存在し、内容が重複している可能性がある。

```
/home/iguchi/work/Katorin2/doc/requirements.md
/home/iguchi/work/Katorin2/doc/database-design.md
/home/iguchi/work/Katorin2/doc/screen-design.md
/home/iguchi/work/Katorin2/doc/tech-stack.md
```

**推奨対応:** 古い`doc/`ディレクトリを削除し、`docs/`に一本化する。

---

## 4. 改善すべき点

### 4.1 ドキュメントのバージョン管理

各ドキュメントに以下を追加することを推奨：

```markdown
---
title: ドキュメントタイトル
version: 1.0.0
created: 2026-01-18
updated: 2026-01-20
status: draft | review | approved
---
```

### 4.2 用語集の作成

プロジェクト固有の用語（シリーズ、チーム戦、勝ち抜き戦、ポイント制など）の定義を一箇所にまとめた用語集を作成すべき。

### 4.3 Phase区分の明確化

現在、Phase 1/Phase 2の区分が散在している。以下を明確にすべき：

- 各Phaseに含まれる機能の一覧
- Phaseの完了条件
- Phase間の依存関係

### 4.4 図表の追加

以下の図表を追加することで可読性が向上する：

- システムアーキテクチャ図
- 認証フロー図（シーケンス図）
- データフロー図
- ステートマシン図（tournament_status遷移）

### 4.5 エラーハンドリング方針の文書化

`refactoring-design.md`でエラーハンドリングの設計が示されているが、これを独立したドキュメントとして整備すべき：

- エラーコード体系
- ユーザー向けエラーメッセージ一覧
- エラーログの形式
- 障害対応フロー

### 4.6 国際化（i18n）対応の文書化

実装では`[locale]`ルーティングが使用されているが、国際化対応についてのドキュメントがない：

- 対応言語一覧
- 翻訳ファイルの管理方法
- 日時フォーマットの方針

### 4.7 アクセシビリティガイドラインの追加

画面設計にアクセシビリティ要件（WAI-ARIA、キーボード操作など）を追加すべき。

### 4.8 パフォーマンス要件の明確化

非機能要件に以下を追加することを推奨：

- ページ読み込み時間の目標
- API応答時間の目標
- 同時接続数の詳細（ピーク時の想定）
- データベースのスケーリング方針

### 4.9 監視・運用ドキュメントの追加

- ログ監視の方針
- アラート設定
- 障害時の対応手順
- バックアップ・リストア手順

---

## 5. 優先度付き対応推奨事項

### 高優先度（即座に対応）

1. **旧docディレクトリの統合・削除** - 混乱を防ぐ
2. **tournament_status ENUMの整合性確保** - 実装に影響
3. **カラム定義の整合性確保** - 新機能実装時の障害を防ぐ
4. **README.mdのNext.jsバージョン修正** - 誤解を防ぐ

### 中優先度（1-2週間以内）

5. **URL構造の統一** - 画面設計と実装の乖離解消
6. **アーキテクチャドキュメントの作成** - 開発者オンボーディングに必要
7. **Phase区分の明確化** - 開発計画の可視化
8. **custom_fields実装方式の決定と文書化**

### 低優先度（継続的改善）

9. **用語集の作成**
10. **図表の追加**
11. **ドキュメントメタデータの追加**
12. **国際化ドキュメントの追加**

---

## 6. 総括

Katorin2のドキュメントは全体的に詳細で網羅的だが、以下の課題がある：

1. **ドキュメントと実装の乖離** - 特にデータベーススキーマに関して
2. **ドキュメント構造の不完全性** - 予定されているディレクトリが存在しない
3. **情報の重複** - doc/とdocs/の重複
4. **更新の遅れ** - 進捗チェックリストや行数情報が古い

これらの課題に対応することで、ドキュメントの信頼性が向上し、開発効率の改善が期待できる。

---

## 付録: チェックリスト

### ドキュメント整合性チェック

- [ ] tournament_status ENUMの統一
- [ ] notification_type ENUMの統一
- [ ] custom_fields実装方式の決定
- [ ] tournamentsテーブルカラムの整合性
- [ ] URL構造の統一

### 不足ドキュメントの作成

- [ ] 02-architecture/directory-structure.md
- [ ] 03-design/component-guidelines.md
- [ ] 07-security/rls-policies.md
- [ ] テスト戦略ドキュメント
- [ ] API仕様書
- [ ] 用語集

### 更新が必要なドキュメント

- [ ] tech-stack.md - 進捗チェックリスト更新
- [ ] README.md - Next.jsバージョン修正
- [ ] screen-design.md - 画面番号修正
- [ ] issues.md - ステータス更新

---

*このレビューレポートは2026-01-20時点の情報に基づいています。定期的な見直しを推奨します。*
