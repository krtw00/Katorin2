---
argument-hint: [マイグレーション名]
description: Supabaseマイグレーションを作成
---

# マイグレーション作成: $ARGUMENTS

## 手順

1. 既存のマイグレーションを確認
   - `supabase/migrations/` 内の最新番号を確認

2. 新しいマイグレーションファイルを作成
   - 命名: `{連番3桁}_{snake_case_description}.sql`
   - 例: `006_add_notification_preferences.sql`

3. マイグレーション内容を実装
   - テーブル/カラム定義
   - RLS有効化とポリシー
   - インデックス
   - 必要ならトリガー

4. ローカルで適用
   ```bash
   npx supabase db reset
   ```

5. 型定義を更新
   ```bash
   npx supabase gen types typescript --local > src/types/database.ts
   ```

## テンプレート使用

`supabase-migration` スキルのテンプレートを参照してください。

## チェックリスト

- [ ] テーブル名・カラム名は snake_case
- [ ] RLS有効化済み
- [ ] RLSポリシー定義（SELECT/INSERT/UPDATE/DELETE）
- [ ] インデックス作成（検索カラム）
- [ ] updated_at自動更新トリガー
- [ ] 型定義の再生成
