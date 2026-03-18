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
      app_config: {
        Row: {
          app_mode: string
          created_at: string
          enabled: boolean
          free_changes_per_month: number
          id: string
          max_picks: number
          price_per_change: number
          updated_at: string
        }
        Insert: {
          app_mode: string
          created_at?: string
          enabled?: boolean
          free_changes_per_month?: number
          id?: string
          max_picks?: number
          price_per_change?: number
          updated_at?: string
        }
        Update: {
          app_mode?: string
          created_at?: string
          enabled?: boolean
          free_changes_per_month?: number
          id?: string
          max_picks?: number
          price_per_change?: number
          updated_at?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      global_config: {
        Row: {
          beta_countries: string[]
          beta_mode: boolean
          created_at: string
          enabled_countries: string[]
          enabled_languages: string[]
          free_picks_on_signup: number
          id: string
          max_new_users_per_day: number
          max_notifications_per_recipient_month: number
          max_notifications_per_recipient_total: number
          max_notifications_per_user: number
          notification_countries: string[]
          notification_sms_template: string
          notifications_enabled: boolean
          payment_countries: string[]
          promo_enabled: boolean
          promo_end: string | null
          promo_max_picks_override: number | null
          promo_start: string | null
          updated_at: string
          verify_email: boolean
          verify_mobile: boolean
        }
        Insert: {
          beta_countries?: string[]
          beta_mode?: boolean
          created_at?: string
          enabled_countries?: string[]
          enabled_languages?: string[]
          free_picks_on_signup?: number
          id?: string
          max_new_users_per_day?: number
          max_notifications_per_recipient_month?: number
          max_notifications_per_recipient_total?: number
          max_notifications_per_user?: number
          notification_countries?: string[]
          notification_sms_template?: string
          notifications_enabled?: boolean
          payment_countries?: string[]
          promo_enabled?: boolean
          promo_end?: string | null
          promo_max_picks_override?: number | null
          promo_start?: string | null
          updated_at?: string
          verify_email?: boolean
          verify_mobile?: boolean
        }
        Update: {
          beta_countries?: string[]
          beta_mode?: boolean
          created_at?: string
          enabled_countries?: string[]
          enabled_languages?: string[]
          free_picks_on_signup?: number
          id?: string
          max_new_users_per_day?: number
          max_notifications_per_recipient_month?: number
          max_notifications_per_recipient_total?: number
          max_notifications_per_user?: number
          notification_countries?: string[]
          notification_sms_template?: string
          notifications_enabled?: boolean
          payment_countries?: string[]
          promo_enabled?: boolean
          promo_end?: string | null
          promo_max_picks_override?: number | null
          promo_start?: string | null
          updated_at?: string
          verify_email?: boolean
          verify_mobile?: boolean
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          pick1_id: string
          pick2_id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pick1_id: string
          pick2_id: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pick1_id?: string
          pick2_id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_pick1_id_fkey"
            columns: ["pick1_id"]
            isOneToOne: false
            referencedRelation: "picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_pick2_id_fkey"
            columns: ["pick2_id"]
            isOneToOne: false
            referencedRelation: "picks"
            referencedColumns: ["id"]
          },
        ]
      }
      matches_safe: {
        Row: {
          blocked: boolean
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          id: string
          user1_id: string
          user2_id: string
        }
        Update: {
          blocked?: boolean
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      otp_verification_attempts: {
        Row: {
          created_at: string | null
          id: string
          phone: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone: string
        }
        Update: {
          created_at?: string | null
          id?: string
          phone?: string
        }
        Relationships: []
      }
      pack_purchases: {
        Row: {
          created_at: string
          id: string
          pack_id: string | null
          pack_name: string
          payment_method: string
          picks_count: number
          price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pack_id?: string | null
          pack_name: string
          payment_method?: string
          picks_count: number
          price: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pack_id?: string | null
          pack_name?: string
          payment_method?: string
          picks_count?: number
          price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "pick_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otps: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          phone: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      pick_notifications: {
        Row: {
          created_at: string
          id: string
          pick_id: string
          recipient_phone: string
          recipient_user_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pick_id: string
          recipient_phone: string
          recipient_user_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pick_id?: string
          recipient_phone?: string
          recipient_user_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      pick_packs: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          name: string
          picks_count: number
          price: number
          price_per_pick: number | null
          savings_percent: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          picks_count: number
          price: number
          price_per_pick?: number | null
          savings_percent?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          picks_count?: number
          price?: number
          price_per_pick?: number | null
          savings_percent?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      picks: {
        Row: {
          app_type: string
          created_at: string
          deleted_at: string | null
          id: string
          identifier_type: string
          is_matched: boolean
          picked_identifier: string
          picked_name: string
          picked_user_id: string | null
          picker_id: string
        }
        Insert: {
          app_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          identifier_type: string
          is_matched?: boolean
          picked_identifier: string
          picked_name: string
          picked_user_id?: string | null
          picker_id: string
        }
        Update: {
          app_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          identifier_type?: string
          is_matched?: boolean
          picked_identifier?: string
          picked_name?: string
          picked_user_id?: string | null
          picker_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_verified: boolean
          birth_year: number | null
          consent_accepted_at: string | null
          created_at: string
          display_name: string | null
          email: string | null
          email_verified: boolean
          id: string
          language: string
          phone: string | null
          phone_verified: boolean
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_verified?: boolean
          birth_year?: number | null
          consent_accepted_at?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          language?: string
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_verified?: boolean
          birth_year?: number | null
          consent_accepted_at?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          language?: string
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_disabled_apps: {
        Row: {
          app_mode: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          app_mode: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          app_mode?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pick_balance: {
        Row: {
          created_at: string
          id: string
          picks_remaining: number
          total_purchased: number
          total_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          picks_remaining?: number
          total_purchased?: number
          total_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          picks_remaining?: number
          total_purchased?: number
          total_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          app_type: string
          created_at: string
          ended_at: string | null
          exit_type: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          app_type?: string
          created_at?: string
          ended_at?: string | null
          exit_type?: string | null
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          app_type?: string
          created_at?: string
          ended_at?: string | null
          exit_type?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          app_mode: string
          created_at: string
          free_changes_used: number
          id: string
          month: string
          paid_changes_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          app_mode: string
          created_at?: string
          free_changes_used?: number
          id?: string
          month: string
          paid_changes_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          app_mode?: string
          created_at?: string
          free_changes_used?: number
          id?: string
          month?: string
          paid_changes_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_email_verifications: { Args: never; Returns: undefined }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_old_otp_attempts: { Args: never; Returns: undefined }
      get_effective_max_picks: { Args: { p_app_mode: string }; Returns: number }
      get_matched_user_profile: {
        Args: { p_match_id: string }
        Returns: {
          display_name: string
          email: string
          phone: string
        }[]
      }
      has_block_between: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_app_disabled_for_user: {
        Args: { _app_mode: string; _user_id: string }
        Returns: boolean
      }
      normalize_phone: { Args: { phone_input: string }; Returns: string }
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
