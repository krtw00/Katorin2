# Issue #7: 参加者一覧ページ

大会の参加者一覧を独立したページとして作成する。

## 実装内容
1. `/tournaments/[id]/participants` ページの作成
2. 参加者一覧テーブル（名前、登録日時、チェックイン状態）
3. 大会詳細ページからのリンク追加

## 参考ファイル
- `src/app/(main)/tournaments/[id]/page.tsx` - 大会詳細ページ
- `src/components/tournament/` - 大会関連コンポーネント
- `src/types/database.ts` - 型定義

## 完了条件
- 参加者一覧ページが表示される
- 大会詳細からリンクでアクセスできる
- レスポンシブ対応されている
