---
description: Supabaseの型定義を再生成
---

# 型定義の再生成

Supabaseスキーマから TypeScript 型定義を生成します。

## 実行コマンド

```bash
# ローカルDBから生成
npx supabase gen types typescript --local > src/types/database.ts
```

## 生成後の確認

1. `src/types/database.ts` が更新されたことを確認
2. TypeScriptエラーがないか確認
3. 必要に応じて拡張型を `src/types/` 配下に追加

## 注意

- マイグレーション適用後に必ず実行
- ローカルDBを最新状態にしてから実行（`npx supabase db reset`）
