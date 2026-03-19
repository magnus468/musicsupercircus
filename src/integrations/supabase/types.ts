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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agreement_works: {
        Row: {
          agreement_id: string
          id: string
          work_id: string
        }
        Insert: {
          agreement_id: string
          id?: string
          work_id: string
        }
        Update: {
          agreement_id?: string
          id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_works_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_works_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      agreements: {
        Row: {
          agreement_date: string
          agreement_type: string
          client_id: string
          created_at: string
          expiry_date: string | null
          file_path: string | null
          id: string
          life_of_copyright: boolean
          notes: string | null
          retention_date: string | null
          share_percentage: number | null
          status: string
          updated_at: string
        }
        Insert: {
          agreement_date?: string
          agreement_type?: string
          client_id: string
          created_at?: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          life_of_copyright?: boolean
          notes?: string | null
          retention_date?: string | null
          share_percentage?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          agreement_date?: string
          agreement_type?: string
          client_id?: string
          created_at?: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          life_of_copyright?: boolean
          notes?: string | null
          retention_date?: string | null
          share_percentage?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          bank_name: string | null
          bic_swift: string | null
          city: string | null
          client_type: string
          contact_person: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string
          iban: string | null
          id: string
          ipi_number: string | null
          last_name: string
          notes: string | null
          organization: string | null
          phone: string | null
          postal_code: string | null
          street_address: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          bank_name?: string | null
          bic_swift?: string | null
          city?: string | null
          client_type?: string
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          iban?: string | null
          id?: string
          ipi_number?: string | null
          last_name?: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          postal_code?: string | null
          street_address?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          bank_name?: string | null
          bic_swift?: string | null
          city?: string | null
          client_type?: string
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          iban?: string | null
          id?: string
          ipi_number?: string | null
          last_name?: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          postal_code?: string | null
          street_address?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      works: {
        Row: {
          co_publishers: string[] | null
          created_at: string
          creators: string
          id: string
          project: string | null
          publishing_type: Database["public"]["Enums"]["publishing_type"]
          share_percentage: number | null
          stim_comment: string | null
          stim_status: Database["public"]["Enums"]["stim_status"]
          title: string
          updated_at: string
        }
        Insert: {
          co_publishers?: string[] | null
          created_at?: string
          creators: string
          id?: string
          project?: string | null
          publishing_type?: Database["public"]["Enums"]["publishing_type"]
          share_percentage?: number | null
          stim_comment?: string | null
          stim_status?: Database["public"]["Enums"]["stim_status"]
          title: string
          updated_at?: string
        }
        Update: {
          co_publishers?: string[] | null
          created_at?: string
          creators?: string
          id?: string
          project?: string | null
          publishing_type?: Database["public"]["Enums"]["publishing_type"]
          share_percentage?: number | null
          stim_comment?: string | null
          stim_status?: Database["public"]["Enums"]["stim_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      publishing_type: "original" | "MSCE" | "MSCP" | "administration"
      stim_status: "anmäld" | "claimad" | "ej_anmäld"
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
      publishing_type: ["original", "MSCE", "MSCP", "administration"],
      stim_status: ["anmäld", "claimad", "ej_anmäld"],
    },
  },
} as const
