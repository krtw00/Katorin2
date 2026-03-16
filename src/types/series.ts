import { Database } from './database'
import { Profile, Tournament } from './tournament'

// DB型（database.tsから自動生成）
export type SeriesRow = Database['public']['Tables']['series']['Row']
export type SeriesInsert = Database['public']['Tables']['series']['Insert']
export type SeriesUpdate = Database['public']['Tables']['series']['Update']

// 後方互換のエイリアス
export type Series = SeriesRow

// tournament_status 型を使う（旧 series_status は廃止）
export type SeriesStatus = Database['public']['Enums']['tournament_status']

// 拡張型
export type SeriesWithOrganizer = Series & {
  organizer: Profile
  _count?: {
    tournaments: number
  }
}

export type SeriesWithDetails = Series & {
  organizer: Profile
  tournaments: Tournament[]
}

export type SeriesWithTournaments = Series & {
  organizer: Profile
  tournaments: (Tournament & {
    _count: { participants: number }
  })[]
}

// ステータスラベル
export const seriesStatusLabels: Record<SeriesStatus, string> = {
  draft: '下書き',
  published: '公開',
  recruiting: '募集中',
  in_progress: '進行中',
  completed: '終了',
  cancelled: 'キャンセル',
}

// フォーム型（新スキーマ用）
export type SeriesFormData = {
  title: string
  description: string
  entry_type: 'individual' | 'team'
}
