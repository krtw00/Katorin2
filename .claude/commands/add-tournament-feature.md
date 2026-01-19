---
argument-hint: [機能名]
description: 大会システムに新機能を追加
---

# 大会機能追加: $ARGUMENTS

## 実装フロー

### 1. 要件確認
- 既存機能との関連性
- 必要なデータ構造
- UI/UX要件

### 2. DB設計（必要な場合）
- 新規テーブルまたはカラム追加
- `supabase/migrations/` にマイグレーション作成
- RLSポリシー設計

### 3. 型定義更新
- `src/types/database.ts` 再生成
- 必要なら `src/types/tournament.ts` に拡張型追加

### 4. バックエンド実装
- Supabaseクエリ
- Server Actions（フォーム処理）
- リアルタイム対応（必要な場合）

### 5. フロントエンド実装
- Server Component（データ取得）
- Client Component（インタラクション）
- UIコンポーネント（shadcn/ui使用）

### 6. テスト・検証
- 動作確認
- エッジケース対応
- 権限チェック

## 関連ディレクトリ

```
src/app/(main)/tournaments/    # ページ
src/components/tournament/     # コンポーネント
src/lib/tournament/           # ユーティリティ
src/hooks/                    # カスタムフック
supabase/migrations/          # マイグレーション
```

## 注意点

- 主催者権限チェック（`organizer_id`）
- 大会ステータスに応じた制御
- リアルタイム更新対応
