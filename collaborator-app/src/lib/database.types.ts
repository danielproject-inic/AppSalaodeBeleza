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
      advance_requests: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          professional_id: string | null
          reason: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          professional_id?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          professional_id?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string | null
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          professional_id: string | null
          service_id: string | null
          servico_iniciado_at: string | null
          servico_terminado_at: string | null
          start_time: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          professional_id?: string | null
          service_id?: string | null
          servico_iniciado_at?: string | null
          servico_terminado_at?: string | null
          start_time: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          professional_id?: string | null
          service_id?: string | null
          servico_iniciado_at?: string | null
          servico_terminado_at?: string | null
          start_time?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string
          due_date: string
          id: string
          status: string | null
          supplier: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description: string
          due_date: string
          id?: string
          status?: string | null
          supplier?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string
          due_date?: string
          id?: string
          status?: string | null
          supplier?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address_json: Json | null
          allergies: string | null
          avatar_url: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          favorite_drink: string | null
          id: string
          is_vip: boolean | null
          name: string
          phone: string | null
          preferences: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          address_json?: Json | null
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          favorite_drink?: string | null
          id?: string
          is_vip?: boolean | null
          name: string
          phone?: string | null
          preferences?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          address_json?: Json | null
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          favorite_drink?: string | null
          id?: string
          is_vip?: boolean | null
          name?: string
          phone?: string | null
          preferences?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_batches: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          data: Json | null
          id: string
          period: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          data?: Json | null
          id: string
          period?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          period?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          recipient_id: string | null
          sender_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          recipient_id?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          recipient_id?: string | null
          sender_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          min_stock_level: number | null
          name: string
          price: number | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          min_stock_level?: number | null
          name: string
          price?: number | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          min_stock_level?: number | null
          name?: string
          price?: number | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      professional_exceptions: {
        Row: {
          created_at: string | null
          date: string
          end_time: string | null
          id: string
          notes: string | null
          professional_id: string | null
          start_time: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time?: string | null
          id?: string
          notes?: string | null
          professional_id?: string | null
          start_time?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          professional_id?: string | null
          start_time?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_exceptions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_reviews: {
        Row: {
          appointment_id: string | null
          client_id: string | null
          comment: string | null
          created_at: string
          id: string
          professional_id: string
          rating: number
        }
        Insert: {
          appointment_id?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          professional_id: string
          rating: number
        }
        Update: {
          appointment_id?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          professional_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          address_json: Json | null
          avatar_url: string | null
          average_rating: number | null
          base_commission: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          functions: string[] | null
          hire_date: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
          status: string | null
          termination_date: string | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          address_json?: Json | null
          avatar_url?: string | null
          average_rating?: number | null
          base_commission?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          functions?: string[] | null
          hire_date?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
          status?: string | null
          termination_date?: string | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          address_json?: Json | null
          avatar_url?: string | null
          average_rating?: number | null
          base_commission?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          functions?: string[] | null
          hire_date?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          status?: string | null
          termination_date?: string | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_json: Json | null
          avatar_url: string | null
          birth_date: string | null
          cash_pin: string | null
          cpf: string | null
          email: string | null
          force_password_change: boolean | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          permissions: Json | null
          phone: string | null
          points: number | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          address_json?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          cash_pin?: string | null
          cpf?: string | null
          email?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          permissions?: Json | null
          phone?: string | null
          points?: number | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          address_json?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          cash_pin?: string | null
          cpf?: string | null
          email?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          permissions?: Json | null
          phone?: string | null
          points?: number | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string | null
          client_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          rating: number | null
          service_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          service_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_config: {
        Row: {
          address: string | null
          address_json: Json | null
          business_hours: string | null
          cnpj: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          social_links: Json | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_json?: Json | null
          business_hours?: string | null
          cnpj?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_json?: Json | null
          business_hours?: string | null
          cnpj?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      salon_integrations: {
        Row: {
          id: string
          integration_id: string
          is_connected: boolean | null
          last_sync: string | null
          name: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          integration_id: string
          is_connected?: boolean | null
          last_sync?: string | null
          name: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          integration_id?: string
          is_connected?: boolean | null
          last_sync?: string | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_professionals: {
        Row: {
          professional_id: string
          service_id: string
        }
        Insert: {
          professional_id: string
          service_id: string
        }
        Update: {
          professional_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_professionals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_professionals_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
       services: {
         Row: {
           category: string | null
           commission_percentage: number | null
           created_at: string | null
           description: string | null
           duration_minutes: number | null
           id: string
           image_url: string | null
           price: number | null
           title: string
           updated_at: string | null
           is_variable_price: boolean | null
         }
         Insert: {
           category?: string | null
           commission_percentage?: number | null
           created_at?: string | null
           description?: string | null
           duration_minutes?: number | null
           id?: string
           image_url?: string | null
           price?: number | null
           title: string
           updated_at?: string | null
           is_variable_price?: boolean | null
         }
         Update: {
           category?: string | null
           commission_percentage?: number | null
           created_at?: string | null
           description?: string | null
           duration_minutes?: number | null
           id?: string
           image_url?: string | null
           price?: number | null
           title?: string
           updated_at?: string | null
           is_variable_price?: boolean | null
         }
         Relationships: []
       }
      transactions: {
        Row: {
          amount: number
          category: string | null
          client_id: string | null
          created_at: string | null
          description: string | null
          discount: number | null
          id: string
          items_json: Json | null
          observation: string | null
          payment_method: string | null
          professional_id: string | null
          status: string | null
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          discount?: number | null
          id?: string
          items_json?: Json | null
          observation?: string | null
          payment_method?: string | null
          professional_id?: string | null
          status?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          discount?: number | null
          id?: string
          items_json?: Json | null
          observation?: string | null
          payment_method?: string | null
          professional_id?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
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
  public: {
    Enums: {},
  },
} as const
