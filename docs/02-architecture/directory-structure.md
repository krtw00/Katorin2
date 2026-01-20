# ディレクトリ構造

## 概要

Next.js 16 (App Router) + TypeScript のプロジェクト構造

## ディレクトリツリー

```
src/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # i18n対応（next-intl）
│   │   ├── (main)/              # メインレイアウト
│   │   │   ├── tournaments/     # 大会関連ページ
│   │   │   ├── series/          # シリーズ関連ページ
│   │   │   ├── teams/           # チーム関連ページ
│   │   │   └── my/              # マイページ
│   │   └── (auth)/              # 認証レイアウト
│   │       ├── login/
│   │       └── register/
│   └── auth/callback/            # OAuth認証コールバック
│
├── components/                   # UIコンポーネント
│   ├── ui/                      # shadcn/ui コンポーネント
│   ├── layout/                  # レイアウトコンポーネント
│   ├── tournament/              # 大会関連コンポーネント
│   │   └── hooks/               # 大会固有のカスタムフック
│   ├── series/                  # シリーズ関連コンポーネント
│   └── team/                    # チーム関連コンポーネント
│
├── lib/                         # ユーティリティ・ライブラリ
│   ├── supabase/                # Supabaseクライアント設定
│   ├── tournament/              # トーナメントロジック
│   ├── errors/                  # エラーハンドリング
│   └── types/                   # 共通型定義
│
├── hooks/                       # グローバルカスタムフック
│
├── i18n/                        # 国際化設定
│
└── types/                       # グローバル型定義
```

## ルーティング構造

### i18n対応

`[locale]` セグメントにより多言語対応：
- `/en/tournaments` - 英語
- `/ja/tournaments` - 日本語

### Route Groups

| グループ | 用途 | レイアウト |
|----------|------|-----------|
| `(main)` | メインアプリケーション | ヘッダー + サイドバー |
| `(auth)` | 認証ページ | シンプルなセンタリングレイアウト |

### 主要ルート

| パス | 説明 |
|------|------|
| `/` | トップページ |
| `/tournaments` | 大会一覧 |
| `/tournaments/new` | 大会作成 |
| `/tournaments/[id]` | 大会詳細 |
| `/tournaments/[id]/manage` | 大会管理 |
| `/tournaments/[id]/bracket` | トーナメント表 |
| `/series` | シリーズ一覧 |
| `/teams` | チーム一覧 |
| `/my` | マイページ |

## コンポーネント設計

### コンポーネント分類

1. **UIコンポーネント** (`components/ui/`)
   - shadcn/ui ベースの汎用コンポーネント
   - プロジェクト固有のカスタマイズあり

2. **機能コンポーネント** (`components/{feature}/`)
   - 特定機能に紐づくコンポーネント
   - 例: `TournamentCard`, `BracketView`

3. **レイアウトコンポーネント** (`components/layout/`)
   - ヘッダー、フッター、サイドバー等

### 命名規則

| 種類 | 命名 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `TournamentCard.tsx` |
| フック | camelCase (use prefix) | `useRealtimeMatches.ts` |
| ユーティリティ | camelCase | `bracketUtils.ts` |
| 型定義 | PascalCase | `Tournament.ts` |

## データフロー

```
┌─────────────────┐
│   Page/Layout   │ ← Server Component (デフォルト)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Server Action  │ ← データ取得・更新
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Supabase     │ ← データベース
└─────────────────┘

┌─────────────────┐
│ Client Component│ ← 'use client' 指定
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Custom Hooks   │ ← useRealtimeMatches等
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Supabase Realtime│ ← リアルタイム更新
└─────────────────┘
```

## 状態管理

### サーバーサイド
- Server Components でのデータ取得
- Server Actions でのデータ更新

### クライアントサイド
- **ローカル状態**: React useState/useReducer
- **リアルタイム**: Supabase Realtime + カスタムフック
- **フォーム**: React Hook Form

グローバル状態管理ライブラリ（Redux, Zustand等）は現在不使用。
