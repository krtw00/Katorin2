import { Database } from './database'

// Helper types from database
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type Participant = Database['public']['Tables']['participants']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

export type TournamentInsert = Database['public']['Tables']['tournaments']['Insert']
export type TournamentUpdate = Database['public']['Tables']['tournaments']['Update']
export type ParticipantInsert = Database['public']['Tables']['participants']['Insert']
export type MatchInsert = Database['public']['Tables']['matches']['Insert']
export type MatchUpdate = Database['public']['Tables']['matches']['Update']

// Extended types with relations
export type TournamentWithOrganizer = Tournament & {
  organizer: Profile
  _count?: {
    participants: number
  }
}

export type TournamentWithDetails = Tournament & {
  organizer: Profile
  participants: (Participant & {
    user: Profile
  })[]
}

export type MatchWithPlayers = Match & {
  player1: Profile | null
  player2: Profile | null
  winner: Profile | null
}

export type ParticipantWithUser = Participant & {
  user: Profile
}

// Status labels for UI
export const tournamentStatusLabels: Record<Database['public']['Enums']['tournament_status'], string> = {
  draft: '下書き',
  published: '公開',
  recruiting: '募集中',
  in_progress: '開催中',
  completed: '終了',
  cancelled: 'キャンセル',
}

export const matchStatusLabels: Record<Database['public']['Enums']['match_status'], string> = {
  pending: '待機中',
  in_progress: '対戦中',
  completed: '終了',
  bye: '不戦勝',
}

export const tournamentFormatLabels: Record<Database['public']['Enums']['tournament_format'], string> = {
  single_elimination: 'シングルエリミネーション',
  double_elimination: 'ダブルエリミネーション',
  swiss: 'スイスドロー',
  round_robin: '総当たり',
}

export const matchFormatLabels: Record<Database['public']['Enums']['match_format'], string> = {
  bo1: '1本勝負',
  bo3: 'マッチ戦（2本先取）',
  bo5: 'マッチ戦（3本先取）',
}

// Custom field definition for tournament entry
export type InputType = 'text' | 'checkbox' | 'image'
export type EditDeadline = 'entry_closed' | 'entry_period' | 'bracket_published' | 'event_end'

export type CustomField = {
  key: string
  label: string
  inputType: InputType
  required: boolean
  hidden: boolean
  editDeadline: EditDeadline
  placeholder: string
  options?: string[] // For checkbox type
}

// Form types
export type TournamentFormData = {
  title: string
  description: string
  tournament_format: Database['public']['Enums']['tournament_format']
  match_format: Database['public']['Enums']['match_format']
  max_participants: number
  visibility: Database['public']['Enums']['visibility']
  entry_start_at: string | null
  entry_deadline: string | null
  start_at: string | null
  custom_fields?: CustomField[]
}

export type EntryFormData = {
  display_name: string
  custom_data: Record<string, string>
}

export type MatchResultFormData = {
  player1_score: number
  player2_score: number
  winner_id: string
}
