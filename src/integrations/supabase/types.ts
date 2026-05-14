export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      benchmark_companies: {
        Row: {
          active: boolean
          added_at: string
          category: string
          company_name: string
          domain: string
          id: string
          notes: string | null
          phase: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          added_at?: string
          category: string
          company_name: string
          domain: string
          id?: string
          notes?: string | null
          phase?: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          added_at?: string
          category?: string
          company_name?: string
          domain?: string
          id?: string
          notes?: string | null
          phase?: number
          sort_order?: number
        }
        Relationships: []
      }
      benchmark_run_log: {
        Row: {
          category: string
          company_name: string
          completed_at: string | null
          domain: string
          error_message: string | null
          id: string
          run_month: string
          scan_result_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          category: string
          company_name: string
          completed_at?: string | null
          domain: string
          error_message?: string | null
          id?: string
          run_month: string
          scan_result_id?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          category?: string
          company_name?: string
          completed_at?: string | null
          domain?: string
          error_message?: string | null
          id?: string
          run_month?: string
          scan_result_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      community_evidence: {
        Row: {
          created_at: string
          dimension: string | null
          evidence_url: string
          id: string
          submitted_by: string | null
          url_domain: string
        }
        Insert: {
          created_at?: string
          dimension?: string | null
          evidence_url: string
          id?: string
          submitted_by?: string | null
          url_domain: string
        }
        Update: {
          created_at?: string
          dimension?: string | null
          evidence_url?: string
          id?: string
          submitted_by?: string | null
          url_domain?: string
        }
        Relationships: []
      }
      evidence_misses: {
        Row: {
          company_domain: string
          created_at: string
          dimension: string
          expected_fact: string | null
          fix_applied: string
          id: string
          miss_reason: string
          submitted_url: string
        }
        Insert: {
          company_domain: string
          created_at?: string
          dimension: string
          expected_fact?: string | null
          fix_applied?: string
          id?: string
          miss_reason: string
          submitted_url: string
        }
        Update: {
          company_domain?: string
          created_at?: string
          dimension?: string
          expected_fact?: string | null
          fix_applied?: string
          id?: string
          miss_reason?: string
          submitted_url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          email_opt_out: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_opt_out?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_opt_out?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_feedback: {
        Row: {
          company_name: string
          created_at: string
          email: string | null
          feedback: string | null
          id: string
          rating: number
        }
        Insert: {
          company_name: string
          created_at?: string
          email?: string | null
          feedback?: string | null
          id?: string
          rating: number
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string | null
          feedback?: string | null
          id?: string
          rating?: number
        }
        Relationships: []
      }
      scan_results: {
        Row: {
          benchmark_month: string | null
          created_at: string
          expires_at: string
          id: string
          is_benchmark: boolean | null
          result_json: Json
          url_domain: string
        }
        Insert: {
          benchmark_month?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_benchmark?: boolean | null
          result_json: Json
          url_domain: string
        }
        Update: {
          benchmark_month?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_benchmark?: boolean | null
          result_json?: Json
          url_domain?: string
        }
        Relationships: []
      }
      scan_usage: {
        Row: {
          created_at: string
          email: string
          id: string
          scanned_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          scanned_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          scanned_url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_benchmark_data: {
        Args: { p_category: string; p_month: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_scan_result_cache: {
        Args: { p_result_json: Json; p_url_domain: string }
        Returns: string
      }
      upsert_scan_result_cache: {
        Args: { p_result_json: Json; p_url_domain: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
