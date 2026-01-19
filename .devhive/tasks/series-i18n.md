# タスク: シリーズ(series)ページの国際化

## 概要
シリーズ関連ページのテキストを国際化対応する。

## 担当セクション
`messages/ja.json`と`messages/en.json`の`series`セクション

## 対象ページ
- `/src/app/series/page.tsx` - シリーズ一覧
- `/src/app/series/new/page.tsx` - シリーズ作成
- `/src/app/series/[id]/page.tsx` - シリーズ詳細
- `/src/app/series/[id]/edit/page.tsx` - シリーズ編集
- `/src/app/series/[id]/ranking/page.tsx` - ランキング

## 翻訳例
```json
{
  "series": {
    "list": {
      "title": "シリーズ一覧",
      "empty": "シリーズがありません"
    },
    "detail": {
      "title": "シリーズ詳細",
      "description": "説明",
      "tournaments": "大会一覧"
    },
    "create": {
      "title": "シリーズを作成",
      "submit": "作成する"
    },
    "ranking": {
      "title": "ランキング",
      "rank": "順位",
      "player": "プレイヤー",
      "points": "ポイント"
    }
  }
}
```

## 完了条件
- [ ] 全対象ページのハードコードテキストを翻訳キーに置換
- [ ] ja.jsonとen.jsonの両方に翻訳を追加
- [ ] ビルドが通ること
