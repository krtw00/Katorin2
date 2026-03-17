import { Database } from './database'
import { Profile, Tournament } from './round'

// DB型（database.tsから自動生成）
export type LeagueRow = Database['public']['Tables']['leagues']['Row']
export type LeagueInsert = Database['public']['Tables']['leagues']['Insert']
export type LeagueUpdate = Database['public']['Tables']['leagues']['Update']

// 後方互換のエイリアス
export type Series = LeagueRow

// tournament_status 型を使う（旧 series_status は廃止）
export type LeagueStatus = Database['public']['Enums']['tournament_status']

// 拡張型
export type LeagueWithOrganizer = Series & {
  organizer: Profile
  _count?: {
    tournaments: number
  }
}

export type LeagueWithDetails = Series & {
  organizer: Profile
  tournaments: Tournament[]
}

export type LeagueWithRounds = Series & {
  organizer: Profile
  tournaments: (Tournament & {
    _count: { participants: number }
  })[]
}

// フォーム型（新スキーマ用）
export type LeagueFormData = {
  title: string
  description: string
}
