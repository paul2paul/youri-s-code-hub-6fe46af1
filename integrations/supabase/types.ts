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
      companies: {
        Row: {
          created_at: string
          fiscal_year_end: string
          id: string
          jurisdiction: string
          legal_form: string
          name: string
          president_email: string
          president_name: string
          siren: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fiscal_year_end: string
          id?: string
          jurisdiction?: string
          legal_form?: string
          name: string
          president_email: string
          president_name: string
          siren?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fiscal_year_end?: string
          id?: string
          jurisdiction?: string
          legal_form?: string
          name?: string
          president_email?: string
          president_name?: string
          siren?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          company_id: string
          file_name: string
          file_path: string
          id: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at: string
          version_label: string | null
        }
        Insert: {
          company_id: string
          file_name: string
          file_path: string
          id?: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
          version_label?: string | null
        }
        Update: {
          company_id?: string
          file_name?: string
          file_path?: string
          id?: string
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_bodies: {
        Row: {
          appointment_rules: string | null
          body_type: Database["public"]["Enums"]["governance_body_type"]
          company_id: string
          created_at: string
          holder_name: string | null
          id: string
          name: string
          powers_summary: string | null
          term_duration: string | null
        }
        Insert: {
          appointment_rules?: string | null
          body_type: Database["public"]["Enums"]["governance_body_type"]
          company_id: string
          created_at?: string
          holder_name?: string | null
          id?: string
          name: string
          powers_summary?: string | null
          term_duration?: string | null
        }
        Update: {
          appointment_rules?: string | null
          body_type?: Database["public"]["Enums"]["governance_body_type"]
          company_id?: string
          created_at?: string
          holder_name?: string | null
          id?: string
          name?: string
          powers_summary?: string | null
          term_duration?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_bodies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_profiles: {
        Row: {
          annual_obligations: Json | null
          approval_deadline_days: number | null
          company_id: string
          created_at: string
          id: string
          majority_rules_summary: string | null
          meeting_modality_rules: Json | null
          notice_period_days: number | null
          open_questions: Json | null
          quorum_rules_summary: string | null
          special_clauses_flags: Json | null
          who_can_convene: string | null
        }
        Insert: {
          annual_obligations?: Json | null
          approval_deadline_days?: number | null
          company_id: string
          created_at?: string
          id?: string
          majority_rules_summary?: string | null
          meeting_modality_rules?: Json | null
          notice_period_days?: number | null
          open_questions?: Json | null
          quorum_rules_summary?: string | null
          special_clauses_flags?: Json | null
          who_can_convene?: string | null
        }
        Update: {
          annual_obligations?: Json | null
          approval_deadline_days?: number | null
          company_id?: string
          created_at?: string
          id?: string
          majority_rules_summary?: string | null
          meeting_modality_rules?: Json | null
          notice_period_days?: number | null
          open_questions?: Json | null
          quorum_rules_summary?: string | null
          special_clauses_flags?: Json | null
          who_can_convene?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notify_14_days: boolean | null
          notify_7_days: boolean | null
          notify_overdue: boolean | null
          notify_timeline_generated: boolean | null
          slack_channel_id: string | null
          slack_enabled: boolean | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notify_14_days?: boolean | null
          notify_7_days?: boolean | null
          notify_overdue?: boolean | null
          notify_timeline_generated?: boolean | null
          slack_channel_id?: string | null
          slack_enabled?: boolean | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notify_14_days?: boolean | null
          notify_7_days?: boolean | null
          notify_overdue?: boolean | null
          notify_timeline_generated?: boolean | null
          slack_channel_id?: string | null
          slack_enabled?: boolean | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_messages: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message_text: string
          processed_at: string | null
          slack_user_id: string
          slack_user_name: string | null
          task_id: string | null
          thread_ts: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message_text: string
          processed_at?: string | null
          slack_user_id: string
          slack_user_name?: string | null
          task_id?: string | null
          thread_ts?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message_text?: string
          processed_at?: string | null
          slack_user_id?: string
          slack_user_name?: string | null
          task_id?: string | null
          thread_ts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slack_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          company_id: string
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["stakeholder_role"]
          share_percentage: number | null
          shares_count: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          role: Database["public"]["Enums"]["stakeholder_role"]
          share_percentage?: number | null
          shares_count?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["stakeholder_role"]
          share_percentage?: number | null
          shares_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_nudges: {
        Row: {
          channel: Database["public"]["Enums"]["nudge_channel"]
          id: string
          payload: Json | null
          sent_at: string
          task_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["nudge_channel"]
          id?: string
          payload?: Json | null
          sent_at?: string
          task_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["nudge_channel"]
          id?: string
          payload?: Json | null
          sent_at?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_nudges_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reminders: {
        Row: {
          channel: Database["public"]["Enums"]["nudge_channel"]
          created_at: string
          days_before: number
          enabled: boolean
          id: string
          task_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["nudge_channel"]
          created_at?: string
          days_before: number
          enabled?: boolean
          id?: string
          task_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["nudge_channel"]
          created_at?: string
          days_before?: number
          enabled?: boolean
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          company_id: string
          created_at: string
          cycle_year: number
          depends_on_task: string | null
          due_date: string
          id: string
          metadata: Json | null
          owner_role: Database["public"]["Enums"]["owner_role"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          cycle_year: number
          depends_on_task?: string | null
          due_date: string
          id?: string
          metadata?: Json | null
          owner_role: Database["public"]["Enums"]["owner_role"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          cycle_year?: number
          depends_on_task?: string | null
          due_date?: string
          id?: string
          metadata?: Json | null
          owner_role?: Database["public"]["Enums"]["owner_role"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_depends_on_task_fkey"
            columns: ["depends_on_task"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      year_contexts: {
        Row: {
          capital_change: boolean | null
          company_id: string
          confirmed_by_president_at: string | null
          created_at: string
          cycle_year: number
          dividends: boolean | null
          events_summary: string | null
          exceptions: string | null
          governance_change: boolean | null
          id: string
        }
        Insert: {
          capital_change?: boolean | null
          company_id: string
          confirmed_by_president_at?: string | null
          created_at?: string
          cycle_year: number
          dividends?: boolean | null
          events_summary?: string | null
          exceptions?: string | null
          governance_change?: boolean | null
          id?: string
        }
        Update: {
          capital_change?: boolean | null
          company_id?: string
          confirmed_by_president_at?: string | null
          created_at?: string
          cycle_year?: number
          dividends?: boolean | null
          events_summary?: string | null
          exceptions?: string | null
          governance_change?: boolean | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "year_contexts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      app_role: "admin" | "user"
      document_type:
        | "STATUTS"
        | "PACTE"
        | "PRIOR_PV"
        | "ACCOUNTS"
        | "OTHER"
        | "CAPTABLE"
      governance_body_type:
        | "PRESIDENT"
        | "DIRECTEUR_GENERAL"
        | "DIRECTEUR_GENERAL_DELEGUE"
        | "COMITE_DIRECTION"
        | "CONSEIL_SURVEILLANCE"
        | "COMITE_STRATEGIQUE"
        | "OTHER"
      nudge_channel: "SLACK" | "EMAIL"
      owner_role: "PRESIDENT" | "ACCOUNTANT"
      stakeholder_role: "PRESIDENT" | "SHAREHOLDER" | "ACCOUNTANT"
      task_status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "LATE"
      task_type:
        | "COLLECT_YEAR_INPUTS"
        | "COLLECT_ACCOUNTS"
        | "DRAFT_AGM_PACK"
        | "SEND_CONVOCATIONS"
        | "HOLD_AGM"
        | "FILE_ACCOUNTS"
        | "ARCHIVE"
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
      document_type: [
        "STATUTS",
        "PACTE",
        "PRIOR_PV",
        "ACCOUNTS",
        "OTHER",
        "CAPTABLE",
      ],
      governance_body_type: [
        "PRESIDENT",
        "DIRECTEUR_GENERAL",
        "DIRECTEUR_GENERAL_DELEGUE",
        "COMITE_DIRECTION",
        "CONSEIL_SURVEILLANCE",
        "COMITE_STRATEGIQUE",
        "OTHER",
      ],
      nudge_channel: ["SLACK", "EMAIL"],
      owner_role: ["PRESIDENT", "ACCOUNTANT"],
      stakeholder_role: ["PRESIDENT", "SHAREHOLDER", "ACCOUNTANT"],
      task_status: ["TODO", "IN_PROGRESS", "DONE", "BLOCKED", "LATE"],
      task_type: [
        "COLLECT_YEAR_INPUTS",
        "COLLECT_ACCOUNTS",
        "DRAFT_AGM_PACK",
        "SEND_CONVOCATIONS",
        "HOLD_AGM",
        "FILE_ACCOUNTS",
        "ARCHIVE",
      ],
    },
  },
} as const
