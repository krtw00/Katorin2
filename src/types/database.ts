export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      individual_matches: {
        Row: {
          created_at: string
          id: string
          match_id: string
          play_order: number
          player1_duel_wins: number
          player1_id: string
          player1_score: number | null
          player2_duel_wins: number
          player2_id: string
          player2_score: number | null
          status: Database["public"]["Enums"]["match_status"]
          war_round_id: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          play_order: number
          player1_duel_wins?: number
          player1_id: string
          player1_score?: number | null
          player2_duel_wins?: number
          player2_id: string
          player2_score?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          war_round_id?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          play_order?: number
          player1_duel_wins?: number
          player1_id?: string
          player1_score?: number | null
          player2_duel_wins?: number
          player2_id?: string
          player2_score?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          war_round_id?: string | null
          winner_id?: string | null
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
            foreignKeyName: "individual_matches_war_round_id_fkey"
            columns: ["war_round_id"]
            isOneToOne: false
            referencedRelation: "war_rounds"
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
          block_id: string | null
          bracket_side: Database["public"]["Enums"]["bracket_side"] | null
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
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          team1_id: string | null
          team1_round_wins: number
          team1_wins: number
          team2_id: string | null
          team2_round_wins: number
          team2_wins: number
          tournament_id: string
          winner_id: string | null
          winner_team_id: string | null
        }
        Insert: {
          block_id?: string | null
          bracket_side?: Database["public"]["Enums"]["bracket_side"] | null
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
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team1_id?: string | null
          team1_round_wins?: number
          team1_wins?: number
          team2_id?: string | null
          team2_round_wins?: number
          team2_wins?: number
          tournament_id: string
          winner_id?: string | null
          winner_team_id?: string | null
        }
        Update: {
          block_id?: string | null
          bracket_side?: Database["public"]["Enums"]["bracket_side"] | null
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
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team1_id?: string | null
          team1_round_wins?: number
          team1_wins?: number
          team2_id?: string | null
          team2_round_wins?: number
          team2_wins?: number
          tournament_id?: string
          winner_id?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "tournament_blocks"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          checked_in_at: string | null
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
          checked_in_at?: string | null
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
          checked_in_at?: string | null
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
      series: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          entry_type: Database["public"]["Enums"]["entry_type"]
          id: string
          is_demo: boolean
          organizer_id: string
          series_config: Json
          status: Database["public"]["Enums"]["tournament_status"]
          team_battle_format:
            | Database["public"]["Enums"]["team_battle_format"]
            | null
          team_size_max: number | null
          team_size_min: number | null
          theme_config: Json
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          entry_type?: Database["public"]["Enums"]["entry_type"]
          id?: string
          is_demo?: boolean
          organizer_id: string
          series_config?: Json
          status?: Database["public"]["Enums"]["tournament_status"]
          team_battle_format?:
            | Database["public"]["Enums"]["team_battle_format"]
            | null
          team_size_max?: number | null
          team_size_min?: number | null
          theme_config?: Json
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          entry_type?: Database["public"]["Enums"]["entry_type"]
          id?: string
          is_demo?: boolean
          organizer_id?: string
          series_config?: Json
          status?: Database["public"]["Enums"]["tournament_status"]
          team_battle_format?:
            | Database["public"]["Enums"]["team_battle_format"]
            | null
          team_size_max?: number | null
          team_size_min?: number | null
          theme_config?: Json
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
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
      swiss_standings: {
        Row: {
          created_at: string
          id: string
          is_bye: boolean
          round: number
          team_id: string
          team_points: number
          tournament_id: string
          win_points: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_bye?: boolean
          round: number
          team_id: string
          team_points?: number
          tournament_id: string
          win_points?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_bye?: boolean
          round?: number
          team_id?: string
          team_points?: number
          tournament_id?: string
          win_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "swiss_standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swiss_standings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      team_entries: {
        Row: {
          block_id: string | null
          check_in_status: Database["public"]["Enums"]["check_in_status"]
          checked_in_at: string | null
          created_at: string
          entry_number: number
          final_placement: number | null
          id: string
          seed: number | null
          team_id: string
          tournament_id: string
        }
        Insert: {
          block_id?: string | null
          check_in_status?: Database["public"]["Enums"]["check_in_status"]
          checked_in_at?: string | null
          created_at?: string
          entry_number?: number
          final_placement?: number | null
          id?: string
          seed?: number | null
          team_id: string
          tournament_id: string
        }
        Update: {
          block_id?: string | null
          check_in_status?: Database["public"]["Enums"]["check_in_status"]
          checked_in_at?: string | null
          created_at?: string
          entry_number?: number
          final_placement?: number | null
          id?: string
          seed?: number | null
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_entries_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "tournament_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_entries_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          invite_token: string
          max_uses: number | null
          team_id: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          invite_token: string
          max_uses?: number | null
          team_id: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          invite_token?: string
          max_uses?: number | null
          team_id?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
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
      team_rosters: {
        Row: {
          id: string
          play_order: number
          team_entry_id: string
          user_id: string
        }
        Insert: {
          id?: string
          play_order: number
          team_entry_id: string
          user_id: string
        }
        Update: {
          id?: string
          play_order?: number
          team_entry_id?: string
          user_id?: string
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
      teams: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          leader_id: string
          name: string
          series_id: string | null
          tournament_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id: string
          name: string
          series_id?: string | null
          tournament_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string
          name?: string
          series_id?: string | null
          tournament_id?: string | null
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
          {
            foreignKeyName: "teams_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_blocks: {
        Row: {
          block_name: string
          block_order: number
          created_at: string
          id: string
          series_id: string | null
          tournament_id: string
        }
        Insert: {
          block_name: string
          block_order?: number
          created_at?: string
          id?: string
          series_id?: string | null
          tournament_id: string
        }
        Update: {
          block_name?: string
          block_order?: number
          created_at?: string
          id?: string
          series_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_blocks_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_blocks_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          message: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["invite_status"]
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          message?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          message?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
        ]
      }
      tournaments: {
        Row: {
          block_count: number | null
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
          finals_bracket_size: number | null
          id: string
          is_demo: boolean
          match_format: Database["public"]["Enums"]["match_format"]
          max_participants: number
          order_size: number
          organizer_id: string
          players_per_round: number
          result_report_mode: Database["public"]["Enums"]["result_report_mode"]
          round_number: number | null
          rounds_to_win: number | null
          series_id: string | null
          start_at: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          sub_count: number
          swiss_round_count: number | null
          team_battle_format:
            | Database["public"]["Enums"]["team_battle_format"]
            | null
          team_creation_mode:
            | Database["public"]["Enums"]["team_creation_mode"]
            | null
          team_size_max: number | null
          team_size_min: number | null
          theme_config: Json
          title: string
          tournament_format: Database["public"]["Enums"]["tournament_format"]
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
          win_point_value: number
        }
        Insert: {
          block_count?: number | null
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
          finals_bracket_size?: number | null
          id?: string
          is_demo?: boolean
          match_format?: Database["public"]["Enums"]["match_format"]
          max_participants?: number
          order_size?: number
          organizer_id: string
          players_per_round?: number
          result_report_mode?: Database["public"]["Enums"]["result_report_mode"]
          round_number?: number | null
          rounds_to_win?: number | null
          series_id?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          sub_count?: number
          swiss_round_count?: number | null
          team_battle_format?:
            | Database["public"]["Enums"]["team_battle_format"]
            | null
          team_creation_mode?:
            | Database["public"]["Enums"]["team_creation_mode"]
            | null
          team_size_max?: number | null
          team_size_min?: number | null
          theme_config?: Json
          title: string
          tournament_format?: Database["public"]["Enums"]["tournament_format"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
          win_point_value?: number
        }
        Update: {
          block_count?: number | null
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
          finals_bracket_size?: number | null
          id?: string
          is_demo?: boolean
          match_format?: Database["public"]["Enums"]["match_format"]
          max_participants?: number
          order_size?: number
          organizer_id?: string
          players_per_round?: number
          result_report_mode?: Database["public"]["Enums"]["result_report_mode"]
          round_number?: number | null
          rounds_to_win?: number | null
          series_id?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          sub_count?: number
          swiss_round_count?: number | null
          team_battle_format?:
            | Database["public"]["Enums"]["team_battle_format"]
            | null
          team_creation_mode?:
            | Database["public"]["Enums"]["team_creation_mode"]
            | null
          team_size_max?: number | null
          team_size_min?: number | null
          theme_config?: Json
          title?: string
          tournament_format?: Database["public"]["Enums"]["tournament_format"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
          win_point_value?: number
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
      war_orders: {
        Row: {
          created_at: string
          deck_name: string
          deck_theme: string
          id: string
          is_banned: boolean
          is_picked: boolean
          is_sub: boolean
          match_id: string
          slot: number
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_name: string
          deck_theme?: string
          id?: string
          is_banned?: boolean
          is_picked?: boolean
          is_sub?: boolean
          match_id: string
          slot: number
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_name?: string
          deck_theme?: string
          id?: string
          is_banned?: boolean
          is_picked?: boolean
          is_sub?: boolean
          match_id?: string
          slot?: number
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "war_orders_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "war_orders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "war_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      war_rounds: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          match_id: string
          round_number: number
          started_at: string | null
          status: string
          team1_match_wins: number
          team2_match_wins: number
          winner_team_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          match_id: string
          round_number: number
          started_at?: string | null
          status?: string
          team1_match_wins?: number
          team2_match_wins?: number
          winner_team_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          match_id?: string
          round_number?: number
          started_at?: string | null
          status?: string
          team1_match_wins?: number
          team2_match_wins?: number
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "war_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "war_rounds_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      block_standings: {
        Row: {
          block_id: string | null
          losses: number | null
          match_diff: number | null
          matches_played: number | null
          rank: number | null
          round_diff: number | null
          team_avatar_url: string | null
          team_id: string | null
          team_name: string | null
          total_rounds_won: number | null
          total_win_points: number | null
          tournament_id: string | null
          wins: number | null
        }
        Relationships: []
      }
      swiss_rankings: {
        Row: {
          bye_count: number | null
          rank: number | null
          rounds_played: number | null
          team_avatar_url: string | null
          team_id: string | null
          team_name: string | null
          total_team_points: number | null
          total_win_points: number | null
          tournament_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swiss_standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swiss_standings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      determine_match_winner_team: {
        Args: { p_match_id: string }
        Returns: string
      }
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
      result_report_mode: "organizer_only" | "participant"
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      bracket_side: ["winners", "losers", "grand_final"],
      check_in_status: ["pending", "checked_in", "no_show"],
      entry_limit_behavior: ["first_come", "waitlist"],
      entry_mode: ["open", "invite_only"],
      entry_type: ["individual", "team"],
      invite_status: ["pending", "accepted", "declined", "expired"],
      match_format: ["bo1", "bo3", "bo5"],
      match_status: ["pending", "in_progress", "completed", "bye"],
      notification_type: [
        "match_ready",
        "match_result",
        "tournament_start",
        "report_needed",
      ],
      result_report_mode: ["organizer_only", "participant"],
      team_battle_format: ["knockout", "point"],
      team_creation_mode: ["user", "organizer"],
      team_role: ["leader", "member"],
      tournament_format: [
        "single_elimination",
        "double_elimination",
        "swiss",
        "round_robin",
      ],
      tournament_status: [
        "draft",
        "published",
        "recruiting",
        "in_progress",
        "completed",
        "cancelled",
      ],
      visibility: ["public", "unlisted", "private"],
    },
  },
} as const

export type InviteStatus = Database["public"]["Enums"]["invite_status"]

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
export type TeamRole = Database['public']['Enums']['team_role']
export type TeamBattleFormat = Database['public']['Enums']['team_battle_format']
export type TeamCreationMode = Database['public']['Enums']['team_creation_mode']
export type CheckInStatus = Database['public']['Enums']['check_in_status']
export type BracketSide = Database['public']['Enums']['bracket_side']
export type EntryMode = Database['public']['Enums']['entry_mode']
