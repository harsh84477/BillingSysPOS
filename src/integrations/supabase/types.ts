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
      bill_items: {
        Row: {
          bill_id: string
          cost_price: number
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          bill_id: string
          cost_price?: number
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          bill_id?: string
          cost_price?: number
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_number: string
          business_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_amount: number
          discount_type: string | null
          discount_value: number | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["bill_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          bill_number: string
          business_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          bill_number?: string
          business_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          id: string
          business_name: string
          owner_id: string
          mobile_number: string
          join_code: string
          max_members: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_name?: string
          owner_id: string
          mobile_number: string
          join_code: string
          max_members?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_name?: string
          owner_id?: string
          mobile_number?: string
          join_code?: string
          max_members?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          address: string | null
          bill_prefix: string
          business_id: string | null
          business_name: string
          created_at: string
          currency: string
          currency_symbol: string
          email: string | null
          id: string
          invoice_font_size: number
          invoice_show_borders: boolean
          invoice_show_item_price: boolean
          invoice_spacing: number
          invoice_style: string
          logo_url: string | null
          next_bill_number: number
          phone: string | null
          show_discount_in_billing: boolean
          show_gst_in_billing: boolean
          tax_inclusive: boolean
          tax_name: string
          tax_rate: number
          theme: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bill_prefix?: string
          business_id?: string | null
          business_name?: string
          created_at?: string
          currency?: string
          currency_symbol?: string
          email?: string | null
          id?: string
          invoice_font_size?: number
          invoice_show_borders?: boolean
          invoice_show_item_price?: boolean
          invoice_spacing?: number
          invoice_style?: string
          logo_url?: string | null
          next_bill_number?: number
          phone?: string | null
          show_discount_in_billing?: boolean
          show_gst_in_billing?: boolean
          tax_inclusive?: boolean
          tax_name?: string
          tax_rate?: number
          theme?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bill_prefix?: string
          business_id?: string | null
          business_name?: string
          created_at?: string
          currency?: string
          currency_symbol?: string
          email?: string | null
          id?: string
          invoice_font_size?: number
          invoice_show_borders?: boolean
          invoice_show_item_price?: boolean
          invoice_spacing?: number
          invoice_style?: string
          logo_url?: string | null
          next_bill_number?: number
          phone?: string | null
          show_discount_in_billing?: boolean
          show_gst_in_billing?: boolean
          tax_inclusive?: boolean
          tax_name?: string
          tax_rate?: number
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          business_id: string | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          business_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          business_id: string | null
          change_quantity: number
          created_at: string
          created_by: string | null
          id: string
          new_quantity: number
          previous_quantity: number
          product_id: string
          reason: string
        }
        Insert: {
          business_id?: string | null
          change_quantity: number
          created_at?: string
          created_by?: string | null
          id?: string
          new_quantity: number
          previous_quantity: number
          product_id: string
          reason: string
        }
        Update: {
          business_id?: string | null
          change_quantity?: number
          created_at?: string
          created_by?: string | null
          id?: string
          new_quantity?: number
          previous_quantity?: number
          product_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string | null
          category_id: string | null
          cost_price: number
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          low_stock_threshold: number
          name: string
          selling_price: number
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          selling_price?: number
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          selling_price?: number
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_id: string | null
          created_at: string
          display_name: string | null
          id: string
          mobile_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          mobile_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          mobile_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_period: string
          created_at: string | null
          description: string | null
          features: Json
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          billing_period: string
          created_at?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          billing_period?: string
          created_at?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          business_id: string
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          trial_end: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string
          trial_end?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          trial_end?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          bill_prefix: string | null
          business_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          bill_prefix?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          bill_prefix?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      get_user_business_id: { Args: { _user_id: string }; Returns: string | null }
      create_business: {
        Args: {
          _business_name: string
          _mobile_number: string
          _user_id: string
        }
        Returns: Json
      }
      join_business: {
        Args: {
          _join_code: string
          _user_id: string
          _role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      regenerate_join_code: {
        Args: {
          _user_id: string
        }
        Returns: Json
      }
      update_my_bill_prefix: {
        Args: {
          _prefix: string
        }
        Returns: Json
      }
      generate_join_code: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "cashier"
      bill_status: "draft" | "completed" | "cancelled"
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
      app_role: ["admin", "manager", "cashier"],
      bill_status: ["draft", "completed", "cancelled"],
    },
  },
} as const
