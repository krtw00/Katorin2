# リファクタリング設計書

## 目的

Katorin2のリファクタリング計画を定義する。本ドキュメントはコード品質改善のSSoTである。

## 背景

コードベースレビューで指摘された問題点を段階的に改善する。技術負債が蓄積する前に対応が必要。

| 項目 | 値 |
|------|-----|
| 対象期間 | 2-4週間 |
| 優先度 | 高（即座に対応） |
| 影響範囲 | フロントエンド全体 |

## 改善対象

### 1. コンポーネント分割

| ファイル | 現状 | 目標 | 削減率 |
|---------|------|------|--------|
| SeriesForm.tsx | 12,032行 | 500行以下 | 約96% |
| TeamForm.tsx | 5,781行 | 800行以下 | 約86% |
| TournamentForm.tsx | 846行 | 200行以下 | 約76% |

### 2. 型安全性改善

| 項目 | 現状 | 目標 |
|------|------|------|
| any使用箇所 | 19箇所 | 0箇所 |

### 3. エラーハンドリング統一

| 項目 | 現状 | 目標 |
|------|------|------|
| パターン数 | 3種類 | 1種類 |

### 4. パフォーマンス最適化

| 項目 | 現状 | 目標 |
|------|------|------|
| useMemo/useCallback | 4箇所 | 20箇所以上 |

## コンポーネント分割設計

### SeriesForm リファクタリング

#### 新しいディレクトリ構造

| ディレクトリ | 内容 |
|-------------|------|
| SeriesForm.tsx | エントリーポイント（150行） |
| SeriesFormContainer.tsx | ロジック層（300行） |
| SeriesFormUI.tsx | UI層（400行） |
| hooks/ | 状態管理フック（5ファイル） |
| sections/ | UIセクション（5ファイル） |
| components/ | 再利用コンポーネント（6ファイル） |
| utils/ | ユーティリティ（3ファイル） |

#### 責務の分離

| レイヤー | 責務 |
|---------|------|
| エントリーポイント | propsの受け渡しのみ |
| ロジック層 | フォーム状態管理、バリデーション、保存処理 |
| UI層 | セクション配置、ナビゲーション、レイアウト |
| フック | 個別の状態管理ロジック |
| セクション | 個別の入力グループ |

### TeamForm リファクタリング

| ディレクトリ | 内容 |
|-------------|------|
| TeamForm.tsx | エントリーポイント（100行） |
| hooks/ | 状態管理フック（4ファイル） |
| sections/ | UIセクション（3ファイル） |
| components/ | 再利用コンポーネント（4ファイル） |

### TournamentForm リファクタリング

| ディレクトリ | 内容 |
|-------------|------|
| TournamentForm.tsx | エントリーポイント（80行） |
| hooks/ | 状態管理フック（3ファイル） |
| sections/ | UIセクション（5ファイル） |

## 型安全性改善設計

### 型ガード関数

| 関数 | 用途 |
|------|------|
| isCustomFieldArray | CustomField配列の型ガード |
| isTournamentArray | Tournament配列の型ガード |
| isMatchArray | Match配列の型ガード |

### Supabaseレスポンス型

| 型 | 用途 |
|-----|------|
| SupabaseResponse\<T\> | 単一レスポンス |
| SupabaseArrayResponse\<T\> | 配列レスポンス |

### 修正対象箇所

| ファイル | 修正内容 |
|---------|---------|
| TournamentForm.tsx | as CustomField[] → parseCustomFields() |
| RealtimeBracket.tsx | as any → SupabaseResponse\<Match\> |
| useRealtimeMatches.ts | as any → 型ガード関数使用 |
| my/page.tsx | : any → : Participation |

## エラーハンドリング統一設計

### エラーコード定義

| カテゴリ | コード |
|---------|--------|
| 認証エラー | UNAUTHORIZED, FORBIDDEN |
| バリデーション | VALIDATION_ERROR, INVALID_INPUT |
| データベース | DATABASE_ERROR, NOT_FOUND, DUPLICATE_ENTRY |
| ビジネスロジック | TOURNAMENT_FULL, BRACKET_ALREADY_GENERATED, INSUFFICIENT_PARTICIPANTS |
| システム | NETWORK_ERROR, UNKNOWN_ERROR |

### エラー変換

| 元エラー | 変換先 |
|---------|--------|
| PostgrestError (23505) | DUPLICATE_ENTRY |
| PostgrestError (23503) | NOT_FOUND |
| その他のPostgrestError | DATABASE_ERROR |
| 未知のエラー | UNKNOWN_ERROR |

## パフォーマンス最適化設計

### useMemo適用対象

| コンポーネント | 対象 | 理由 |
|---------------|------|------|
| RealtimeBracket | matchesByRound | matchesが変更された時のみ再計算 |
| RealtimeBracket | matchPositions, svgSize | 位置計算は高コスト |
| RealtimeBracket | connectorPaths | SVGコネクタパス |
| TournamentForm | sections | セクション定義は変更不要 |
| TournamentForm | errors | バリデーションエラー |

### useCallback適用対象

| コンポーネント | 対象 | 理由 |
|---------------|------|------|
| RealtimeBracket | handlePositionChange | 位置変更は再作成不要 |
| RealtimeBracket | handleScoreUpdate | スコア更新 |
| TournamentForm | addCustomField | カスタムフィールド追加 |
| TournamentForm | removeCustomField | カスタムフィールド削除 |

### React.memo適用対象

| コンポーネント | 理由 |
|---------------|------|
| OverviewSection | propsが変更されない限り再レンダリング不要 |
| ParticipantsSection | 同上 |
| TournamentSettingsSection | 同上 |

## 実装スケジュール

### Week 1: 基盤整備

| 日 | タスク |
|-----|--------|
| 1-2 | エラーハンドリング統一（TournamentError, handleError, Error Boundary） |
| 3-5 | 型安全性改善第1フェーズ（型ガード、SupabaseResponse、主要any排除） |

### Week 2: TournamentForm リファクタリング

| 日 | タスク |
|-----|--------|
| 1-2 | ディレクトリ構造作成、フック実装 |
| 3-4 | セクション分割 |
| 5 | 統合とテスト |

### Week 3: TeamForm リファクタリング

| 日 | タスク |
|-----|--------|
| 1-2 | フック作成 |
| 3-4 | セクション分割 |
| 5 | 統合とテスト |

### Week 4: SeriesForm リファクタリング（第1フェーズ）

| 日 | タスク |
|-----|--------|
| 1-3 | フック作成 |
| 4-5 | 重要セクション分割（BasicInfo, PointSystem） |

### Week 5以降: 継続的改善

| タスク | 内容 |
|--------|------|
| パフォーマンス最適化 | useMemo/useCallback追加、React.memo適用 |
| 型安全性改善第2フェーズ | 残りのany排除 |
| SeriesForm継続 | 残りのセクション分割 |

## 成功指標

### 定量指標

| 指標 | 現状 | 目標 |
|------|------|------|
| 最大ファイル行数 | 12,032行 | 500行以下 |
| any使用箇所 | 19箇所 | 0箇所 |
| エラーハンドリングパターン | 3種類 | 1種類 |
| useMemo/useCallback | 4箇所 | 20箇所以上 |

### 定性指標

| 指標 | 確認方法 |
|------|---------|
| 新規開発者が責務を理解できる | オンボーディング時間 |
| テストコードが書きやすい | テストカバレッジ |
| バグ修正時の影響範囲が明確 | コードレビュー |
| パフォーマンス問題が解消 | Lighthouse |

## リスクと対策

| リスク | 対策 |
|--------|------|
| 既存機能の破壊 | 段階的リファクタリング、各フェーズでの動作確認 |
| 開発速度の低下 | 新機能開発は一時停止、リファクタリング専用ブランチ |
| チーム開発での競合 | 1ファイルずつ順次リファクタリング、小さなPR |

## 関連ドキュメント

- @02-architecture/directory-structure.md - ディレクトリ構造
- @01-introduction/tech-stack.md - 技術スタック
- @appendix/glossary.md - 用語集
