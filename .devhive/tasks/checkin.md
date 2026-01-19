# Issue #8: チェックイン機能

大会当日の参加者チェックイン機能を実装する。

## 実装内容
1. participantsテーブルにchecked_in_atカラム追加（マイグレーション）
2. チェックインボタンの実装（主催者用）
3. チェックイン状態の表示
4. RLSポリシーの設定

## 参考ファイル
- `src/app/(main)/tournaments/[id]/admin/` - 管理画面
- `supabase/migrations/` - マイグレーションファイル
- `src/lib/supabase/` - Supabaseクライアント

## 完了条件
- 主催者がチェックインを記録できる
- チェックイン状態が一覧に表示される
- 適切なRLSポリシーが設定されている
