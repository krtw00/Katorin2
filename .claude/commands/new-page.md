---
argument-hint: [パス] (例: tournaments/[id]/stats)
description: Next.js App Routerで新しいページを作成
---

# 新規ページ作成: $ARGUMENTS

## 作成するファイル

パス `$ARGUMENTS` に対して：

```
src/app/(main)/$ARGUMENTS/
├── page.tsx          # メインページ
├── loading.tsx       # ローディングUI (オプション)
└── error.tsx         # エラーUI (オプション)
```

## 実装内容

1. **page.tsx** - Server Component
   - Supabaseからデータ取得
   - メタデータ設定（SEO）
   - 認証チェック（必要な場合）

2. **loading.tsx** - ローディング状態
   - Skeletonコンポーネント使用

3. **error.tsx** - エラーハンドリング
   - Client Component (`'use client'`)
   - リトライ機能

## パターン選択

- **一覧ページ**: データフェッチ + マッピング表示
- **詳細ページ**: 単一データ取得 + notFound対応
- **フォームページ**: Server Actions使用
- **動的ルート**: `[id]` パラメータ対応

## コンポーネント配置

- UI部品: `src/components/ui/`
- ドメイン固有: `src/components/{domain}/`

## 参照

`nextjs-page` スキルのテンプレートを使用してください。
