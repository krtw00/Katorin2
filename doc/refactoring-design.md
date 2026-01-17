# Katorin2 リファクタリング設計書

## 概要

コードベース批評レビューで指摘された問題点を段階的に改善するための設計書です。

**対象期間**: 2-4週間
**優先度**: 高（即座に対応）
**影響範囲**: フロントエンド全体

---

## 目次

1. [コンポーネント分割設計](#1-コンポーネント分割設計)
2. [型安全性改善設計](#2-型安全性改善設計)
3. [エラーハンドリング統一設計](#3-エラーハンドリング統一設計)
4. [パフォーマンス最適化設計](#4-パフォーマンス最適化設計)
5. [実装順序とマイルストーン](#5-実装順序とマイルストーン)

---

## 1. コンポーネント分割設計

### 1.1 SeriesForm.tsx のリファクタリング（最優先）

**現状**: 12,032行の巨大なモノリシックコンポーネント

**目標**: 10個以下のファイルに分割（各ファイル1,000行以下）

#### 1.1.1 新しいディレクトリ構造

```
src/components/series/
├── SeriesForm.tsx                          # エントリーポイント (150行)
├── SeriesFormContainer.tsx                 # ロジック層 (300行)
├── SeriesFormUI.tsx                        # UI層 (400行)
│
├── hooks/
│   ├── useSeriesForm.ts                    # フォーム状態管理 (200行)
│   ├── useSeriesValidation.ts              # バリデーション (150行)
│   ├── useSeriesPoints.ts                  # ポイント計算ロジック (200行)
│   ├── useSeriesTournaments.ts             # 大会管理 (150行)
│   └── useSeriesSubmit.ts                  # 保存処理 (100行)
│
├── sections/
│   ├── BasicInfoSection.tsx                # 基本情報セクション (250行)
│   ├── PointSystemSection.tsx              # ポイントシステム設定 (400行)
│   ├── TournamentSelectionSection.tsx      # 大会選択 (350行)
│   ├── ScheduleSection.tsx                 # 日程設定 (200行)
│   └── PreviewSection.tsx                  # プレビュー (200行)
│
├── components/
│   ├── PointRuleEditor.tsx                 # ポイントルール編集 (200行)
│   ├── RankingPointConfig.tsx              # 順位ポイント設定 (150行)
│   ├── WinsPointConfig.tsx                 # 勝利数ポイント設定 (150行)
│   ├── TournamentList.tsx                  # 大会リスト (200行)
│   ├── TournamentSearchDialog.tsx          # 大会検索ダイアログ (250行)
│   └── SeriesFormNavigation.tsx            # セクションナビゲーション (100行)
│
└── utils/
    ├── seriesValidation.ts                 # バリデーションルール (100行)
    ├── pointCalculation.ts                 # ポイント計算ユーティリティ (150行)
    └── seriesFormHelpers.ts                # ヘルパー関数 (100行)
```

**合計**: 約4,450行（元の12,032行から約63%削減 + 再利用性向上）

#### 1.1.2 責務の分離

##### SeriesForm.tsx（エントリーポイント）
```typescript
'use client'

import { SeriesFormContainer } from './SeriesFormContainer'
import { Series } from '@/types/series'

type SeriesFormProps = {
  mode: 'create' | 'edit'
  initialData?: Series
  onSuccess?: (series: Series) => void
}

/**
 * シリーズフォームのエントリーポイント
 * 実際のロジックは SeriesFormContainer に委譲
 */
export function SeriesForm(props: SeriesFormProps) {
  return <SeriesFormContainer {...props} />
}
```

##### SeriesFormContainer.tsx（ロジック層）
```typescript
'use client'

import { useSeriesForm } from './hooks/useSeriesForm'
import { useSeriesValidation } from './hooks/useSeriesValidation'
import { useSeriesSubmit } from './hooks/useSeriesSubmit'
import { SeriesFormUI } from './SeriesFormUI'

/**
 * シリーズフォームのロジック層
 * - フォーム状態管理
 * - バリデーション
 * - 保存処理
 */
export function SeriesFormContainer({ mode, initialData, onSuccess }: SeriesFormProps) {
  const {
    formData,
    updateFormData,
    selectedTournaments,
    addTournament,
    removeTournament,
    pointSystem,
    updatePointSystem,
  } = useSeriesForm(initialData)

  const { errors, validate } = useSeriesValidation()

  const { submit, loading, error } = useSeriesSubmit({
    mode,
    onSuccess,
  })

  const handleSubmit = async () => {
    const validationErrors = validate(formData)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    await submit(formData, selectedTournaments, pointSystem)
  }

  return (
    <SeriesFormUI
      formData={formData}
      updateFormData={updateFormData}
      selectedTournaments={selectedTournaments}
      addTournament={addTournament}
      removeTournament={removeTournament}
      pointSystem={pointSystem}
      updatePointSystem={updatePointSystem}
      errors={errors}
      loading={loading}
      error={error}
      onSubmit={handleSubmit}
    />
  )
}
```

##### SeriesFormUI.tsx（プレゼンテーション層）
```typescript
'use client'

import { BasicInfoSection } from './sections/BasicInfoSection'
import { PointSystemSection } from './sections/PointSystemSection'
import { TournamentSelectionSection } from './sections/TournamentSelectionSection'
import { PreviewSection } from './sections/PreviewSection'
import { SeriesFormNavigation } from './components/SeriesFormNavigation'

/**
 * シリーズフォームのUI層
 * - セクションの配置
 * - ナビゲーション
 * - レイアウト
 */
export function SeriesFormUI({
  formData,
  updateFormData,
  selectedTournaments,
  addTournament,
  removeTournament,
  pointSystem,
  updatePointSystem,
  errors,
  loading,
  error,
  onSubmit,
}: SeriesFormUIProps) {
  const [activeSection, setActiveSection] = useState('basic')

  return (
    <div className="space-y-6">
      <SeriesFormNavigation
        activeSection={activeSection}
        onChange={setActiveSection}
      />

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {activeSection === 'basic' && (
          <BasicInfoSection
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        )}

        {activeSection === 'points' && (
          <PointSystemSection
            pointSystem={pointSystem}
            updatePointSystem={updatePointSystem}
            errors={errors}
          />
        )}

        {activeSection === 'tournaments' && (
          <TournamentSelectionSection
            selectedTournaments={selectedTournaments}
            addTournament={addTournament}
            removeTournament={removeTournament}
            errors={errors}
          />
        )}

        {activeSection === 'preview' && (
          <PreviewSection
            formData={formData}
            selectedTournaments={selectedTournaments}
            pointSystem={pointSystem}
          />
        )}

        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" type="button">
            キャンセル
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  )
}
```

##### hooks/useSeriesForm.ts（状態管理）
```typescript
'use client'

import { useState } from 'react'
import { Series, PointSystem } from '@/types/series'
import { Tournament } from '@/types/tournament'

/**
 * シリーズフォームの状態管理フック
 */
export function useSeriesForm(initialData?: Series) {
  const [formData, setFormData] = useState(() => ({
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || 'draft',
    visibility: initialData?.visibility || 'public',
    // ... その他のフィールド
  }))

  const [selectedTournaments, setSelectedTournaments] = useState<Tournament[]>(
    initialData?.tournaments || []
  )

  const [pointSystem, setPointSystem] = useState<PointSystem>(
    initialData?.point_system || {
      type: 'ranking',
      config: {},
    }
  )

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addTournament = (tournament: Tournament) => {
    setSelectedTournaments((prev) => [...prev, tournament])
  }

  const removeTournament = (tournamentId: string) => {
    setSelectedTournaments((prev) =>
      prev.filter((t) => t.id !== tournamentId)
    )
  }

  const updatePointSystem = (updates: Partial<PointSystem>) => {
    setPointSystem((prev) => ({ ...prev, ...updates }))
  }

  return {
    formData,
    updateFormData,
    selectedTournaments,
    addTournament,
    removeTournament,
    pointSystem,
    updatePointSystem,
  }
}
```

---

### 1.2 TeamForm.tsx のリファクタリング

**現状**: 5,781行

**目標**: 8個のファイルに分割（各ファイル800行以下）

#### 1.2.1 新しいディレクトリ構造

```
src/components/team/
├── TeamForm.tsx                            # エントリーポイント (100行)
├── TeamFormContainer.tsx                   # ロジック層 (250行)
├── TeamFormUI.tsx                          # UI層 (300行)
│
├── hooks/
│   ├── useTeamForm.ts                      # フォーム状態管理 (150行)
│   ├── useTeamMembers.ts                   # メンバー管理 (200行)
│   ├── useTeamInvites.ts                   # 招待管理 (200行)
│   └── useTeamSubmit.ts                    # 保存処理 (100行)
│
├── sections/
│   ├── BasicInfoSection.tsx                # 基本情報 (200行)
│   ├── MembersSection.tsx                  # メンバー管理 (350行)
│   └── InvitesSection.tsx                  # 招待管理 (300行)
│
└── components/
    ├── TeamMemberList.tsx                  # メンバーリスト (250行)
    ├── TeamInviteGenerator.tsx             # 招待リンク生成 (200行)
    ├── TeamRoleSelector.tsx                # ロール選択 (150行)
    └── TeamAvatarUploader.tsx              # アバター画像 (150行)
```

**合計**: 約2,900行（元の5,781行から約50%削減）

---

### 1.3 TournamentForm.tsx のリファクタリング

**現状**: 846行

**目標**: 6個のファイルに分割（各ファイル200行以下）

#### 1.3.1 新しいディレクトリ構造

```
src/components/tournament/
├── TournamentForm.tsx                      # エントリーポイント (80行)
├── TournamentFormContainer.tsx             # ロジック層 (200行)
├── TournamentFormUI.tsx                    # UI層 (250行)
│
├── hooks/
│   ├── useTournamentForm.ts                # フォーム状態管理 (150行)
│   ├── useCustomFields.ts                  # カスタムフィールド (150行)
│   └── useCoverImage.ts                    # カバー画像処理 (100行)
│
└── sections/
    ├── OverviewSection.tsx                 # 概要セクション (200行)
    ├── ParticipantsSection.tsx             # 参加者設定 (200行)
    ├── TournamentSettingsSection.tsx       # トーナメント設定 (200行)
    ├── ScheduleSection.tsx                 # 日程設定 (150行)
    └── CustomFieldsEditor.tsx              # カスタムフィールド編集 (250行)
```

**合計**: 約1,930行（元の846行から構造化により増加するが、再利用性向上）

---

## 2. 型安全性改善設計

### 2.1 `any` 型の排除

**対象箇所**: 19箇所

#### 2.1.1 型ガード関数の作成

```typescript
// src/lib/types/guards.ts

import { CustomField, Tournament, Series } from '@/types'

/**
 * CustomField配列の型ガード
 */
export function isCustomFieldArray(data: unknown): data is CustomField[] {
  if (!Array.isArray(data)) return false

  return data.every(field =>
    typeof field.key === 'string' &&
    typeof field.label === 'string' &&
    ['text', 'textarea', 'select', 'checkbox'].includes(field.inputType) &&
    typeof field.required === 'boolean'
  )
}

/**
 * Tournament配列の型ガード
 */
export function isTournamentArray(data: unknown): data is Tournament[] {
  if (!Array.isArray(data)) return false

  return data.every(item =>
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    ['draft', 'published', 'recruiting', 'in_progress', 'completed'].includes(item.status)
  )
}
```

#### 2.1.2 Supabaseレスポンスの型定義

```typescript
// src/lib/supabase/types.ts

import { PostgrestError } from '@supabase/supabase-js'

/**
 * Supabaseレスポンスの統一型
 */
export interface SupabaseResponse<T> {
  data: T | null
  error: PostgrestError | null
}

/**
 * Supabase配列レスポンスの統一型
 */
export interface SupabaseArrayResponse<T> {
  data: T[] | null
  error: PostgrestError | null
}

/**
 * 型安全なSupabase single()
 */
export async function safeSupabaseSingle<T>(
  query: Promise<{ data: any; error: any }>
): Promise<SupabaseResponse<T>> {
  const { data, error } = await query
  return { data: data as T | null, error }
}
```

#### 2.1.3 修正対象箇所一覧

| ファイル | 行 | 現在 | 修正後 |
|---------|---|------|--------|
| TournamentForm.tsx | 35 | `as CustomField[]` | `parseCustomFields()` |
| RealtimeBracket.tsx | 156 | `as any` | `SupabaseResponse<Match>` |
| useRealtimeMatches.ts | 78 | `as any` | 型ガード関数使用 |
| my/page.tsx | 45 | `: any` | `: Participation` |
| tournaments/[id]/page.tsx | 67 | `.map((p: any)` | `.map((p: Participation)` |

---

## 3. エラーハンドリング統一設計

### 3.1 エラークラスの定義

```typescript
// src/lib/errors/TournamentError.ts

export enum ErrorCode {
  // 認証エラー
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // バリデーションエラー
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // データベースエラー
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // ビジネスロジックエラー
  TOURNAMENT_FULL = 'TOURNAMENT_FULL',
  BRACKET_ALREADY_GENERATED = 'BRACKET_ALREADY_GENERATED',
  INSUFFICIENT_PARTICIPANTS = 'INSUFFICIENT_PARTICIPANTS',

  // システムエラー
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class TournamentError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'TournamentError'
  }
}

/**
 * エラーメッセージの国際化
 */
export const errorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: 'ログインが必要です',
  [ErrorCode.FORBIDDEN]: '権限がありません',
  [ErrorCode.VALIDATION_ERROR]: '入力内容に誤りがあります',
  [ErrorCode.INVALID_INPUT]: '無効な入力です',
  [ErrorCode.DATABASE_ERROR]: 'データベースエラーが発生しました',
  [ErrorCode.NOT_FOUND]: 'データが見つかりません',
  [ErrorCode.DUPLICATE_ENTRY]: 'すでに登録されています',
  [ErrorCode.TOURNAMENT_FULL]: '大会の定員に達しています',
  [ErrorCode.BRACKET_ALREADY_GENERATED]: 'ブラケットは既に生成されています',
  [ErrorCode.INSUFFICIENT_PARTICIPANTS]: '参加者が不足しています',
  [ErrorCode.NETWORK_ERROR]: 'ネットワークエラーが発生しました',
  [ErrorCode.UNKNOWN_ERROR]: '予期しないエラーが発生しました',
}
```

### 3.2 エラーバウンダリーの実装

```typescript
// src/app/(main)/error.tsx

'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { TournamentError, ErrorCode, errorMessages } from '@/lib/errors/TournamentError'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // エラーログを送信（本番環境）
    if (process.env.NODE_ENV === 'production') {
      console.error('Error boundary caught:', error)
      // TODO: Sentry等のエラー追跡サービスに送信
    }
  }, [error])

  const errorMessage = error instanceof TournamentError
    ? errorMessages[error.code]
    : 'エラーが発生しました'

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">エラー</h2>
        <p className="text-muted-foreground mb-6">{errorMessage}</p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              詳細情報（開発モードのみ）
            </summary>
            <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex gap-4">
          <Button onClick={reset}>再試行</Button>
          <Button variant="outline" onClick={() => window.location.href = '/tournaments'}>
            トップページに戻る
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 3.3 統一されたエラーハンドリングパターン

```typescript
// src/lib/errors/handleError.ts

import { TournamentError, ErrorCode } from './TournamentError'
import { PostgrestError } from '@supabase/supabase-js'

/**
 * Supabaseエラーを TournamentError に変換
 */
export function handleSupabaseError(error: PostgrestError): TournamentError {
  // エラーコードに基づいて適切な TournamentError を返す
  if (error.code === '23505') {
    // Unique constraint violation
    return new TournamentError(
      ErrorCode.DUPLICATE_ENTRY,
      'すでに登録されています',
      error
    )
  }

  if (error.code === '23503') {
    // Foreign key constraint violation
    return new TournamentError(
      ErrorCode.NOT_FOUND,
      '関連するデータが見つかりません',
      error
    )
  }

  return new TournamentError(
    ErrorCode.DATABASE_ERROR,
    'データベースエラーが発生しました',
    error
  )
}

/**
 * 汎用エラーハンドリング
 */
export function handleError(error: unknown): TournamentError {
  if (error instanceof TournamentError) {
    return error
  }

  if (error && typeof error === 'object' && 'code' in error) {
    // Supabase error
    return handleSupabaseError(error as PostgrestError)
  }

  return new TournamentError(
    ErrorCode.UNKNOWN_ERROR,
    '予期しないエラーが発生しました',
    error
  )
}
```

---

## 4. パフォーマンス最適化設計

### 4.1 useMemo / useCallback の追加

#### 4.1.1 RealtimeBracket.tsx

```typescript
// src/components/tournament/RealtimeBracket.tsx

export function RealtimeBracket({ tournamentId, initialMatches, isOrganizer }: Props) {
  const matches = useRealtimeMatches(tournamentId, initialMatches)

  // メモ化: matchesが変更された時のみ再計算
  const matchesByRound = useMemo(() => {
    const map = new Map<number, MatchWithPlayers[]>()
    matches.forEach((match) => {
      const round = match.round
      if (!map.has(round)) {
        map.set(round, [])
      }
      map.get(round)!.push(match)
    })
    // ラウンド内でmatch_numberでソート
    map.forEach((roundMatches) => {
      roundMatches.sort((a, b) => a.match_number - b.match_number)
    })
    return map
  }, [matches])

  // メモ化: 位置計算は高コスト
  const { matchPositions, svgSize } = useMemo(() => {
    return calculateBracketLayout(matchesByRound)
  }, [matchesByRound])

  // メモ化: SVGコネクタパス
  const connectorPaths = useMemo(() => {
    return generateConnectorPaths(matches, matchPositions)
  }, [matches, matchPositions])

  // コールバック: 位置変更は再作成不要
  const handlePositionChange = useCallback((id: string, rect: DOMRect) => {
    setMatchPositions((prev) => ({ ...prev, [id]: rect }))
  }, [])

  // コールバック: スコア更新
  const handleScoreUpdate = useCallback(async (
    matchId: string,
    scores: { p1: number; p2: number }
  ) => {
    try {
      await updateMatchScore(matchId, scores)
    } catch (error) {
      throw handleError(error)
    }
  }, [])

  // ...
}
```

#### 4.1.2 TournamentForm.tsx

```typescript
// src/components/tournament/TournamentFormContainer.tsx

export function TournamentFormContainer({ mode, initialData, onSuccess }: Props) {
  const { formData, updateFormData, customFields, setCustomFields } = useTournamentForm(initialData)

  // メモ化: セクション定義は変更不要
  const sections = useMemo(() => [
    { id: 'overview', label: '概要', icon: '📋' },
    { id: 'participants', label: '参加者設定', icon: '👥' },
    { id: 'tournament', label: 'トーナメント設定', icon: '🏆' },
    { id: 'schedule', label: '日程', icon: '📅' },
  ], [])

  // メモ化: バリデーションエラー
  const errors = useMemo(() => {
    return validateTournamentForm(formData, customFields)
  }, [formData, customFields])

  // コールバック: カスタムフィールド追加
  const addCustomField = useCallback(() => {
    setCustomFields((prev) => [
      ...prev,
      {
        key: `field_${Date.now()}`,
        label: '',
        inputType: 'text',
        required: false,
        hidden: false,
        editDeadline: 'bracket_published',
        placeholder: '',
        options: [],
      },
    ])
  }, [])

  // コールバック: カスタムフィールド削除
  const removeCustomField = useCallback((index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // ...
}
```

### 4.2 React.memo の活用

```typescript
// src/components/tournament/sections/OverviewSection.tsx

import { memo } from 'react'

type OverviewSectionProps = {
  formData: TournamentFormData
  updateFormData: (field: string, value: any) => void
  errors: Record<string, string>
}

/**
 * 概要セクション
 * propsが変更されない限り再レンダリングしない
 */
export const OverviewSection = memo(function OverviewSection({
  formData,
  updateFormData,
  errors,
}: OverviewSectionProps) {
  return (
    <div className="space-y-4">
      {/* ... */}
    </div>
  )
})
```

---

## 5. 実装順序とマイルストーン

### Week 1: 基盤整備

#### Day 1-2: エラーハンドリング統一
- [ ] TournamentError クラス作成
- [ ] handleError 関数作成
- [ ] Error Boundary 実装（app/(main)/error.tsx）
- [ ] 既存コードの最小限の修正（主要エラーのみ）

#### Day 3-5: 型安全性改善（第1フェーズ）
- [ ] 型ガード関数作成（guards.ts）
- [ ] SupabaseResponse 型定義
- [ ] TournamentForm.tsx の `any` 排除
- [ ] useRealtimeMatches.ts の `any` 排除

---

### Week 2: TournamentForm リファクタリング

#### Day 1-2: ディレクトリ構造作成
- [ ] hooks/ ディレクトリ作成
- [ ] sections/ ディレクトリ作成
- [ ] useTournamentForm.ts 実装
- [ ] useCustomFields.ts 実装
- [ ] useCoverImage.ts 実装

#### Day 3-4: セクション分割
- [ ] OverviewSection.tsx 実装
- [ ] ParticipantsSection.tsx 実装
- [ ] TournamentSettingsSection.tsx 実装
- [ ] ScheduleSection.tsx 実装
- [ ] CustomFieldsEditor.tsx 実装

#### Day 5: 統合とテスト
- [ ] TournamentFormContainer.tsx 実装
- [ ] TournamentFormUI.tsx 実装
- [ ] TournamentForm.tsx をエントリーポイントに変更
- [ ] 動作確認・バグ修正

---

### Week 3: TeamForm リファクタリング

#### Day 1-2: フック作成
- [ ] useTeamForm.ts 実装
- [ ] useTeamMembers.ts 実装
- [ ] useTeamInvites.ts 実装
- [ ] useTeamSubmit.ts 実装

#### Day 3-4: セクション分割
- [ ] BasicInfoSection.tsx 実装
- [ ] MembersSection.tsx 実装
- [ ] InvitesSection.tsx 実装
- [ ] TeamMemberList.tsx 実装
- [ ] TeamInviteGenerator.tsx 実装

#### Day 5: 統合とテスト
- [ ] TeamFormContainer.tsx 実装
- [ ] TeamFormUI.tsx 実装
- [ ] 動作確認・バグ修正

---

### Week 4: SeriesForm リファクタリング（第1フェーズ）

#### Day 1-3: フック作成
- [ ] useSeriesForm.ts 実装
- [ ] useSeriesValidation.ts 実装
- [ ] useSeriesPoints.ts 実装
- [ ] useSeriesTournaments.ts 実装
- [ ] useSeriesSubmit.ts 実装

#### Day 4-5: 重要セクション分割
- [ ] BasicInfoSection.tsx 実装
- [ ] PointSystemSection.tsx 実装（最優先）
- [ ] SeriesFormContainer.tsx 実装
- [ ] 動作確認

**注**: SeriesFormは12,000行と膨大なため、Week 4では最重要部分のみを分割し、残りは継続的に改善

---

### Week 5以降: 継続的改善

#### パフォーマンス最適化
- [ ] RealtimeBracket.tsx に useMemo/useCallback 追加
- [ ] TournamentForm に React.memo 適用
- [ ] SeriesForm の残りのセクション分割

#### 型安全性改善（第2フェーズ）
- [ ] 残りの `any` 排除（my/page.tsx など）
- [ ] 全ファイルの型チェック厳格化

---

## 6. 成功指標

### 定量指標

| 指標 | 現状 | 目標 | 測定方法 |
|------|------|------|---------|
| 最大ファイル行数 | 12,032行 | 500行以下 | wc -l |
| `any` 使用箇所 | 19箇所 | 0箇所 | grep -r "as any" |
| エラーハンドリングパターン | 3種類 | 1種類 | コードレビュー |
| useMemo/useCallback 使用 | 4箇所 | 20箇所以上 | grep -r "useMemo\\|useCallback" |

### 定性指標

- [ ] 新規開発者が各コンポーネントの責務を理解できる
- [ ] テストコードが書きやすい構造になっている
- [ ] バグ修正時に影響範囲が明確
- [ ] パフォーマンス問題が解消されている

---

## 7. リスクと対策

### リスク1: 既存機能の破壊

**対策**:
- 段階的なリファクタリング（1週間に1コンポーネント）
- 各フェーズでの動作確認
- リファクタリング前にスクリーンショットで動作記録

### リスク2: 開発速度の低下

**対策**:
- 新機能開発は一時停止
- リファクタリング専用のブランチで作業
- 毎週金曜日に進捗レビュー

### リスク3: チーム開発での競合

**対策**:
- 1ファイルずつ順次リファクタリング
- PRは小さく保つ（1コンポーネント = 1PR）
- マージ前に必ず動作確認

---

## 8. 次のアクション

### 即座に実施
1. この設計書をレビュー・承認
2. Week 1 Day 1-2 のタスク開始（エラーハンドリング統一）
3. リファクタリング用ブランチ作成

### 承認後
4. TournamentError クラス実装
5. Error Boundary 実装
6. 型ガード関数作成

---

## まとめ

この設計書に基づいてリファクタリングを実施することで:

✅ **保守性**: 12,000行 → 500行以下のファイルに分割
✅ **型安全性**: `any` を完全に排除
✅ **エラーハンドリング**: 統一されたパターン
✅ **パフォーマンス**: useMemo/useCallbackで最適化
✅ **開発効率**: 新規開発者のオンボーディング時間短縮

**推定工数**: 4週間（1人フルタイム換算）
**優先度**: 高（技術負債が蓄積する前に対応必須）

---

## 質問・確認事項

1. **Week 1-4の実装順序は妥当でしょうか？**
2. **SeriesForm（12,000行）は4週間以上かかる可能性がありますが、優先度を調整しますか？**
3. **エラーハンドリングのErrorCode定義は十分でしょうか？**
4. **パフォーマンス最適化の対象コンポーネントは適切でしょうか？**

この設計で問題なければ、Week 1 から実装を開始します。
