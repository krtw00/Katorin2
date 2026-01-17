# OAuth認証セットアップガイド

Katorin2では、メール/パスワード認証に加えて、Google・DiscordのOAuth認証をサポートしています。

## 概要

- **対応プロバイダー**: Google、Discord
- **実装状況**: フロントエンド実装済み
- **必要な作業**: Supabase Dashboardでの設定

---

## 1. Google OAuth設定

### 1.1 Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または既存のプロジェクトを選択
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「OAuthクライアントID」を選択
5. 同意画面の設定（初回のみ）
   - ユーザータイプ: 外部
   - アプリ名: Katorin
   - サポートメール: あなたのメールアドレス
   - 開発者の連絡先情報: あなたのメールアドレス
6. OAuthクライアントIDの作成
   - アプリケーションの種類: ウェブアプリケーション
   - 名前: Katorin (任意)
   - 承認済みのリダイレクトURI:
     ```
     https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback
     ```
7. クライアントIDとクライアントシークレットをコピー

### 1.2 Supabase Dashboardでの設定

1. [Supabase Dashboard](https://app.supabase.com/)にアクセス
2. プロジェクトを選択
3. 「Authentication」→「Providers」に移動
4. 「Google」を選択
5. 「Enable Sign in with Google」を有効化
6. Google Cloud Consoleで取得した情報を入力
   - **Client ID**: Google Cloud ConsoleのクライアントID
   - **Client Secret**: Google Cloud Consoleのクライアントシークレット
7. 「Save」をクリック

---

## 2. Discord OAuth設定

### 2.1 Discord Developer Portalでの設定

1. [Discord Developer Portal](https://discord.com/developers/applications)にアクセス
2. 「New Application」をクリックしてアプリケーションを作成
3. アプリケーション名: Katorin（任意）
4. 「OAuth2」セクションに移動
5. 「Redirects」に以下を追加:
   ```
   https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback
   ```
6. 「General Information」に戻り、以下をコピー:
   - **CLIENT ID**
   - **CLIENT SECRET**（「Reset Secret」をクリックして生成）

### 2.2 Supabase Dashboardでの設定

1. [Supabase Dashboard](https://app.supabase.com/)にアクセス
2. プロジェクトを選択
3. 「Authentication」→「Providers」に移動
4. 「Discord」を選択
5. 「Enable Sign in with Discord」を有効化
6. Discord Developer Portalで取得した情報を入力
   - **Client ID**: Discord Developer PortalのCLIENT ID
   - **Client Secret**: Discord Developer PortalのCLIENT SECRET
7. 「Save」をクリック

---

## 3. 本番環境の設定

### 3.1 リダイレクトURIの追加

本番環境（Vercel等）にデプロイした後、各OAuthプロバイダーに本番URLを追加します。

#### Google Cloud Console
1. 「認証情報」→作成したOAuthクライアントIDを選択
2. 「承認済みのリダイレクトURI」に以下を追加:
   ```
   https://yourdomain.com/auth/callback
   ```

#### Discord Developer Portal
1. 「OAuth2」→「Redirects」に以下を追加:
   ```
   https://yourdomain.com/auth/callback
   ```

### 3.2 Supabase側の設定

1. Supabase Dashboard →「Authentication」→「URL Configuration」
2. 「Site URL」を本番URLに設定:
   ```
   https://yourdomain.com
   ```
3. 「Redirect URLs」に以下を追加:
   ```
   https://yourdomain.com/auth/callback
   ```

---

## 4. 動作確認

### 4.1 ローカル環境での確認

1. 開発サーバーを起動:
   ```bash
   pnpm dev
   ```

2. ブラウザで`http://localhost:3000/login`にアクセス

3. 「Google」または「Discord」ボタンをクリック

4. 各プロバイダーの認証画面が表示されることを確認

5. 認証後、`/tournaments`ページにリダイレクトされることを確認

### 4.2 本番環境での確認

1. 本番環境にデプロイ後、ログインページにアクセス

2. OAuth認証が正常に動作することを確認

---

## 5. トラブルシューティング

### 5.1 「リダイレクトURIが一致しません」エラー

**原因**: OAuth設定のリダイレクトURIが正しくない

**解決方法**:
- Google Cloud Console / Discord Developer PortalのリダイレクトURIを確認
- Supabase DashboardのプロジェクトIDを確認
- URIが完全に一致していることを確認（末尾のスラッシュなども含む）

### 5.2 「Client ID or Secret is invalid」エラー

**原因**: Supabase Dashboardに設定したClient IDまたはClient Secretが間違っている

**解決方法**:
- Google Cloud Console / Discord Developer Portalで再度確認
- Client Secretを再生成して、新しい値をSupabaseに設定

### 5.3 OAuthログイン後、プロフィールが作成されない

**原因**: データベーストリガーが正しく動作していない可能性

**解決方法**:
1. Supabase Dashboard →「Database」→「Functions」でトリガーを確認
2. `001_mvp_schema.sql`のトリガー部分が実行されているか確認
3. 必要に応じて手動でトリガーを再作成

### 5.4 ローカル開発でOAuthが動作しない

**原因**: ローカル環境のリダイレクトURIが設定されていない

**解決方法**:
- 開発環境では、Google/Discordの設定に`http://localhost:3000`のリダイレクトURIを追加
- **注意**: セキュリティ上、本番環境の設定と開発環境の設定は別のOAuthアプリケーションとして分けることを推奨

---

## 6. セキュリティ上の注意点

### 6.1 Client Secretの管理

- Client SecretはSupabase Dashboardに保存され、クライアント側には公開されません
- 環境変数に保存する必要はありません（Supabaseが管理）

### 6.2 HTTPS必須

- 本番環境では必ずHTTPSを使用してください
- HTTPではOAuth認証が正常に動作しません

### 6.3 CORS設定

- Supabaseの設定で、本番ドメインが許可されていることを確認
- 必要に応じて「Authentication」→「URL Configuration」でドメインを追加

---

## 7. 実装の詳細

### 7.1 フロントエンド

- `src/hooks/useAuth.ts`: `signInWithOAuth`関数を実装
- `src/app/(auth)/login/page.tsx`: GoogleボタンとDiscordボタンを追加
- `src/app/(auth)/register/page.tsx`: 同様にOAuthボタンを追加
- `src/app/auth/callback/route.ts`: OAuthコールバック処理（既存のコードで対応）

### 7.2 認証フロー

```
1. ユーザーがOAuthボタンをクリック
   ↓
2. signInWithOAuth(provider)を呼び出し
   ↓
3. Supabase AuthがOAuthプロバイダーにリダイレクト
   ↓
4. ユーザーが認証を許可
   ↓
5. プロバイダーがSupabase callbackにリダイレクト
   ↓
6. Supabaseがアプリの/auth/callbackにリダイレクト
   ↓
7. exchangeCodeForSession()でセッションを確立
   ↓
8. /tournamentsページにリダイレクト
```

---

## 8. 参考リンク

- [Supabase Auth - Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Auth - Discord OAuth](https://supabase.com/docs/guides/auth/social-login/auth-discord)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Discord Developer Portal](https://discord.com/developers/applications)

---

以上でOAuth認証のセットアップは完了です。
