# Issue #5: 大会作成時にシリーズを選択できるようにする

大会作成フォームでシリーズを選択し、大会をシリーズに紐付けられるようにする。

## 実装内容
1. 大会作成フォームにシリーズ選択ドロップダウンを追加
2. series_tournamentsテーブルへの登録処理
3. 大会詳細ページでシリーズ情報を表示

## 参考ファイル
- `src/app/(main)/tournaments/new/page.tsx` - 大会作成ページ
- `src/components/tournament/tournament-form.tsx` - フォームコンポーネント
- `src/app/(main)/series/` - シリーズ関連

## 完了条件
- 大会作成時にシリーズを選択できる
- 選択したシリーズに大会が紐付けられる
