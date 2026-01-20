# 技術スタック

## 概要

遊戯王マスターデュエルのオンライントーナメント運営システム

## 要件

- アプリ形態: Webアプリケーション
- 利用シーン: オンライン大会
- 想定規模: 小〜中規模（〜128人程度）

## 技術スタック

### フロントエンド + バックエンド

| 項目 | 技術 | 備考 |
|------|------|------|
| フレームワーク | Next.js (App Router) | React製フルスタックFW |
| 言語 | TypeScript | 型安全性を重視 |
| UIライブラリ | shadcn/ui | Tailwind + Radix UI ベース |
| スタイリング | Tailwind CSS | ユーティリティファースト |

### バックエンド / インフラ

| 項目 | 技術 | 備考 |
|------|------|------|
| BaaS | Supabase | PostgreSQL + 認証 + リアルタイム |
| ホスティング | Vercel | Next.jsとの相性が良い |
| データベース | PostgreSQL | Supabase提供 |
| 認証 | Supabase Auth | メール/OAuth対応 |

### 開発ツール

| 項目 | 技術 | 備考 |
|------|------|------|
| パッケージマネージャ | pnpm | 高速・省ディスク |
| Linter | ESLint | コード品質管理 |
| Formatter | Prettier | コードフォーマット |
| Git Hooks | Husky + lint-staged | コミット前チェック |

## ディレクトリ構成（予定）

```
src/
├── app/                  # Next.js App Router
│   ├── (auth)/          # 認証関連ページ
│   ├── (dashboard)/     # ダッシュボード
│   ├── tournaments/     # トーナメント関連
│   └── api/             # API Routes
├── components/          # UIコンポーネント
│   ├── ui/              # shadcn/ui コンポーネント
│   └── features/        # 機能別コンポーネント
├── lib/                 # ユーティリティ
│   ├── supabase/        # Supabaseクライアント
│   └── utils/           # 汎用関数
├── hooks/               # カスタムフック
├── types/               # 型定義
└── styles/              # グローバルスタイル
```

## 進捗

- [x] UIライブラリの決定 → shadcn/ui
- [x] 機能要件の整理 → docs/05-features/requirements.md
- [x] データベース設計 → docs/04-data/database-design.md
- [x] 画面設計 → docs/06-interfaces/screen-design.md
