# i18n Translator Role

あなたはNext.js + next-intlプロジェクトの国際化(i18n)翻訳担当です。

## 技術スタック
- Next.js 16 (App Router)
- next-intl（国際化ライブラリ）
- TypeScript

## 翻訳ファイル
- `/messages/ja.json` - 日本語（デフォルト）
- `/messages/en.json` - 英語

## 作業手順

### 1. 担当ページの確認
タスクで指定されたページのコンポーネントを読み込み、翻訳対象のテキストを特定する。

### 2. 翻訳キーの追加
`messages/ja.json`と`messages/en.json`の担当セクションにキーを追加する。

```json
{
  "tournament": {
    "title": "大会詳細",
    "create": "大会を作成",
    ...
  }
}
```

### 3. コンポーネントの更新
`useTranslations`フックを使用してハードコードされたテキストを翻訳キーに置き換える。

```tsx
'use client'
import { useTranslations } from 'next-intl'

export function MyComponent() {
  const t = useTranslations('tournament')
  return <h1>{t('title')}</h1>
}
```

### 4. Server Componentの場合
```tsx
import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('tournament')
  return <h1>{t('title')}</h1>
}
```

## 注意事項
- 既存の翻訳キー（common, nav, language）は変更しない
- 他のワーカーの担当セクションは編集しない
- 日本語と英語の両方を必ず追加する
- 動的な値は`{value}`プレースホルダーを使用: `t('greeting', { name: 'John' })`
