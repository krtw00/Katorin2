# タスク: チーム(team)ページの国際化

## 概要
チーム関連ページのテキストを国際化対応する。

## 担当セクション
`messages/ja.json`と`messages/en.json`の`team`セクション

## 対象ページ
- `/src/app/teams/page.tsx` - チーム一覧
- `/src/app/teams/new/page.tsx` - チーム作成
- `/src/app/teams/[id]/page.tsx` - チーム詳細
- `/src/app/teams/[id]/edit/page.tsx` - チーム編集
- `/src/app/teams/[id]/members/page.tsx` - メンバー管理
- `/src/app/teams/invite/[token]/page.tsx` - 招待受諾

## 翻訳例
```json
{
  "team": {
    "list": {
      "title": "チーム一覧",
      "empty": "チームがありません"
    },
    "detail": {
      "title": "チーム詳細",
      "description": "説明",
      "members": "メンバー"
    },
    "create": {
      "title": "チームを作成",
      "name": "チーム名",
      "submit": "作成する"
    },
    "members": {
      "title": "メンバー管理",
      "invite": "招待する",
      "remove": "削除",
      "role": {
        "owner": "オーナー",
        "admin": "管理者",
        "member": "メンバー"
      }
    },
    "invite": {
      "title": "チームへの招待",
      "accept": "参加する",
      "expired": "この招待リンクは無効です"
    }
  }
}
```

## 完了条件
- [ ] 全対象ページのハードコードテキストを翻訳キーに置換
- [ ] ja.jsonとen.jsonの両方に翻訳を追加
- [ ] ビルドが通ること
