# 技術スタック

## 目的

Katorin2の技術スタックと開発環境を定義する。本ドキュメントは技術選定のSSoTである。

## 背景

遊戯王マスターデュエルのオンライントーナメント運営システムとして、以下の要件を満たす技術スタックを選定した。

| 要件 | 説明 |
|------|------|
| アプリ形態 | Webアプリケーション |
| 利用シーン | オンライン大会運営 |
| 想定規模 | 小〜中規模（〜128人程度の大会） |
| リアルタイム性 | 結果更新は即時反映 |
| レスポンシブ | PC・スマートフォン両対応 |

## 技術スタック

### フロントエンド

| カテゴリ | 技術 | 選定理由 |
|---------|------|----------|
| フレームワーク | Next.js (App Router) | React製フルスタックFW、SSR/SSG対応 |
| 言語 | TypeScript | 型安全性を重視 |
| UIライブラリ | shadcn/ui | Tailwind + Radix UI ベース、カスタマイズ性 |
| スタイリング | Tailwind CSS | ユーティリティファースト、高速開発 |
| 国際化 | next-intl | App Router対応のi18nライブラリ |

### バックエンド / インフラ

| カテゴリ | 技術 | 選定理由 |
|---------|------|----------|
| BaaS | Supabase | PostgreSQL + 認証 + リアルタイム |
| ホスティング | Vercel | Next.jsとの相性、ゼロコンフィグ |
| データベース | PostgreSQL | Supabase提供、堅牢なRDBMS |
| 認証 | Supabase Auth | メール/OAuth（Google, Discord）対応 |
| リアルタイム | Supabase Realtime | WebSocket、即時更新 |
| ストレージ | Supabase Storage | 画像アップロード |

### 開発ツール

| カテゴリ | 技術 | 用途 |
|---------|------|------|
| パッケージマネージャ | pnpm | 高速・省ディスク |
| Linter | ESLint | コード品質管理 |
| Formatter | Prettier | コードフォーマット |
| Git Hooks | Husky + lint-staged | コミット前チェック |
| 型生成 | Supabase CLI | DBスキーマからTypeScript型生成 |

## ディレクトリ概要

プロジェクトはNext.js App Routerのディレクトリ構造に従う。主要なディレクトリは以下の通り。

| ディレクトリ | 用途 |
|-------------|------|
| src/app/ | Next.js App Router（ページ、レイアウト） |
| src/components/ | UIコンポーネント |
| src/lib/ | ユーティリティ、Supabaseクライアント |
| src/hooks/ | カスタムフック |
| src/types/ | 型定義 |
| src/i18n/ | 国際化設定 |
| supabase/ | マイグレーション、シードデータ |

詳細は @02-architecture/directory-structure.md を参照。

## 開発進捗

| マイルストーン | 状態 |
|---------------|------|
| UIライブラリ決定 | 完了（shadcn/ui） |
| 機能要件整理 | 完了 |
| データベース設計 | 完了 |
| 画面設計 | 完了 |
| MVP実装 | 進行中 |

## 関連ドキュメント

- @02-architecture/directory-structure.md - ディレクトリ構造詳細
- @04-data/database-design.md - データベース設計
- @05-features/requirements.md - 機能要件
- @appendix/glossary.md - 用語集
