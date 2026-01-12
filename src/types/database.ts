// Database types for Supabase
// This file should be regenerated using: npx supabase gen types typescript --local > src/types/database.ts
// For now, it's manually defined based on the schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ENUM types
export type TournamentStatus =
  | 'draft'
  | 'published'
  | 'recruiting'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type TournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'swiss'
  | 'round_robin'

export type MatchFormat = 'bo1' | 'bo3' | 'bo5'

export type Visibility = 'public' | 'unlisted' | 'private'

export type EntryType = 'individual' | 'team'

export type ResultReportMode = 'organizer_only' | 'participant'

export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'bye'

export type NotificationType =
  | 'match_ready'
  | 'match_result'
  | 'tournament_start'
  | 'report_needed'

// Database interface
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          master_duel_id: string | null
          discord_id: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          master_duel_id?: string | null
          discord_id?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          master_duel_id?: string | null
          discord_id?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          title: string
          description: string | null
          cover_image_url: string | null
          organizer_id: string
          visibility: Visibility
          status: TournamentStatus
          entry_type: EntryType
          tournament_format: TournamentFormat
          match_format: MatchFormat
          max_participants: number
          entry_start_at: string | null
          entry_deadline: string | null
          result_report_mode: ResultReportMode
          start_at: string | null
          current_round: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          cover_image_url?: string | null
          organizer_id: string
          visibility?: Visibility
          status?: TournamentStatus
          entry_type?: EntryType
          tournament_format?: TournamentFormat
          match_format?: MatchFormat
          max_participants?: number
          entry_start_at?: string | null
          entry_deadline?: string | null
          result_report_mode?: ResultReportMode
          start_at?: string | null
          current_round?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          cover_image_url?: string | null
          organizer_id?: string
          visibility?: Visibility
          status?: TournamentStatus
          entry_type?: EntryType
          tournament_format?: TournamentFormat
          match_format?: MatchFormat
          max_participants?: number
          entry_start_at?: string | null
          entry_deadline?: string | null
          result_report_mode?: ResultReportMode
          start_at?: string | null
          current_round?: number
          created_at?: string
          updated_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          entry_number: number
          master_duel_id: string | null
          seed: number | null
          final_placement: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          entry_number?: number
          master_duel_id?: string | null
          seed?: number | null
          final_placement?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          entry_number?: number
          master_duel_id?: string | null
          seed?: number | null
          final_placement?: number | null
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          round: number
          match_number: number
          player1_id: string | null
          player2_id: string | null
          player1_score: number
          player2_score: number
          winner_id: string | null
          status: MatchStatus
          next_match_id: string | null
          next_match_slot: number | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          round: number
          match_number: number
          player1_id?: string | null
          player2_id?: string | null
          player1_score?: number
          player2_score?: number
          winner_id?: string | null
          status?: MatchStatus
          next_match_id?: string | null
          next_match_slot?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          round?: number
          match_number?: number
          player1_id?: string | null
          player2_id?: string | null
          player1_score?: number
          player2_score?: number
          winner_id?: string | null
          status?: MatchStatus
          next_match_id?: string | null
          next_match_slot?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          body: string | null
          data: Json | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          body?: string | null
          data?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          title?: string
          body?: string | null
          data?: Json | null
          read_at?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      tournament_status: TournamentStatus
      tournament_format: TournamentFormat
      match_format: MatchFormat
      visibility: Visibility
      entry_type: EntryType
      result_report_mode: ResultReportMode
      match_status: MatchStatus
      notification_type: NotificationType
    }
  }
}
