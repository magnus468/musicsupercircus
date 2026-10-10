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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agreement_files: {
        Row: {
          agreement_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
        }
        Insert: {
          agreement_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
        }
        Update: {
          agreement_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_files_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
        ]
      }
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
          file_name: string | null
          file_path: string | null
          id: string
          internal_publisher: string
          life_of_copyright: boolean
          notes: string | null
          post_expiry_action: string
          retention_date: string | null
          retention_years: number | null
          rolling_end_date: string | null
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
          file_name?: string | null
          file_path?: string | null
          id?: string
          internal_publisher?: string
          life_of_copyright?: boolean
          notes?: string | null
          post_expiry_action?: string
          retention_date?: string | null
          retention_years?: number | null
          rolling_end_date?: string | null
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
          file_name?: string | null
          file_path?: string | null
          id?: string
          internal_publisher?: string
          life_of_copyright?: boolean
          notes?: string | null
          post_expiry_action?: string
          retention_date?: string | null
          retention_years?: number | null
          rolling_end_date?: string | null
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
      project_agreements: {
        Row: {
          agreement_id: string
          id: string
          project_id: string
        }
        Insert: {
          agreement_id: string
          id?: string
          project_id: string
        }
        Update: {
          agreement_id?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_agreements_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_agreements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client: string | null
          composer: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          project_number: string | null
          publishing: string | null
          status: string | null
          supervisor: string | null
          updated_at: string
        }
        Insert: {
          client?: string | null
          composer?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_number?: string | null
          publishing?: string | null
          status?: string | null
          supervisor?: string | null
          updated_at?: string
        }
        Update: {
          client?: string | null
          composer?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_number?: string | null
          publishing?: string | null
          status?: string | null
          supervisor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recording_expenses: {
        Row: {
          album_key: string
          amount_sek: number
          bearers: string[] | null
          created_at: string
          description: string
          id: string
        }
        Insert: {
          album_key: string
          amount_sek: number
          bearers?: string[] | null
          created_at?: string
          description: string
          id?: string
        }
        Update: {
          album_key?: string
          amount_sek?: number
          bearers?: string[] | null
          created_at?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      recording_splits: {
        Row: {
          created_at: string
          id: string
          recipient: string
          recording_id: string
          share: number
          sort: number
        }
        Insert: {
          created_at?: string
          id?: string
          recipient: string
          recording_id: string
          share?: number
          sort?: number
        }
        Update: {
          created_at?: string
          id?: string
          recipient?: string
          recording_id?: string
          share?: number
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "recording_splits_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_statement_lines: {
        Row: {
          amount: number
          artist: string | null
          catalog_number: string | null
          country: string | null
          id: string
          isrc: string | null
          quantity: number
          recording_id: string | null
          release_title: string | null
          sale_month: string | null
          sale_type: string | null
          statement_id: string
          store: string | null
          title: string | null
          upc: string | null
        }
        Insert: {
          amount?: number
          artist?: string | null
          catalog_number?: string | null
          country?: string | null
          id?: string
          isrc?: string | null
          quantity?: number
          recording_id?: string | null
          release_title?: string | null
          sale_month?: string | null
          sale_type?: string | null
          statement_id: string
          store?: string | null
          title?: string | null
          upc?: string | null
        }
        Update: {
          amount?: number
          artist?: string | null
          catalog_number?: string | null
          country?: string | null
          id?: string
          isrc?: string | null
          quantity?: number
          recording_id?: string | null
          release_title?: string | null
          sale_month?: string | null
          sale_type?: string | null
          statement_id?: string
          store?: string | null
          title?: string | null
          upc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recording_statement_lines_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recording_statement_lines_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "recording_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_statements: {
        Row: {
          created_at: string
          currency: string
          file_name: string | null
          id: string
          period_end: string | null
          period_label: string
          period_start: string | null
          row_count: number
          source: string
          total_amount: number
          usd_sek_rate: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          file_name?: string | null
          id?: string
          period_end?: string | null
          period_label: string
          period_start?: string | null
          row_count?: number
          source: string
          total_amount?: number
          usd_sek_rate?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          file_name?: string | null
          id?: string
          period_end?: string | null
          period_label?: string
          period_start?: string | null
          row_count?: number
          source?: string
          total_amount?: number
          usd_sek_rate?: number | null
        }
        Relationships: []
      }
      recordings: {
        Row: {
          album: string | null
          artist: string | null
          audio_url: string | null
          catalog_number: string | null
          composer: string | null
          cover_url: string | null
          created_at: string
          expenses: string | null
          id: string
          ifpi_registered: boolean
          isrc: string | null
          label: string | null
          project: string | null
          split_artist: number | null
          split_label: number | null
          split_msc: number | null
          spotify_album: string | null
          spotify_cover_url: string | null
          spotify_popularity: number | null
          spotify_release_date: string | null
          spotify_synced_at: string | null
          spotify_track_id: string | null
          spotify_url: string | null
          sr_uploaded: boolean
          track: string
          updated_at: string
          work_id: string | null
        }
        Insert: {
          album?: string | null
          artist?: string | null
          audio_url?: string | null
          catalog_number?: string | null
          composer?: string | null
          cover_url?: string | null
          created_at?: string
          expenses?: string | null
          id?: string
          ifpi_registered?: boolean
          isrc?: string | null
          label?: string | null
          project?: string | null
          split_artist?: number | null
          split_label?: number | null
          split_msc?: number | null
          spotify_album?: string | null
          spotify_cover_url?: string | null
          spotify_popularity?: number | null
          spotify_release_date?: string | null
          spotify_synced_at?: string | null
          spotify_track_id?: string | null
          spotify_url?: string | null
          sr_uploaded?: boolean
          track: string
          updated_at?: string
          work_id?: string | null
        }
        Update: {
          album?: string | null
          artist?: string | null
          audio_url?: string | null
          catalog_number?: string | null
          composer?: string | null
          cover_url?: string | null
          created_at?: string
          expenses?: string | null
          id?: string
          ifpi_registered?: boolean
          isrc?: string | null
          label?: string | null
          project?: string | null
          split_artist?: number | null
          split_label?: number | null
          split_msc?: number | null
          spotify_album?: string | null
          spotify_cover_url?: string | null
          spotify_popularity?: number | null
          spotify_release_date?: string | null
          spotify_synced_at?: string | null
          spotify_track_id?: string | null
          spotify_url?: string | null
          sr_uploaded?: boolean
          track?: string
          updated_at?: string
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recordings_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      release_clients: {
        Row: {
          album_key: string
          auto: boolean
          client_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          album_key: string
          auto?: boolean
          client_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          album_key?: string
          auto?: boolean
          client_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      royalty_payees: {
        Row: {
          client_id: string | null
          minimum_payout: number
          recipient: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          client_id?: string | null
          minimum_payout?: number
          recipient: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          client_id?: string | null
          minimum_payout?: number
          recipient?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "royalty_payees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      royalty_statements: {
        Row: {
          client_id: string | null
          created_at: string
          expenses_sek: number
          fees: Json
          id: string
          income_downloads_sek: number
          income_streams_sek: number
          minimum_payout: number
          opening_balance: number
          outstanding_balance: number
          payable_excl_vat: number
          payable_incl_vat: number
          period_end: string
          period_label: string
          period_start: string
          recipient: string
          statement_date: string
          vat_rate: number
          vat_sek: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          expenses_sek?: number
          fees?: Json
          id?: string
          income_downloads_sek?: number
          income_streams_sek?: number
          minimum_payout?: number
          opening_balance?: number
          outstanding_balance?: number
          payable_excl_vat?: number
          payable_incl_vat?: number
          period_end: string
          period_label: string
          period_start: string
          recipient: string
          statement_date?: string
          vat_rate?: number
          vat_sek?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          expenses_sek?: number
          fees?: Json
          id?: string
          income_downloads_sek?: number
          income_streams_sek?: number
          minimum_payout?: number
          opening_balance?: number
          outstanding_balance?: number
          payable_excl_vat?: number
          payable_incl_vat?: number
          period_end?: string
          period_label?: string
          period_start?: string
          recipient?: string
          statement_date?: string
          vat_rate?: number
          vat_sek?: number
        }
        Relationships: [
          {
            foreignKeyName: "royalty_statements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_statement_map: {
        Row: {
          distribution_key: string
          label: string
          publisher: string
        }
        Insert: {
          distribution_key: string
          label: string
          publisher: string
        }
        Update: {
          distribution_key?: string
          label?: string
          publisher?: string
        }
        Relationships: []
      }
      settlement_stats_cache: {
        Row: {
          cache_key: string
          payload: Json
          updated_at: string
          version: number | null
        }
        Insert: {
          cache_key: string
          payload: Json
          updated_at?: string
          version?: number | null
        }
        Update: {
          cache_key?: string
          payload?: Json
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      settlement_stats_version: {
        Row: {
          id: boolean
          version: number
        }
        Insert: {
          id?: boolean
          version?: number
        }
        Update: {
          id?: boolean
          version?: number
        }
        Relationships: []
      }
      settlement_title_mappings: {
        Row: {
          created_at: string
          id: string
          settlement_title: string
          work_title: string
        }
        Insert: {
          created_at?: string
          id?: string
          settlement_title: string
          work_title: string
        }
        Update: {
          created_at?: string
          id?: string
          settlement_title?: string
          work_title?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          agreement_key: string | null
          amount: number
          composers: string | null
          country: string | null
          created_at: string
          distribution: string | null
          distribution_key: string | null
          episode_title: string | null
          from_date: string | null
          id: string
          ipi_name_number: string | null
          member_number: string | null
          number_of_uses: number | null
          production_title: string | null
          publisher: string
          recipient_name: string | null
          role: string | null
          share: number | null
          source: string | null
          statement_label: string | null
          sub_source: string | null
          to_date: string | null
          type_of_right: string | null
          work_key: string | null
          work_title: string
        }
        Insert: {
          agreement_key?: string | null
          amount?: number
          composers?: string | null
          country?: string | null
          created_at?: string
          distribution?: string | null
          distribution_key?: string | null
          episode_title?: string | null
          from_date?: string | null
          id?: string
          ipi_name_number?: string | null
          member_number?: string | null
          number_of_uses?: number | null
          production_title?: string | null
          publisher?: string
          recipient_name?: string | null
          role?: string | null
          share?: number | null
          source?: string | null
          statement_label?: string | null
          sub_source?: string | null
          to_date?: string | null
          type_of_right?: string | null
          work_key?: string | null
          work_title: string
        }
        Update: {
          agreement_key?: string | null
          amount?: number
          composers?: string | null
          country?: string | null
          created_at?: string
          distribution?: string | null
          distribution_key?: string | null
          episode_title?: string | null
          from_date?: string | null
          id?: string
          ipi_name_number?: string | null
          member_number?: string | null
          number_of_uses?: number | null
          production_title?: string | null
          publisher?: string
          recipient_name?: string | null
          role?: string | null
          share?: number | null
          source?: string | null
          statement_label?: string | null
          sub_source?: string | null
          to_date?: string | null
          type_of_right?: string | null
          work_key?: string | null
          work_title?: string
        }
        Relationships: []
      }
      stim_works: {
        Row: {
          conflict: boolean
          created_at: string
          creators: string | null
          ice_work_key: string
          id: string
          ipi_numbers: string[] | null
          match_status: string
          publisher: string
          roles: string | null
          status: string | null
          title: string
          work_id: string | null
          work_type: string | null
        }
        Insert: {
          conflict?: boolean
          created_at?: string
          creators?: string | null
          ice_work_key: string
          id?: string
          ipi_numbers?: string[] | null
          match_status?: string
          publisher?: string
          roles?: string | null
          status?: string | null
          title: string
          work_id?: string | null
          work_type?: string | null
        }
        Update: {
          conflict?: boolean
          created_at?: string
          creators?: string | null
          ice_work_key?: string
          id?: string
          ipi_numbers?: string[] | null
          match_status?: string
          publisher?: string
          roles?: string | null
          status?: string | null
          title?: string
          work_id?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stim_works_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
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
      work_registrations: {
        Row: {
          alt_title: string | null
          artist: string | null
          created_at: string
          creators: Json
          duration: string | null
          file_name: string | null
          folder: string | null
          id: string
          match_note: string | null
          match_status: string
          mismatch_note: string | null
          pdf_path: string | null
          publishers: Json
          share_mismatch: boolean
          title: string
          work_id: string | null
          work_type: string | null
        }
        Insert: {
          alt_title?: string | null
          artist?: string | null
          created_at?: string
          creators?: Json
          duration?: string | null
          file_name?: string | null
          folder?: string | null
          id?: string
          match_note?: string | null
          match_status?: string
          mismatch_note?: string | null
          pdf_path?: string | null
          publishers?: Json
          share_mismatch?: boolean
          title: string
          work_id?: string | null
          work_type?: string | null
        }
        Update: {
          alt_title?: string | null
          artist?: string | null
          created_at?: string
          creators?: Json
          duration?: string | null
          file_name?: string | null
          folder?: string | null
          id?: string
          match_note?: string | null
          match_status?: string
          mismatch_note?: string | null
          pdf_path?: string | null
          publishers?: Json
          share_mismatch?: boolean
          title?: string
          work_id?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_registrations_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          audio_url: string | null
          co_publishers: string[] | null
          created_at: string
          creators: string
          id: string
          nordic_publisher_share: number
          project: string | null
          publishing_type: Database["public"]["Enums"]["publishing_type"]
          row_publisher_share: number
          share_percentage: number | null
          stim_comment: string | null
          stim_conflict: boolean | null
          stim_status: Database["public"]["Enums"]["stim_status"]
          stim_work_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          co_publishers?: string[] | null
          created_at?: string
          creators: string
          id?: string
          nordic_publisher_share?: number
          project?: string | null
          publishing_type?: Database["public"]["Enums"]["publishing_type"]
          row_publisher_share?: number
          share_percentage?: number | null
          stim_comment?: string | null
          stim_conflict?: boolean | null
          stim_status?: Database["public"]["Enums"]["stim_status"]
          stim_work_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          co_publishers?: string[] | null
          created_at?: string
          creators?: string
          id?: string
          nordic_publisher_share?: number
          project?: string | null
          publishing_type?: Database["public"]["Enums"]["publishing_type"]
          row_publisher_share?: number
          share_percentage?: number | null
          stim_comment?: string | null
          stim_conflict?: boolean | null
          stim_status?: Database["public"]["Enums"]["stim_status"]
          stim_work_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      recording_effective_splits: {
        Row: {
          frac: number | null
          recipient: string | null
          recording_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _recording_ledger: {
        Args: never
        Returns: {
          album_key: string
          deduction: number
          gross: number
          rate: number
          recipient: string
          statement_id: string
        }[]
      }
      compute_settlement_stats: {
        Args: { p_distribution_key?: string }
        Returns: Json
      }
      get_album_recoup: { Args: { p_album_key: string }; Returns: Json }
      get_country_works: {
        Args: {
          p_country: string
          p_distribution_key?: string
          p_year?: string
        }
        Returns: Json
      }
      get_recording_income: { Args: never; Returns: Json }
      get_royalty_period: {
        Args: { p_end: string; p_start: string }
        Returns: Json
      }
      get_settlement_stats:
        | { Args: never; Returns: Json }
        | { Args: { p_distribution_key?: string }; Returns: Json }
      get_statement_payouts: { Args: { p_statement_id: string }; Returns: Json }
      get_unmatched_settlement_works: { Args: never; Returns: Json }
      get_unregistered_soundtrack_titles: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      norm_title: { Args: { t: string }; Returns: string }
      recording_album_key: {
        Args: { a: string; p: string; s: string }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
      publishing_type: ["original", "MSCE", "MSCP", "administration"],
      stim_status: ["anmäld", "claimad", "ej_anmäld"],
    },
  },
} as const
