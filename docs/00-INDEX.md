# Katorin2 ドキュメント

**遊戯王マスターデュエル オンライントーナメント運営システム**

## 目的

Katorin2ドキュメントのナビゲーションを提供する。本ドキュメントはドキュメント構造のSSoT（Single Source of Truth）である。

## ドキュメント構造

C4モデル + arc42に基づいて階層化。

| ディレクトリ | 内容 |
|-------------|------|
| 00-INDEX | このファイル。ナビゲーション・入り口 |
| 00-writing-guidelines | ドキュメント執筆ガイドライン |
| 01-introduction | プロジェクト概要・技術スタック |
| 02-architecture | ディレクトリ構造・コンポーネント設計 |
| 04-data | データベース設計 |
| 05-features | 機能要件 |
| 06-interfaces | 画面設計・UI仕様 |
| 07-security | セキュリティ・RLSポリシー |
| 08-deployment | セットアップ・設定ガイド |
| 09-development | 開発者向け（Issue等） |
| 10-decisions | 設計決定記録（ADR） |
| appendix | 付録（用語集等） |

### C4モデル対応

| C4レベル | 説明 | 対応ドキュメント |
|---------|------|-----------------|
| Level 1: Context | システム全体と外部との関係 | @01-introduction/tech-stack.md |
| Level 2: Container | 主要コンポーネント（Next.js, Supabase） | @02-architecture/directory-structure.md |
| Level 3: Component | 各コンポーネントの内部構造 | @05-features/, @06-interfaces/ |
| Level 4: Code | 実装詳細 | @04-data/database-design.md |

### arc42対応

| arc42セクション | 対応ディレクトリ |
|----------------|-----------------|
| 1. Introduction and Goals | 01-introduction |
| 5. Building Block View | 02-architecture, 05-features, 06-interfaces |
| 7. Deployment View | 08-deployment |
| 8. Cross-cutting Concepts | 07-security |
| 9. Architecture Decisions | 10-decisions |
| 12. Glossary | appendix |

## はじめに読むべきドキュメント

### 初めての方

Katorin2が何をするものか理解したい：

| 順序 | ドキュメント | 内容 |
|:----:|------------|------|
| 1 | @01-introduction/tech-stack.md | 技術スタック・プロジェクト概要 |
| 2 | @05-features/requirements.md | 機能要件一覧 |
| 3 | @04-data/database-design.md | データモデル概要 |

### 開発者

Katorin2の機能を開発したい：

| 順序 | ドキュメント | 内容 |
|:----:|------------|------|
| 1 | @02-architecture/directory-structure.md | ディレクトリ構造・コンポーネント設計 |
| 2 | @06-interfaces/screen-design.md | 画面設計・UI仕様 |
| 3 | @07-security/rls-policies.md | RLSポリシー設計 |
| 4 | @09-development/issues.md | 開発Issue一覧 |

### 主催者（運用）

大会を運営したい：

| 順序 | ドキュメント | 内容 |
|:----:|------------|------|
| 1 | @08-deployment/oauth-setup.md | OAuth認証セットアップ |
| 2 | @05-features/requirements.md | 機能要件・対応形式 |

## ドキュメント一覧

### 00-ルートファイル

| ファイル | 内容 |
|---------|------|
| INDEX.md | このファイル。ナビゲーション・入り口 |
| writing-guidelines.md | ドキュメント執筆ガイドライン |

### 01-introduction

| ファイル | 内容 |
|---------|------|
| tech-stack.md | 技術スタック、開発ツール、ディレクトリ概要 |

### 02-architecture

| ファイル | 内容 |
|---------|------|
| directory-structure.md | ディレクトリ構造、コンポーネント設計、データフロー |

### 04-data

| ファイル | 内容 |
|---------|------|
| database-design.md | データベース設計、テーブル定義、リレーション |

### 05-features

| ファイル | 内容 |
|---------|------|
| requirements.md | 機能要件一覧、ユーザー種別、トーナメント形式 |

### 06-interfaces

| ファイル | 内容 |
|---------|------|
| screen-design.md | 画面設計、UI仕様、画面遷移 |

### 07-security

| ファイル | 内容 |
|---------|------|
| rls-policies.md | Row Level Security ポリシー設計 |

### 08-deployment

| ファイル | 内容 |
|---------|------|
| oauth-setup.md | OAuth認証（Google, Discord）セットアップ |

### 09-development

| ファイル | 内容 |
|---------|------|
| issues.md | 開発Issue一覧、優先度、実装順序 |

### 10-decisions

| ファイル | 内容 |
|---------|------|
| refactoring-design.md | リファクタリング設計書、改善計画 |

### appendix

| ファイル | 内容 |
|---------|------|
| glossary.md | 用語集 |

## トピック別インデックス

### 設計・アーキテクチャ

| トピック | ドキュメント |
|---------|------------|
| 技術スタック | @01-introduction/tech-stack.md |
| ディレクトリ構造 | @02-architecture/directory-structure.md |
| データベース設計 | @04-data/database-design.md |
| 設計決定 | @10-decisions/refactoring-design.md |

### 機能・画面

| トピック | ドキュメント |
|---------|------------|
| 機能要件 | @05-features/requirements.md |
| 画面設計 | @06-interfaces/screen-design.md |
| 開発Issue | @09-development/issues.md |

### セキュリティ・デプロイ

| トピック | ドキュメント |
|---------|------------|
| RLSポリシー | @07-security/rls-policies.md |
| OAuthセットアップ | @08-deployment/oauth-setup.md |

## よくある質問への直リンク

| 質問 | ドキュメント |
|------|-------------|
| Katorin2とは何？ | @01-introduction/tech-stack.md |
| どんな技術を使っている？ | @01-introduction/tech-stack.md |
| ディレクトリ構造は？ | @02-architecture/directory-structure.md |
| DBスキーマは？ | @04-data/database-design.md |
| 機能一覧は？ | @05-features/requirements.md |
| 画面設計は？ | @06-interfaces/screen-design.md |
| RLSポリシーは？ | @07-security/rls-policies.md |
| OAuthの設定方法は？ | @08-deployment/oauth-setup.md |
| 開発Issueは？ | @09-development/issues.md |
| 用語の意味は？ | @appendix/glossary.md |

## ドキュメント凡例

### 相対パス表記

ドキュメント内では @ で始まる相対パスで他ドキュメントを参照：

| 表記 | 意味 |
|------|------|
| @02-architecture/directory-structure.md | docsルートからの相対パス |
| @appendix/glossary.md | 付録ディレクトリからの相対パス |

## バージョン履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 2.0 | 2026-01-21 | agentmine記法に準拠した全面改訂 |
| 1.0 | 2026-01 | 初版（Divio標準形式） |

**次に読むべきドキュメント**: @01-introduction/tech-stack.md
