# タスク: 認証(auth)ページの国際化

## 概要
認証関連ページのテキストを国際化対応する。

## 担当セクション
`messages/ja.json`と`messages/en.json`の`auth`セクション

## 対象ページ
- `/src/app/login/page.tsx` - ログイン
- `/src/app/register/page.tsx` - 新規登録
- `/src/app/auth/callback/route.ts` - コールバック（エラーメッセージ等）

## 対象コンポーネント
- `/src/components/layout/Header.tsx` - ヘッダーの認証関連UI

## 翻訳例
```json
{
  "auth": {
    "login": {
      "title": "ログイン",
      "email": "メールアドレス",
      "password": "パスワード",
      "submit": "ログイン",
      "noAccount": "アカウントをお持ちでないですか？",
      "register": "新規登録"
    },
    "register": {
      "title": "新規登録",
      "displayName": "表示名",
      "email": "メールアドレス",
      "password": "パスワード",
      "submit": "登録する",
      "hasAccount": "既にアカウントをお持ちですか？",
      "login": "ログイン"
    },
    "logout": "ログアウト",
    "error": {
      "invalid": "メールアドレスまたはパスワードが正しくありません",
      "required": "必須項目です"
    }
  }
}
```

## 完了条件
- [ ] 全対象ページのハードコードテキストを翻訳キーに置換
- [ ] ja.jsonとen.jsonの両方に翻訳を追加
- [ ] ビルドが通ること
