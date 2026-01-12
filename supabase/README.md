# Supabase セットアップガイド

## Phase 0: Supabase プロジェクトのセットアップ

### ステップ 1: Supabase プロジェクトを作成

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. 「New Project」をクリック
3. プロジェクト情報を入力:
   - Name: `Katorin2`
   - Database Password: 安全なパスワードを生成（メモしておく）
   - Region: `Northeast Asia (Tokyo)` を推奨
4. 「Create new project」をクリック（数分かかります）

### ステップ 2: データベースマイグレーションを実行

プロジェクトが作成されたら、以下の手順でマイグレーションを実行します:

#### 方法 A: Supabase ダッシュボード経由（推奨）

1. Supabase Dashboard でプロジェクトを開く
2. 左サイドバーの「SQL Editor」をクリック
3. 「New query」をクリック
4. `supabase/migrations/001_mvp_schema.sql` の内容をコピー&ペースト
5. 「Run」をクリックして実行
6. エラーが出ないことを確認

#### 方法 B: Supabase CLI 経由

```bash
# Supabase CLI のインストール（未インストールの場合）
npm install -g supabase

# Supabase にログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref <your-project-ref>

# マイグレーションを実行
supabase db push
```

### ステップ 3: 環境変数を設定

1. Supabase Dashboard で「Settings」→「API」を開く
2. 以下の情報をコピー:
   - Project URL
   - anon public key
   - service_role key (※秘密鍵なので注意)

3. プロジェクトルートに `.env.local` ファイルを作成:

```bash
cp .env.example .env.local
```

4. `.env.local` を開いて、コピーした値を貼り付け:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ステップ 4: Authentication 設定

1. Supabase Dashboard で「Authentication」→「Providers」を開く
2. 「Email」プロバイダーが有効になっていることを確認
3. 「Authentication」→「URL Configuration」を開く
4. Site URL を設定:
   - 開発環境: `http://localhost:3000`
   - 本番環境: デプロイ先のURL（例: `https://your-app.vercel.app`）
5. Redirect URLs に以下を追加:
   - `http://localhost:3000/auth/callback`
   - `https://your-app.vercel.app/auth/callback`（本番環境）

### ステップ 5: 確認

マイグレーションが正常に完了したか確認:

1. Supabase Dashboard で「Table Editor」を開く
2. 以下のテーブルが作成されていることを確認:
   - `profiles`
   - `tournaments`
   - `participants`
   - `matches`
   - `notifications`

3. 「Database」→「Extensions」で以下が有効になっていることを確認:
   - `pgcrypto`（UUID生成に必要）

### 次のステップ

データベースのセットアップが完了したら、Phase 1: プロジェクト基盤のセットアップに進みます。

## トラブルシューティング

### エラー: "relation already exists"

既にテーブルが存在している場合は、以下のコマンドで削除してから再実行:

```sql
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS match_status CASCADE;
DROP TYPE IF EXISTS result_report_mode CASCADE;
DROP TYPE IF EXISTS entry_type CASCADE;
DROP TYPE IF EXISTS visibility CASCADE;
DROP TYPE IF EXISTS match_format CASCADE;
DROP TYPE IF EXISTS tournament_format CASCADE;
DROP TYPE IF EXISTS tournament_status CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

### エラー: "publication does not exist"

Realtime が有効になっていない場合、以下を実行:

```sql
-- Realtime のセットアップ（通常は自動で作成されます）
CREATE PUBLICATION supabase_realtime;
```
