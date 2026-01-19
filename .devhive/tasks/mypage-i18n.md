# タスク: マイページ(mypage)の国際化

## 概要
マイページ関連ページのテキストを国際化対応する。

## 担当セクション
`messages/ja.json`と`messages/en.json`の`mypage`セクション

## 対象ページ
- `/src/app/my/page.tsx` - マイページトップ
- `/src/app/my/edit/page.tsx` - プロフィール編集
- `/src/app/my/hosted/page.tsx` - 主催大会一覧
- `/src/app/my/joined/page.tsx` - 参加大会一覧

## 翻訳例
```json
{
  "mypage": {
    "title": "マイページ",
    "profile": {
      "title": "プロフィール",
      "edit": "編集",
      "displayName": "表示名",
      "email": "メールアドレス"
    },
    "hosted": {
      "title": "主催大会",
      "empty": "主催している大会はありません"
    },
    "joined": {
      "title": "参加大会",
      "empty": "参加している大会はありません"
    },
    "edit": {
      "title": "プロフィール編集",
      "submit": "保存",
      "success": "保存しました"
    }
  }
}
```

## 完了条件
- [ ] 全対象ページのハードコードテキストを翻訳キーに置換
- [ ] ja.jsonとen.jsonの両方に翻訳を追加
- [ ] ビルドが通ること
