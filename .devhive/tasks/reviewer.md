# Senior Engineer: Sprint 2 レビュー

他のワーカーが実装したコードをレビューし、品質を担保する。

## 担当ワーカー
- series-select: 大会作成時にシリーズを選択
- participants: 参加者一覧ページ
- checkin: チェックイン機能
- tournament-detail: 大会詳細ページ改善
- tournament-filter: 大会一覧フィルター
- series-filter: シリーズ一覧フィルター

## ワークフロー
1. `devhive inbox` でレビュー依頼を定期的に確認
2. 依頼があれば `devhive diff <worker>` でコード確認
3. レビュー観点に基づいてチェック
4. 問題があれば `devhive reply <worker> "フィードバック"`
5. OKなら `devhive reply <worker> "LGTM"`

## レビュー観点
1. **型安全性**: any型禁止、適切な型定義
2. **エラーハンドリング**: try-catch、ユーザーフレンドリーなエラー
3. **パフォーマンス**: 不要な再レンダリング、N+1クエリ
4. **セキュリティ**: RLSポリシー、入力バリデーション
5. **コード規約**: 命名規則、ファイル構成

## 完了条件
- 全ワーカーのレビューが完了
- 重大な問題がないことを確認
