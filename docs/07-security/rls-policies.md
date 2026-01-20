# Row Level Security (RLS) ポリシー

## 概要

Supabase の Row Level Security を使用して、データベースレベルでアクセス制御を実装しています。

## ポリシー設計方針

### 基本原則

1. **最小権限の原則**: 必要最低限のアクセス権限のみ付与
2. **認証必須**: 書き込み操作は認証済みユーザーのみ
3. **所有者優先**: リソースの所有者（主催者/リーダー）に管理権限
4. **公開範囲制御**: visibility設定に基づくアクセス制御

### 認証状態

| 状態 | 説明 | 使用する関数 |
|------|------|-------------|
| 認証済み | ログインユーザー | `auth.uid() IS NOT NULL` |
| 未認証 | 匿名ユーザー | `auth.uid() IS NULL` |
| 所有者 | リソースの作成者 | `auth.uid() = organizer_id` |

---

## テーブル別ポリシー

### profiles（ユーザープロフィール）

| 操作 | ポリシー | 条件 |
|------|----------|------|
| SELECT | 全員閲覧可 | なし |
| INSERT | 自分のプロフィールのみ | `auth.uid() = id` |
| UPDATE | 自分のプロフィールのみ | `auth.uid() = id` |

```sql
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

### tournaments（大会）

| 操作 | ポリシー | 条件 |
|------|----------|------|
| SELECT | 公開大会は全員、非公開は主催者のみ | `visibility = 'public' OR organizer_id = auth.uid()` |
| INSERT | 認証済みユーザー | `auth.uid() IS NOT NULL` |
| UPDATE | 主催者のみ | `organizer_id = auth.uid()` |
| DELETE | 主催者のみ | `organizer_id = auth.uid()` |

```sql
CREATE POLICY "Public tournaments are viewable"
  ON tournaments FOR SELECT
  USING (visibility = 'public' OR organizer_id = auth.uid());

CREATE POLICY "Authenticated users can create tournaments"
  ON tournaments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Organizers can update own tournaments"
  ON tournaments FOR UPDATE
  USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete own tournaments"
  ON tournaments FOR DELETE
  USING (organizer_id = auth.uid());
```

### participants（参加者）

| 操作 | ポリシー | 条件 |
|------|----------|------|
| SELECT | 公開大会は全員 | 大会のvisibilityに依存 |
| INSERT | 認証済みユーザー | 自分のエントリーのみ |
| UPDATE | 主催者のみ | 大会の主催者 |
| DELETE | 自分または主催者 | `user_id = auth.uid() OR 主催者` |

### matches（試合）

| 操作 | ポリシー | 条件 |
|------|----------|------|
| SELECT | 公開大会は全員 | 大会のvisibilityに依存 |
| INSERT | 主催者のみ | 大会の主催者 |
| UPDATE | 主催者のみ | 大会の主催者 |
| DELETE | 主催者のみ | 大会の主催者 |

### series（シリーズ）

| 操作 | ポリシー | 条件 |
|------|----------|------|
| SELECT | 全員閲覧可 | なし |
| INSERT | 認証済みユーザー | `auth.uid() IS NOT NULL` |
| UPDATE | 主催者のみ | `organizer_id = auth.uid()` |
| DELETE | 主催者のみ | `organizer_id = auth.uid()` |

### teams（チーム）

| 操作 | ポリシー | 条件 |
|------|----------|------|
| SELECT | 全員閲覧可 | なし |
| INSERT | 認証済みユーザー | `auth.uid() IS NOT NULL` |
| UPDATE | リーダーのみ | `leader_id = auth.uid()` |
| DELETE | リーダーのみ | `leader_id = auth.uid()` |

### team_members（チームメンバー）

| 操作 | ポリシー | 条件 |
|------|----------|------|
| SELECT | 全員閲覧可 | なし |
| INSERT | リーダーのみ | チームのリーダー |
| UPDATE | リーダーのみ | チームのリーダー |
| DELETE | 自分またはリーダー | `user_id = auth.uid() OR リーダー` |

### notifications（通知）

| 操作 | ポリシー | 条件 |
|------|----------|------|
| SELECT | 自分の通知のみ | `user_id = auth.uid()` |
| UPDATE | 自分の通知のみ | `user_id = auth.uid()` |
| INSERT | システムのみ | Service Role経由 |

---

## セキュリティ上の注意点

### Service Role Key

- **用途**: RLSをバイパスする必要があるサーバーサイド処理
- **使用例**: 通知の作成、システム処理
- **注意**: クライアントサイドでは絶対に使用しない

### Anon Key

- **用途**: クライアントサイドからのアクセス
- **特性**: RLSポリシーに従う
- **配置**: 環境変数 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 認証フロー

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───>│ Supabase │───>│ Database │
│          │    │   Auth   │    │   RLS    │
└──────────┘    └──────────┘    └──────────┘
     │               │               │
     │  1. ログイン   │               │
     │──────────────>│               │
     │               │               │
     │  2. JWT発行   │               │
     │<──────────────│               │
     │               │               │
     │  3. データ要求 │               │
     │───────────────────────────────>│
     │               │               │
     │               │  4. RLS評価    │
     │               │               │
     │  5. 結果返却   │               │
     │<───────────────────────────────│
```

---

## トラブルシューティング

### よくある問題

1. **"new row violates row-level security policy"**
   - 原因: INSERT/UPDATE時にRLSポリシーに違反
   - 対処: ポリシー条件を確認、認証状態を確認

2. **データが取得できない**
   - 原因: SELECTポリシーで除外されている
   - 対処: visibility設定、認証状態を確認

3. **通知が作成できない**
   - 原因: Service Role Keyが必要
   - 対処: サーバーサイドからService Roleで実行

### デバッグ方法

```sql
-- 現在のユーザーIDを確認
SELECT auth.uid();

-- ポリシーを一時的に無効化（開発時のみ）
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```
