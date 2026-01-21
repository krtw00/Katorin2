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
      individual_matches: {
        Row: {
          id: string
          match_id: string
          play_order: number
          player1_id: string
          player2_id: string
          player1_score: number
          player2_score: number
          winner_id: string | null
          status: Database["public"]["Enums"]["match_status"]
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          play_order: number
          player1_id: string
          player2_id: string
          player1_score?: number
          player2_score?: number
          winner_id?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          play_order?: number
          player1_id?: string
          player2_id?: string
          player1_score?: number
          player2_score?: number
          winner_id?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "individual_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          winner_team_id: string | null
          team1_id: string | null
          team2_id: string | null
          bracket_side: Database["public"]["Enums"]["bracket_side"] | null
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
          winner_team_id?: string | null
          team1_id?: string | null
          team2_id?: string | null
          bracket_side?: Database["public"]["Enums"]["bracket_side"] | null
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
          winner_team_id?: string | null
          team1_id?: string | null
          team2_id?: string | null
          bracket_side?: Database["public"]["Enums"]["bracket_side"] | null
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
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          checked_in_at: string | null
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
          checked_in_at?: string | null
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
          checked_in_at?: string | null
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
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discord_id?: string | null
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discord_id?: string | null
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      series: {
        Row: {
          id: string
          name: string
          description: string | null
          organizer_id: string
          entry_type: Database["public"]["Enums"]["entry_type"]
          point_system: Database["public"]["Enums"]["point_system"]
          point_config: Json
          point_calculation_mode: Database["public"]["Enums"]["point_calculation_mode"]
          start_date: string | null
          end_date: string | null
          status: Database["public"]["Enums"]["series_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          organizer_id: string
          entry_type?: Database["public"]["Enums"]["entry_type"]
          point_system?: Database["public"]["Enums"]["point_system"]
          point_config?: Json
          point_calculation_mode?: Database["public"]["Enums"]["point_calculation_mode"]
          start_date?: string | null
          end_date?: string | null
          status?: Database["public"]["Enums"]["series_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          organizer_id?: string
          entry_type?: Database["public"]["Enums"]["entry_type"]
          point_system?: Database["public"]["Enums"]["point_system"]
          point_config?: Json
          point_calculation_mode?: Database["public"]["Enums"]["point_calculation_mode"]
          start_date?: string | null
          end_date?: string | null
          status?: Database["public"]["Enums"]["series_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      series_points: {
        Row: {
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
        Insert: {
          id?: string
          series_id: string
          tournament_id: string
          user_id?: string | null
          team_id?: string | null
          points?: number
          placement?: number | null
          wins?: number
          losses?: number
          created_at?: string
        }
        Update: {
          id?: string
          series_id?: string
          tournament_id?: string
          user_id?: string | null
          team_id?: string | null
          points?: number
          placement?: number | null
          wins?: number
          losses?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_points_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_points_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_points_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          avatar_url: string | null
          leader_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          avatar_url?: string | null
          leader_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          avatar_url?: string | null
          leader_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: Database["public"]["Enums"]["team_role"]
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: Database["public"]["Enums"]["team_role"]
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["team_role"]
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          id: string
          team_id: string
          invite_token: string
          expires_at: string
          max_uses: number
          use_count: number
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          invite_token: string
          expires_at: string
          max_uses?: number
          use_count?: number
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          invite_token?: string
          expires_at?: string
          max_uses?: number
          use_count?: number
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_entries: {
        Row: {
          id: string
          tournament_id: string
          team_id: string
          entry_number: number
          check_in_status: Database["public"]["Enums"]["check_in_status"]
          checked_in_at: string | null
          seed: number | null
          final_placement: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          team_id: string
          entry_number?: number
          check_in_status?: Database["public"]["Enums"]["check_in_status"]
          checked_in_at?: string | null
          seed?: number | null
          final_placement?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          team_id?: string
          entry_number?: number
          check_in_status?: Database["public"]["Enums"]["check_in_status"]
          checked_in_at?: string | null
          seed?: number | null
          final_placement?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_entries_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_rosters: {
        Row: {
          id: string
          team_entry_id: string
          user_id: string
          play_order: number
        }
        Insert: {
          id?: string
          team_entry_id: string
          user_id: string
          play_order: number
        }
        Update: {
          id?: string
          team_entry_id?: string
          user_id?: string
          play_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_rosters_team_entry_id_fkey"
            columns: ["team_entry_id"]
            isOneToOne: false
            referencedRelation: "team_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_invites: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          invited_by: string
          status: Database["public"]["Enums"]["invite_status"]
          message: string | null
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          invited_by: string
          status?: Database["public"]["Enums"]["invite_status"]
          message?: string | null
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          invited_by?: string
          status?: Database["public"]["Enums"]["invite_status"]
          message?: string | null
          created_at?: string
          responded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_invites_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_invites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          entry_mode: Database["public"]["Enums"]["entry_mode"]
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
          series_id: string | null
          team_battle_format: Database["public"]["Enums"]["team_battle_format"] | null
          team_size_min: number | null
          team_size_max: number | null
          team_creation_mode: Database["public"]["Enums"]["team_creation_mode"] | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          current_round?: number | null
          custom_fields?: Json | null
          description?: string | null
          entry_deadline?: string | null
          entry_limit_behavior?: Database["public"]["Enums"]["entry_limit_behavior"]
          entry_mode?: Database["public"]["Enums"]["entry_mode"]
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
          series_id?: string | null
          team_battle_format?: Database["public"]["Enums"]["team_battle_format"] | null
          team_size_min?: number | null
          team_size_max?: number | null
          team_creation_mode?: Database["public"]["Enums"]["team_creation_mode"] | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          current_round?: number | null
          custom_fields?: Json | null
          description?: string | null
          entry_deadline?: string | null
          entry_limit_behavior?: Database["public"]["Enums"]["entry_limit_behavior"]
          entry_mode?: Database["public"]["Enums"]["entry_mode"]
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
          series_id?: string | null
          team_battle_format?: Database["public"]["Enums"]["team_battle_format"] | null
          team_size_min?: number | null
          team_size_max?: number | null
          team_creation_mode?: Database["public"]["Enums"]["team_creation_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      series_rankings: {
        Row: {
          series_id: string
          user_id: string | null
          team_id: string | null
          name: string | null
          avatar_url: string | null
          total_points: number
          tournaments_played: number
          total_wins: number
          total_losses: number
          rank: number
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      bracket_side: "winners" | "losers" | "grand_final"
      check_in_status: "pending" | "checked_in" | "no_show"
      entry_limit_behavior: "first_come" | "waitlist"
      entry_mode: "open" | "invite_only"
      entry_type: "individual" | "team"
      invite_status: "pending" | "accepted" | "declined" | "expired"
      match_format: "bo1" | "bo3" | "bo5"
      match_status: "pending" | "in_progress" | "completed" | "bye"
      notification_type:
        | "match_ready"
        | "match_result"
        | "tournament_start"
        | "report_needed"
      point_calculation_mode: "auto" | "manual"
      point_system: "ranking" | "wins"
      result_report_mode: "organizer_only" | "participant"
      series_status: "draft" | "active" | "completed" | "cancelled"
      team_battle_format: "knockout" | "point"
      team_creation_mode: "user" | "organizer"
      team_role: "leader" | "member"
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

// Series & Team type exports
export type SeriesStatus = Database['public']['Enums']['series_status']
export type PointSystem = Database['public']['Enums']['point_system']
export type PointCalculationMode = Database['public']['Enums']['point_calculation_mode']
export type TeamRole = Database['public']['Enums']['team_role']
export type TeamBattleFormat = Database['public']['Enums']['team_battle_format']
export type TeamCreationMode = Database['public']['Enums']['team_creation_mode']
export type CheckInStatus = Database['public']['Enums']['check_in_status']
export type BracketSide = Database['public']['Enums']['bracket_side']

// Invite type exports
export type EntryMode = Database['public']['Enums']['entry_mode']
export type InviteStatus = Database['public']['Enums']['invite_status']
