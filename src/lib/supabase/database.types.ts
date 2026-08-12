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
      clients: {
        Row: {
          assigned_coach_id: string | null
          birth_date: string | null
          created_at: string
          created_by: string | null
          current_weight_kg: number | null
          deleted_at: string | null
          email: string | null
          full_name: string
          gender: string | null
          height_cm: number | null
          id: string
          nickname: string | null
          note: string | null
          organization_id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_coach_id?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          current_weight_kg?: number | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          nickname?: string | null
          note?: string | null
          organization_id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_coach_id?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          current_weight_kg?: number | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          nickname?: string | null
          note?: string | null
          organization_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_types: {
        Row: {
          code: string
          id: string
          is_active: boolean
          name_en: string | null
          name_zh_tw: string
          sort_order: number
        }
        Insert: {
          code: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_zh_tw: string
          sort_order?: number
        }
        Update: {
          code?: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_zh_tw?: string
          sort_order?: number
        }
        Relationships: []
      }
      exercise_categories: {
        Row: {
          code: string
          id: string
          is_active: boolean
          name_en: string | null
          name_zh_tw: string
          sort_order: number
        }
        Insert: {
          code: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_zh_tw: string
          sort_order?: number
        }
        Update: {
          code?: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_zh_tw?: string
          sort_order?: number
        }
        Relationships: []
      }
      exercise_secondary_muscles: {
        Row: {
          exercise_id: string
          muscle_group_id: string
        }
        Insert: {
          exercise_id: string
          muscle_group_id: string
        }
        Update: {
          exercise_id?: string
          muscle_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_secondary_muscles_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_secondary_muscles_muscle_group_id_fkey"
            columns: ["muscle_group_id"]
            isOneToOne: false
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_tag_links: {
        Row: {
          created_at: string
          created_by: string | null
          exercise_id: string
          organization_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exercise_id: string
          organization_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exercise_id?: string
          organization_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_tag_links_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_tag_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "exercise_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_tags: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_usage_stats: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          last_used_at: string | null
          organization_id: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          last_used_at?: string | null
          organization_id: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          last_used_at?: string | null
          organization_id?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_usage_stats_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_usage_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          default_unit: string
          deleted_at: string | null
          equipment_type_id: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name_en: string | null
          name_zh_tw: string
          organization_id: string | null
          primary_muscle_group_id: string | null
          tracking_type: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          default_unit?: string
          deleted_at?: string | null
          equipment_type_id?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name_en?: string | null
          name_zh_tw: string
          organization_id?: string | null
          primary_muscle_group_id?: string | null
          tracking_type?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          default_unit?: string
          deleted_at?: string | null
          equipment_type_id?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name_en?: string | null
          name_zh_tw?: string
          organization_id?: string | null
          primary_muscle_group_id?: string | null
          tracking_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_equipment_type_id_fkey"
            columns: ["equipment_type_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_primary_muscle_group_id_fkey"
            columns: ["primary_muscle_group_id"]
            isOneToOne: false
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          organization_id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          organization_id: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          organization_id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_exercises_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      muscle_groups: {
        Row: {
          code: string
          id: string
          is_active: boolean
          name_en: string | null
          name_zh_tw: string
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          code: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_zh_tw: string
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_zh_tw?: string
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "muscle_groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          status: string
          timezone: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          status?: string
          timezone?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          status?: string
          timezone?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          locale: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          locale?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          deleted_at: string | null
          exercise_id: string
          id: string
          note: string | null
          organization_id: string
          sort_order: number
          updated_at: string
          workout_session_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          exercise_id: string
          id?: string
          note?: string | null
          organization_id: string
          sort_order?: number
          updated_at?: string
          workout_session_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          exercise_id?: string
          id?: string
          note?: string | null
          organization_id?: string
          sort_order?: number
          updated_at?: string
          workout_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          client_id: string
          coach_user_id: string
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          note: string | null
          organization_id: string
          session_date: string
          source_session_id: string | null
          started_at: string
          status: string
          title: string | null
          total_exercises: number
          total_sets: number
          updated_at: string
        }
        Insert: {
          client_id: string
          coach_user_id: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          organization_id: string
          session_date?: string
          source_session_id?: string | null
          started_at?: string
          status?: string
          title?: string | null
          total_exercises?: number
          total_sets?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          coach_user_id?: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          organization_id?: string
          session_date?: string
          source_session_id?: string | null
          started_at?: string
          status?: string
          title?: string | null
          total_exercises?: number
          total_sets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          distance_unit: string | null
          distance_value: number | null
          duration_seconds: number | null
          id: string
          is_completed: boolean
          note: string | null
          organization_id: string
          reps: number | null
          rir: number | null
          rpe: number | null
          set_number: number
          set_type: string
          updated_at: string
          weight_unit: string
          weight_value: number
          workout_exercise_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          distance_unit?: string | null
          distance_value?: number | null
          duration_seconds?: number | null
          id?: string
          is_completed?: boolean
          note?: string | null
          organization_id: string
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          set_number: number
          set_type?: string
          updated_at?: string
          weight_unit?: string
          weight_value?: number
          workout_exercise_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          distance_unit?: string | null
          distance_value?: number | null
          duration_seconds?: number | null
          id?: string
          is_completed?: boolean
          note?: string | null
          organization_id?: string
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          set_number?: number
          set_type?: string
          updated_at?: string
          weight_unit?: string
          weight_value?: number
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_coach_workspace: {
        Args: never
        Returns: {
          member_role: string
          org_id: string
          org_name: string
        }[]
      }
      complete_workout_session: {
        Args: { target_session_id: string }
        Returns: {
          client_id: string
          coach_user_id: string
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          note: string | null
          organization_id: string
          session_date: string
          source_session_id: string | null
          started_at: string
          status: string
          title: string | null
          total_exercises: number
          total_sets: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "workout_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_exercise_usage: {
        Args: { target_exercise_id: string; target_organization_id: string }
        Returns: {
          created_at: string
          exercise_id: string
          id: string
          last_used_at: string | null
          organization_id: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "exercise_usage_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_exercises: {
        Args: { target_organization_id: string; term: string }
        Returns: {
          category_id: string
          created_at: string
          created_by: string
          default_unit: string
          deleted_at: string
          equipment_type_id: string
          id: string
          is_active: boolean
          is_system: boolean
          name_en: string
          name_zh_tw: string
          organization_id: string
          primary_muscle_group_id: string
          tags: Json
          tracking_type: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

