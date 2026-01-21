import { Database } from './database'
import { Profile, Tournament } from './tournament'

// DB型（database.tsに追加される想定 - 現時点では手動定義）
// マイグレーション適用後、npx supabase gen typesで自動生成される

export type SeriesStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type PointSystem = 'ranking' | 'wins'
export type PointCalculationMode = 'auto' | 'manual'

// Series テーブル型
export type Series = {
  id: string
  name: string
  description: string | null
  organizer_id: string
  entry_type: Database['public']['Enums']['entry_type']
  point_system: PointSystem
  point_config: PointConfig
  point_calculation_mode: PointCalculationMode
  start_date: string | null
  end_date: string | null
  status: SeriesStatus
  created_at: string
  updated_at: string
}

export type SeriesInsert = Omit<Series, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

export type SeriesUpdate = Partial<Omit<Series, 'id' | 'created_at' | 'updated_at'>>

// SeriesPoints テーブル型
export type SeriesPoints = {
  id: string
  series_id: string
  tournament_id: string
  user_id: string | null
  team_id: string | null
  points: number
  placement: number | null
  wins: number
  losses: number
  created_at: string
}

export type SeriesPointsInsert = Omit<SeriesPoints, 'id' | 'created_at'> & {
  id?: string
}

// ポイント設定型
export type RankingPointConfig = {
  [key: string]: number // "1": 100, "2": 70, "3": 50, "4": 30, "5-8": 10
}

export type WinsPointConfig = {
  points_per_win: number
  points_per_loss?: number
}

export type PointConfig = RankingPointConfig | WinsPointConfig

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

// ランキング型
export type SeriesRanking = {
  rank: number
  series_id: string
  user_id: string | null
  team_id: string | null
  name: string | null
  total_points: number
  tournaments_played: number
  total_wins: number
  total_losses: number
  avatar_url?: string | null
}

export type SeriesPointBreakdown = {
  tournament_id: string
  tournament_name: string
  tournament_date: string | null
  points: number
  placement: number | null
  wins: number
  losses: number
}

export type SeriesRankingWithBreakdown = SeriesRanking & {
  breakdown: SeriesPointBreakdown[]
}

// ステータスラベル
export const seriesStatusLabels: Record<SeriesStatus, string> = {
  draft: '下書き',
  active: '開催中',
  completed: '終了',
  cancelled: 'キャンセル',
}

export const pointSystemLabels: Record<PointSystem, string> = {
  ranking: '順位ポイント制',
  wins: '勝利数カウント',
}

// デフォルトのポイント設定
export const defaultRankingPoints: RankingPointConfig = {
  '1': 100,
  '2': 70,
  '3': 50,
  '4': 30,
  '5-8': 10,
}

export const defaultWinsPointConfig: WinsPointConfig = {
  points_per_win: 10,
  points_per_loss: 0,
}

// フォーム型
export type SeriesFormData = {
  name: string
  description: string
  entry_type: 'individual' | 'team'
  point_system: PointSystem
  point_config: PointConfig
  point_calculation_mode: PointCalculationMode
  start_date: string | null
  end_date: string | null
}

// ポイント計算モードのラベル
export const pointCalculationModeLabels: Record<PointCalculationMode, string> = {
  auto: '自動計算',
  manual: '手動確定',
}

// ポイント計算ヘルパー
export function calculatePointsFromPlacement(
  placement: number,
  pointConfig: RankingPointConfig
): number {
  // 完全一致を先にチェック
  if (pointConfig[placement.toString()]) {
    return pointConfig[placement.toString()]
  }

  // 範囲指定をチェック（例: "5-8"）
  for (const key of Object.keys(pointConfig)) {
    if (key.includes('-')) {
      const [min, max] = key.split('-').map(Number)
      if (placement >= min && placement <= max) {
        return pointConfig[key]
      }
    }
  }

  return 0
}

export function isRankingPointConfig(config: PointConfig): config is RankingPointConfig {
  return !('points_per_win' in config)
}

export function isWinsPointConfig(config: PointConfig): config is WinsPointConfig {
  return 'points_per_win' in config
}
