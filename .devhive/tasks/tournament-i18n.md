# タスク: 大会(tournament)ページの国際化

## 概要
大会関連ページのテキストを国際化対応する。

## 担当セクション
`messages/ja.json`と`messages/en.json`の`tournament`セクション

## 対象ページ
- `/src/app/tournaments/page.tsx` - 大会一覧
- `/src/app/tournaments/new/page.tsx` - 大会作成
- `/src/app/tournaments/[id]/page.tsx` - 大会詳細
- `/src/app/tournaments/[id]/edit/page.tsx` - 大会編集
- `/src/app/tournaments/[id]/entry/page.tsx` - エントリー
- `/src/app/tournaments/[id]/bracket/page.tsx` - トーナメント表
- `/src/app/tournaments/[id]/participants/page.tsx` - 参加者一覧
- `/src/app/tournaments/[id]/ranking/page.tsx` - ランキング
- `/src/app/tournaments/[id]/manage/page.tsx` - 管理

## 翻訳例
```json
{
  "tournament": {
    "list": {
      "title": "大会一覧",
      "empty": "大会がありません"
    },
    "detail": {
      "title": "大会詳細",
      "description": "説明",
      "format": "形式",
      "status": "ステータス"
    },
    "create": {
      "title": "大会を作成",
      "submit": "作成する"
    },
    "entry": {
      "title": "エントリー",
      "submit": "エントリーする"
    },
    "bracket": {
      "title": "トーナメント表"
    },
    "status": {
      "upcoming": "開催前",
      "ongoing": "開催中",
      "completed": "終了"
    }
  }
}
```

## 完了条件
- [ ] 全対象ページのハードコードテキストを翻訳キーに置換
- [ ] ja.jsonとen.jsonの両方に翻訳を追加
- [ ] ビルドが通ること
