---
argument-hint: [テーブル名]
description: テーブルのRLSポリシーを確認・診断
---

# RLSポリシー確認: $ARGUMENTS

## 確認項目

1. **RLS有効化状態**
   - `ALTER TABLE $ARGUMENTS ENABLE ROW LEVEL SECURITY;` が実行済みか

2. **ポリシー一覧**
   - SELECT (閲覧)
   - INSERT (作成)
   - UPDATE (更新)
   - DELETE (削除)

3. **ポリシーの内容**
   - USING句（既存行へのアクセス条件）
   - WITH CHECK句（新規/更新行の条件）

## 確認SQL

```sql
-- RLS状態確認
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = '$ARGUMENTS';

-- ポリシー一覧
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = '$ARGUMENTS';
```

## よくある問題

- [ ] RLSが有効だがポリシーが無い → 全アクセス拒否
- [ ] SELECTポリシーが無い → データ取得不可
- [ ] WITH CHECKが厳しすぎる → 作成/更新失敗
- [ ] 認証ユーザー限定なのに `TO authenticated` が無い

## 推奨パターン

```sql
-- 公開データの閲覧
CREATE POLICY "Anyone can view"
  ON $ARGUMENTS FOR SELECT
  USING (true);

-- 認証ユーザーのみ作成
CREATE POLICY "Authenticated users can create"
  ON $ARGUMENTS FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 所有者のみ更新
CREATE POLICY "Owners can update"
  ON $ARGUMENTS FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
