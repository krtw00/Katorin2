// Database types for Supabase
// Auto-generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      matches: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          match_number: number
          next_match_id: string | null
          next_match_slot: number | null
          player1_id: string | null
          player1_score: number | null
          player2_id: string | null
          player2_score: number | null
          round: number
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          winner_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          match_number: number
          next_match_id?: string | null
          next_match_slot?: number | null
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          winner_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          match_number?: number
          next_match_id?: string | null
          next_match_slot?: number | null
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at: string
          custom_data: Json | null
          display_name: string | null
          entry_number: number
          final_placement: number | null
          id: string
          master_duel_id: string | null
          seed: number | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_data?: Json | null
          display_name?: string | null
          entry_number?: number
          final_placement?: number | null
          id?: string
          master_duel_id?: string | null
          seed?: number | null
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_data?: Json | null
          display_name?: string | null
          entry_number?: number
          final_placement?: number | null
          id?: string
          master_duel_id?: string | null
          seed?: number | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          discord_id: string | null
          display_name: string
          id: string
          master_duel_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discord_id?: string | null
          display_name: string
          id: string
          master_duel_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discord_id?: string | null
          display_name?: string
          id?: string
          master_duel_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          cover_image_url: string | null
          created_at: string
          current_round: number | null
          custom_fields: Json | null
          description: string | null
          entry_deadline: string | null
          entry_limit_behavior: Database["public"]["Enums"]["entry_limit_behavior"]
          entry_start_at: string | null
          entry_type: Database["public"]["Enums"]["entry_type"]
          id: string
          match_format: Database["public"]["Enums"]["match_format"]
          max_participants: number
          organizer_id: string
          result_report_mode: Database["public"]["Enums"]["result_report_mode"]
          start_at: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          title: string
          tournament_format: Database["public"]["Enums"]["tournament_format"]
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          current_round?: number | null
          custom_fields?: Json | null
          description?: string | null
          entry_deadline?: string | null
          entry_limit_behavior?: Database["public"]["Enums"]["entry_limit_behavior"]
          entry_start_at?: string | null
          entry_type?: Database["public"]["Enums"]["entry_type"]
          id?: string
          match_format?: Database["public"]["Enums"]["match_format"]
          max_participants?: number
          organizer_id: string
          result_report_mode?: Database["public"]["Enums"]["result_report_mode"]
          start_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          title: string
          tournament_format?: Database["public"]["Enums"]["tournament_format"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          current_round?: number | null
          custom_fields?: Json | null
          description?: string | null
          entry_deadline?: string | null
          entry_limit_behavior?: Database["public"]["Enums"]["entry_limit_behavior"]
          entry_start_at?: string | null
          entry_type?: Database["public"]["Enums"]["entry_type"]
          id?: string
          match_format?: Database["public"]["Enums"]["match_format"]
          max_participants?: number
          organizer_id?: string
          result_report_mode?: Database["public"]["Enums"]["result_report_mode"]
          start_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          title?: string
          tournament_format?: Database["public"]["Enums"]["tournament_format"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      entry_limit_behavior: "first_come" | "waitlist"
      entry_type: "individual" | "team"
      match_format: "bo1" | "bo3" | "bo5"
      match_status: "pending" | "in_progress" | "completed" | "bye"
      notification_type:
        | "match_ready"
        | "match_result"
        | "tournament_start"
        | "report_needed"
      result_report_mode: "organizer_only" | "participant"
      tournament_format:
        | "single_elimination"
        | "double_elimination"
        | "swiss"
        | "round_robin"
      tournament_status:
        | "draft"
        | "published"
        | "recruiting"
        | "in_progress"
        | "completed"
        | "cancelled"
      visibility: "public" | "unlisted" | "private"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

// Legacy type exports for backwards compatibility
export type TournamentStatus = Database['public']['Enums']['tournament_status']
export type TournamentFormat = Database['public']['Enums']['tournament_format']
export type MatchFormat = Database['public']['Enums']['match_format']
export type Visibility = Database['public']['Enums']['visibility']
export type EntryType = Database['public']['Enums']['entry_type']
export type ResultReportMode = Database['public']['Enums']['result_report_mode']
export type EntryLimitBehavior = Database['public']['Enums']['entry_limit_behavior']
export type MatchStatus = Database['public']['Enums']['match_status']
export type NotificationType = Database['public']['Enums']['notification_type']
