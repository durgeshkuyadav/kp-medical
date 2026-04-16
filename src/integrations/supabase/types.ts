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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_registrations: {
        Row: {
          approval_token: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          drug_license_number: string | null
          email: string
          full_name: string
          gst_number: string | null
          id: string
          phone: string | null
          rejection_reason: string | null
          shop_address: string | null
          shop_name: string | null
          status: Database["public"]["Enums"]["admin_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          drug_license_number?: string | null
          email: string
          full_name: string
          gst_number?: string | null
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          shop_address?: string | null
          shop_name?: string | null
          status?: Database["public"]["Enums"]["admin_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          drug_license_number?: string | null
          email?: string
          full_name?: string
          gst_number?: string | null
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          shop_address?: string | null
          shop_name?: string | null
          status?: Database["public"]["Enums"]["admin_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cash_entries: {
        Row: {
          admin_id: string | null
          amount: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      goods_received_notes: {
        Row: {
          admin_id: string | null
          created_at: string
          grn_number: string | null
          id: string
          notes: string | null
          po_id: string | null
          received_by: string | null
          status: string
          supplier_id: string | null
          supplier_name: string
          total: number
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          grn_number?: string | null
          id?: string
          notes?: string | null
          po_id?: string | null
          received_by?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name: string
          total?: number
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          grn_number?: string | null
          id?: string
          notes?: string | null
          po_id?: string | null
          received_by?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_notes_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_items: {
        Row: {
          batch_number: string | null
          created_at: string
          expiry_date: string | null
          grn_id: string
          id: string
          medicine_id: string | null
          medicine_name: string
          price: number
          quantity: number
          total: number
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          grn_id: string
          id?: string
          medicine_id?: string | null
          medicine_name: string
          price: number
          quantity: number
          total: number
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          grn_id?: string
          id?: string
          medicine_id?: string | null
          medicine_name?: string
          price?: number
          quantity?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_admin_mapping: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          manager_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          manager_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          manager_id?: string
        }
        Relationships: []
      }
      medicines: {
        Row: {
          admin_id: string | null
          barcode: string | null
          batch_number: string
          category: string | null
          created_at: string
          expiry_date: string
          generic_name: string | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          location: string | null
          manufacturer: string | null
          min_stock: number | null
          mrp: number
          name: string
          price: number
          stock: number
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          barcode?: string | null
          batch_number: string
          category?: string | null
          created_at?: string
          expiry_date: string
          generic_name?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          min_stock?: number | null
          mrp: number
          name: string
          price: number
          stock?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          barcode?: string | null
          batch_number?: string
          category?: string | null
          created_at?: string
          expiry_date?: string
          generic_name?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          min_stock?: number | null
          mrp?: number
          name?: string
          price?: number
          stock?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicines_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          admin_id: string | null
          allergies: string | null
          blood_group: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_id?: string | null
          allergies?: string | null
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_id?: string | null
          allergies?: string | null
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string
          status: string
          subscription_id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_method: string
          status?: string
          subscription_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          status?: string
          subscription_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          shop_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          shop_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          shop_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          medicine_id: string | null
          medicine_name: string
          po_id: string
          price: number
          quantity: number
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_id?: string | null
          medicine_name: string
          po_id: string
          price: number
          quantity: number
          total: number
        }
        Update: {
          created_at?: string
          id?: string
          medicine_id?: string | null
          medicine_name?: string
          po_id?: string
          price?: number
          quantity?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          admin_id: string | null
          created_at: string
          expected_date: string | null
          id: string
          notes: string | null
          po_number: string | null
          status: string
          supplier_id: string | null
          supplier_name: string
          total: number
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name: string
          total?: number
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_log: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          medicine_id: string | null
          medicine_name: string
          price: number
          quantity: number
          sale_id: string
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_id?: string | null
          medicine_name: string
          price: number
          quantity: number
          sale_id: string
          total: number
        }
        Update: {
          created_at?: string
          id?: string
          medicine_id?: string | null
          medicine_name?: string
          price?: number
          quantity?: number
          sale_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          admin_id: string | null
          created_at: string
          discount: number | null
          id: string
          invoice_number: string | null
          notes: string | null
          patient_id: string | null
          patient_name: string
          payment_method: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          discount?: number | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_name: string
          payment_method?: string
          status?: string
          total: number
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          discount?: number | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_name?: string
          payment_method?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          address: string | null
          admin_id: string | null
          created_at: string
          drug_license_number: string | null
          email: string | null
          gst_number: string | null
          id: string
          logo_url: string | null
          phone: string | null
          shop_name: string | null
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          address?: string | null
          admin_id?: string | null
          created_at?: string
          drug_license_number?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          shop_name?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          address?: string | null
          admin_id?: string | null
          created_at?: string
          drug_license_number?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          shop_name?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          admin_id: string | null
          created_at: string
          created_by: string | null
          grn_id: string | null
          id: string
          medicine_id: string
          movement_type: string
          notes: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reference_number: string | null
          sale_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          created_by?: string | null
          grn_id?: string | null
          id?: string
          medicine_id: string
          movement_type: string
          notes?: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reference_number?: string | null
          sale_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          created_by?: string | null
          grn_id?: string | null
          id?: string
          medicine_id?: string
          movement_type?: string
          notes?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reference_number?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          admin_id: string
          created_at: string
          current_period_end: string
          current_period_start: string
          grace_period_end: string | null
          id: string
          is_active: boolean
          monthly_price: number
          payment_method: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          yearly_price: number
        }
        Insert: {
          admin_id: string
          created_at?: string
          current_period_end: string
          current_period_start?: string
          grace_period_end?: string | null
          id?: string
          is_active?: boolean
          monthly_price?: number
          payment_method?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          admin_id?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          grace_period_end?: string | null
          id?: string
          is_active?: boolean
          monthly_price?: number
          payment_method?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          admin_id: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_id?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_id?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tenant_schemas: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          is_initialized: boolean
          schema_name: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          is_initialized?: boolean
          schema_name: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          is_initialized?: boolean
          schema_name?: string
          updated_at?: string
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
      check_rate_limit: {
        Args: {
          _endpoint: string
          _identifier: string
          _max_requests?: number
          _window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_rate_limit_log: { Args: never; Returns: undefined }
      deduct_stock_atomic: {
        Args: {
          p_medicine_id: string
          p_quantity: number
          p_reference_number?: string
          p_sale_id: string
        }
        Returns: Json
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_admin_schema: { Args: { _user_id: string }; Returns: string }
      get_current_admin_id: { Args: never; Returns: string }
      get_failed_attempts_count: {
        Args: { _email: string; _window_minutes?: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_locked: {
        Args: {
          _email: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: boolean
      }
      is_admin_active: { Args: { _user_id: string }; Returns: boolean }
      process_sale_stock: { Args: { p_sale_id: string }; Returns: Json }
    }
    Enums: {
      admin_status: "pending" | "approved" | "rejected" | "suspended"
      app_role: "admin" | "manager" | "super_admin"
      subscription_plan: "monthly" | "yearly"
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
      admin_status: ["pending", "approved", "rejected", "suspended"],
      app_role: ["admin", "manager", "super_admin"],
      subscription_plan: ["monthly", "yearly"],
    },
  },
} as const
