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
      brands: {
        Row: {
          created_at: string | null
          description: string | null
          distributor_id: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          distributor_id: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          category_type: Database["public"]["Enums"]["category_type"] | null
          created_at: string
          description: string | null
          distributor_id: string
          id: string
          is_active: boolean | null
          is_final: boolean | null
          is_returnable: boolean | null
          name: string
          parent_id: string | null
          remark: string | null
          sort_order: number | null
        }
        Insert: {
          category_type?: Database["public"]["Enums"]["category_type"] | null
          created_at?: string
          description?: string | null
          distributor_id: string
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          is_returnable?: boolean | null
          name: string
          parent_id?: string | null
          remark?: string | null
          sort_order?: number | null
        }
        Update: {
          category_type?: Database["public"]["Enums"]["category_type"] | null
          created_at?: string
          description?: string | null
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          is_returnable?: boolean | null
          name?: string
          parent_id?: string | null
          remark?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      data_export_logs: {
        Row: {
          created_at: string
          export_format: string
          export_type: string
          file_size_bytes: number | null
          id: string
          metadata: Json | null
          record_count: number | null
          superadmin_id: string
          target_user_email: string
          target_user_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          export_format?: string
          export_type?: string
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          record_count?: number | null
          superadmin_id: string
          target_user_email: string
          target_user_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          export_format?: string
          export_type?: string
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          record_count?: number | null
          superadmin_id?: string
          target_user_email?: string
          target_user_id?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      distributor_profiles: {
        Row: {
          account_name: string | null
          account_no: string | null
          address: string | null
          bank_branch: string | null
          bank_name: string | null
          city: string | null
          company_alias: string | null
          company_country: string | null
          company_district: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string
          company_slogan: string | null
          contact_person: string | null
          created_at: string
          gst_number: string | null
          id: string
          ifsc_code: string | null
          invoice_prefix: string | null
          lic_no: string | null
          logo_url: string | null
          msme_reg_no: string | null
          pan_number: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          swift_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_no?: string | null
          address?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          city?: string | null
          company_alias?: string | null
          company_country?: string | null
          company_district?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name: string
          company_slogan?: string | null
          contact_person?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          invoice_prefix?: string | null
          lic_no?: string | null
          logo_url?: string | null
          msme_reg_no?: string | null
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          swift_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_no?: string | null
          address?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          city?: string | null
          company_alias?: string | null
          company_country?: string | null
          company_district?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_slogan?: string | null
          contact_person?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          invoice_prefix?: string | null
          lic_no?: string | null
          logo_url?: string | null
          msme_reg_no?: string | null
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          swift_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      districts: {
        Row: {
          id: string
          is_active: boolean | null
          name: string
          state: string
          state_code: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          name: string
          state: string
          state_code?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          name?: string
          state?: string
          state_code?: string | null
        }
        Relationships: []
      }
      expense_master: {
        Row: {
          amount_effect: string | null
          calculation_on: string | null
          calculation_type: string
          created_at: string | null
          default_percent: number | null
          distributor_id: string
          entry_type: string
          expense_name: string
          id: string
          is_active: boolean | null
          ledger_name: string | null
          position: string | null
          sequence: number | null
          updated_at: string | null
        }
        Insert: {
          amount_effect?: string | null
          calculation_on?: string | null
          calculation_type: string
          created_at?: string | null
          default_percent?: number | null
          distributor_id: string
          entry_type: string
          expense_name: string
          id?: string
          is_active?: boolean | null
          ledger_name?: string | null
          position?: string | null
          sequence?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_effect?: string | null
          calculation_on?: string | null
          calculation_type?: string
          created_at?: string | null
          default_percent?: number | null
          distributor_id?: string
          entry_type?: string
          expense_name?: string
          id?: string
          is_active?: boolean | null
          ledger_name?: string | null
          position?: string | null
          sequence?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_master_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_years: {
        Row: {
          created_at: string
          distributor_id: string
          end_date: string
          id: string
          is_current: boolean | null
          is_locked: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          distributor_id: string
          end_date: string
          id?: string
          is_current?: boolean | null
          is_locked?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          distributor_id?: string
          end_date?: string
          id?: string
          is_current?: boolean | null
          is_locked?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_years_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_inward_items: {
        Row: {
          batch_number: string | null
          created_at: string
          discount_percent: number | null
          gate_inward_id: string
          id: string
          item_id: string
          location_id: string | null
          price: number | null
          quantity: number
          remark: string | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          discount_percent?: number | null
          gate_inward_id: string
          id?: string
          item_id: string
          location_id?: string | null
          price?: number | null
          quantity?: number
          remark?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          discount_percent?: number | null
          gate_inward_id?: string
          id?: string
          item_id?: string
          location_id?: string | null
          price?: number | null
          quantity?: number
          remark?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gate_inward_items_gate_inward_id_fkey"
            columns: ["gate_inward_id"]
            isOneToOne: false
            referencedRelation: "gate_inwards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_inward_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_inward_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_inwards: {
        Row: {
          challan_date: string | null
          challan_number: string | null
          created_at: string
          created_by: string | null
          distributor_id: string
          gi_date: string
          gi_number: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          party_id: string
          purchase_order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          challan_date?: string | null
          challan_number?: string | null
          created_at?: string
          created_by?: string | null
          distributor_id: string
          gi_date?: string
          gi_number: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          party_id: string
          purchase_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          challan_date?: string | null
          challan_number?: string | null
          created_at?: string
          created_by?: string | null
          distributor_id?: string
          gi_date?: string
          gi_number?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          party_id?: string
          purchase_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gate_inwards_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_inwards_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_inwards_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      group_master: {
        Row: {
          created_at: string | null
          distributor_id: string
          effect_in: string | null
          group_code: string
          group_name: string
          id: string
          is_active: boolean | null
          nature: string | null
          parent_group_id: string | null
          sequence: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          distributor_id: string
          effect_in?: string | null
          group_code: string
          group_name: string
          id?: string
          is_active?: boolean | null
          nature?: string | null
          parent_group_id?: string | null
          sequence?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          distributor_id?: string
          effect_in?: string | null
          group_code?: string
          group_name?: string
          id?: string
          is_active?: boolean | null
          nature?: string | null
          parent_group_id?: string | null
          sequence?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_master_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_master_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "group_master"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_summary: {
        Row: {
          created_at: string | null
          distributor_id: string
          gst_balance: number | null
          gst_paid: number | null
          id: string
          net_gst_payable: number | null
          period_month: number
          period_year: number
          total_input_cgst: number | null
          total_input_igst: number | null
          total_input_sgst: number | null
          total_output_cgst: number | null
          total_output_igst: number | null
          total_output_sgst: number | null
          total_taxable_purchases: number | null
          total_taxable_sales: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          distributor_id: string
          gst_balance?: number | null
          gst_paid?: number | null
          id?: string
          net_gst_payable?: number | null
          period_month: number
          period_year: number
          total_input_cgst?: number | null
          total_input_igst?: number | null
          total_input_sgst?: number | null
          total_output_cgst?: number | null
          total_output_igst?: number | null
          total_output_sgst?: number | null
          total_taxable_purchases?: number | null
          total_taxable_sales?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          distributor_id?: string
          gst_balance?: number | null
          gst_paid?: number | null
          id?: string
          net_gst_payable?: number | null
          period_month?: number
          period_year?: number
          total_input_cgst?: number | null
          total_input_igst?: number | null
          total_input_sgst?: number | null
          total_output_cgst?: number | null
          total_output_igst?: number | null
          total_output_sgst?: number | null
          total_taxable_purchases?: number | null
          total_taxable_sales?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gst_summary_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hsn_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          gst_rate: number | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          gst_rate?: number | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          gst_rate?: number | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      hsn_master: {
        Row: {
          created_at: string | null
          description: string | null
          distributor_id: string
          gst_percent: number | null
          hsn_code: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          distributor_id: string
          gst_percent?: number | null
          hsn_code: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          distributor_id?: string
          gst_percent?: number | null
          hsn_code?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hsn_master_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_types: {
        Row: {
          created_at: string
          distributor_id: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          distributor_id: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_types_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          cess_amount: number | null
          cess_percent: number | null
          cgst_amount: number | null
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          gst_percent: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          invoice_id: string
          item_id: string | null
          item_name: string
          item_sku: string | null
          line_order: number | null
          quantity: number
          rate: number
          sgst_amount: number | null
          taxable_amount: number
          total_amount: number
          unit: string | null
        }
        Insert: {
          cess_amount?: number | null
          cess_percent?: number | null
          cgst_amount?: number | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          gst_percent?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id: string
          item_id?: string | null
          item_name: string
          item_sku?: string | null
          line_order?: number | null
          quantity?: number
          rate?: number
          sgst_amount?: number | null
          taxable_amount?: number
          total_amount?: number
          unit?: string | null
        }
        Update: {
          cess_amount?: number | null
          cess_percent?: number | null
          cgst_amount?: number | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          gst_percent?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id?: string
          item_id?: string | null
          item_name?: string
          item_sku?: string | null
          line_order?: number | null
          quantity?: number
          rate?: number
          sgst_amount?: number | null
          taxable_amount?: number
          total_amount?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          balance_due: number | null
          billing_address: string | null
          billing_city: string | null
          billing_pincode: string | null
          billing_state: string | null
          cess_amount: number | null
          cgst_amount: number | null
          created_at: string
          created_by: string | null
          discount_amount: number | null
          discount_percent: number | null
          distributor_id: string
          due_date: string | null
          grand_total: number
          id: string
          igst_amount: number | null
          invoice_date: string
          invoice_number: string
          invoice_type: string
          notes: string | null
          party_gst: string | null
          party_id: string
          party_name: string
          party_state: string
          payment_status: string | null
          round_off: number | null
          salesperson_id: string | null
          sgst_amount: number | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_pincode: string | null
          shipping_state: string | null
          status: string | null
          subtotal: number
          taxable_amount: number
          terms: string | null
          total_tax: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          balance_due?: number | null
          billing_address?: string | null
          billing_city?: string | null
          billing_pincode?: string | null
          billing_state?: string | null
          cess_amount?: number | null
          cgst_amount?: number | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          distributor_id: string
          due_date?: string | null
          grand_total?: number
          id?: string
          igst_amount?: number | null
          invoice_date?: string
          invoice_number: string
          invoice_type: string
          notes?: string | null
          party_gst?: string | null
          party_id: string
          party_name: string
          party_state: string
          payment_status?: string | null
          round_off?: number | null
          salesperson_id?: string | null
          sgst_amount?: number | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_state?: string | null
          status?: string | null
          subtotal?: number
          taxable_amount?: number
          terms?: string | null
          total_tax?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          balance_due?: number | null
          billing_address?: string | null
          billing_city?: string | null
          billing_pincode?: string | null
          billing_state?: string | null
          cess_amount?: number | null
          cgst_amount?: number | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          distributor_id?: string
          due_date?: string | null
          grand_total?: number
          id?: string
          igst_amount?: number | null
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          party_gst?: string | null
          party_id?: string
          party_name?: string
          party_state?: string
          payment_status?: string | null
          round_off?: number | null
          salesperson_id?: string | null
          sgst_amount?: number | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_state?: string | null
          status?: string | null
          subtotal?: number
          taxable_amount?: number
          terms?: string | null
          total_tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespersons"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          application_users: string[] | null
          brand_id: string | null
          category_id: string | null
          cess_percent: number | null
          cost_price: number | null
          created_at: string
          description: string | null
          distributor_id: string
          gst_percent: number | null
          hsn_code: string | null
          hsn_code_id: string | null
          id: string
          is_active: boolean | null
          is_returnable: boolean | null
          item_code: string | null
          item_type: Database["public"]["Enums"]["item_type"] | null
          max_stock_level: number | null
          max_stock_qty: number | null
          min_stock_level: number | null
          min_stock_qty: number | null
          mrp: number | null
          name: string
          product_description: string | null
          product_image_url: string | null
          purchase_price: number
          sac_code_id: string | null
          sale_price: number
          sku: string
          stock_quantity: number | null
          unit: string | null
          updated_at: string
          usage_application: string | null
          weight_kg: number | null
        }
        Insert: {
          application_users?: string[] | null
          brand_id?: string | null
          category_id?: string | null
          cess_percent?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          distributor_id: string
          gst_percent?: number | null
          hsn_code?: string | null
          hsn_code_id?: string | null
          id?: string
          is_active?: boolean | null
          is_returnable?: boolean | null
          item_code?: string | null
          item_type?: Database["public"]["Enums"]["item_type"] | null
          max_stock_level?: number | null
          max_stock_qty?: number | null
          min_stock_level?: number | null
          min_stock_qty?: number | null
          mrp?: number | null
          name: string
          product_description?: string | null
          product_image_url?: string | null
          purchase_price?: number
          sac_code_id?: string | null
          sale_price?: number
          sku: string
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string
          usage_application?: string | null
          weight_kg?: number | null
        }
        Update: {
          application_users?: string[] | null
          brand_id?: string | null
          category_id?: string | null
          cess_percent?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          distributor_id?: string
          gst_percent?: number | null
          hsn_code?: string | null
          hsn_code_id?: string | null
          id?: string
          is_active?: boolean | null
          is_returnable?: boolean | null
          item_code?: string | null
          item_type?: Database["public"]["Enums"]["item_type"] | null
          max_stock_level?: number | null
          max_stock_qty?: number | null
          min_stock_level?: number | null
          min_stock_qty?: number | null
          mrp?: number | null
          name?: string
          product_description?: string | null
          product_image_url?: string | null
          purchase_price?: number
          sac_code_id?: string | null
          sale_price?: number
          sku?: string
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string
          usage_application?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_hsn_code_id_fkey"
            columns: ["hsn_code_id"]
            isOneToOne: false
            referencedRelation: "hsn_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_sac_code_id_fkey"
            columns: ["sac_code_id"]
            isOneToOne: false
            referencedRelation: "sac_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          balance: number
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          distributor_id: string
          entry_date: string
          entry_type: string
          id: string
          narration: string | null
          party_id: string
          reference_id: string | null
          reference_number: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          distributor_id: string
          entry_date?: string
          entry_type: string
          id?: string
          narration?: string | null
          party_id: string
          reference_id?: string | null
          reference_number?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          distributor_id?: string
          entry_date?: string
          entry_type?: string
          id?: string
          narration?: string | null
          party_id?: string
          reference_id?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_groups: {
        Row: {
          created_at: string | null
          distributor_id: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          nature: string | null
          parent_group_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          distributor_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          nature?: string | null
          parent_group_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          distributor_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          nature?: string | null
          parent_group_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_groups_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "ledger_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          distributor_id: string
          id: string
          ledger_id: string
          narration: string | null
          transaction_date: string
          voucher_id: string | null
        }
        Insert: {
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          distributor_id: string
          id?: string
          ledger_id: string
          narration?: string | null
          transaction_date?: string
          voucher_id?: string | null
        }
        Update: {
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          distributor_id?: string
          id?: string
          ledger_id?: string
          narration?: string | null
          transaction_date?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_transactions_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      ledgers: {
        Row: {
          closing_balance: number | null
          created_at: string | null
          description: string | null
          distributor_id: string
          group_id: string | null
          group_name: string
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          opening_balance: number | null
          opening_balance_type: string | null
          party_id: string | null
          tcs_applicable: boolean | null
          tcs_rate: number | null
          tds_applicable: boolean | null
          tds_rate: number | null
          updated_at: string | null
        }
        Insert: {
          closing_balance?: number | null
          created_at?: string | null
          description?: string | null
          distributor_id: string
          group_id?: string | null
          group_name?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          opening_balance?: number | null
          opening_balance_type?: string | null
          party_id?: string | null
          tcs_applicable?: boolean | null
          tcs_rate?: number | null
          tds_applicable?: boolean | null
          tds_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          closing_balance?: number | null
          created_at?: string | null
          description?: string | null
          distributor_id?: string
          group_id?: string | null
          group_name?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          opening_balance?: number | null
          opening_balance_type?: string | null
          party_id?: string | null
          tcs_applicable?: boolean | null
          tcs_rate?: number | null
          tds_applicable?: boolean | null
          tds_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledgers_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledgers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "ledger_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledgers_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      marking: {
        Row: {
          created_at: string | null
          created_by: string | null
          distributor_id: string
          employee_id: string | null
          id: string
          item_id: string
          location_id: string
          mrk_date: string
          mrk_full_number: string
          mrk_number: number
          mrk_prefix: string | null
          quantity: number
          remark: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          distributor_id: string
          employee_id?: string | null
          id?: string
          item_id: string
          location_id: string
          mrk_date?: string
          mrk_full_number: string
          mrk_number: number
          mrk_prefix?: string | null
          quantity?: number
          remark?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          distributor_id?: string
          employee_id?: string | null
          id?: string
          item_id?: string
          location_id?: string
          mrk_date?: string
          mrk_full_number?: string
          mrk_number?: number
          mrk_prefix?: string | null
          quantity?: number
          remark?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marking_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marking_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marking_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marking_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marking_batches: {
        Row: {
          batch_number: string
          created_at: string | null
          id: string
          location_id: string
          marking_id: string
          quantity: number
          stock_quantity: number
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          id?: string
          location_id: string
          marking_id: string
          quantity?: number
          stock_quantity?: number
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          id?: string
          location_id?: string
          marking_id?: string
          quantity?: number
          stock_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "marking_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marking_batches_marking_id_fkey"
            columns: ["marking_id"]
            isOneToOne: false
            referencedRelation: "marking"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_stock: {
        Row: {
          batch_number: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          distributor_id: string
          id: string
          item_id: string
          location_id: string
          quantity: number
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          distributor_id: string
          id?: string
          item_id: string
          location_id: string
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          distributor_id?: string
          id?: string
          item_id?: string
          location_id?: string
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opening_stock_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      packing: {
        Row: {
          created_at: string | null
          created_by: string | null
          distributor_id: string
          employee_id: string | null
          id: string
          item_id: string
          location_id: string
          pck_date: string
          pck_full_number: string
          pck_number: number
          pck_prefix: string | null
          quantity: number
          remark: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          distributor_id: string
          employee_id?: string | null
          id?: string
          item_id: string
          location_id: string
          pck_date?: string
          pck_full_number: string
          pck_number: number
          pck_prefix?: string | null
          quantity?: number
          remark?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          distributor_id?: string
          employee_id?: string | null
          id?: string
          item_id?: string
          location_id?: string
          pck_date?: string
          pck_full_number?: string
          pck_number?: number
          pck_prefix?: string | null
          quantity?: number
          remark?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packing_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_batches: {
        Row: {
          batch_number: string
          created_at: string | null
          id: string
          location_id: string
          packing_id: string
          quantity: number
          stock_quantity: number
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          id?: string
          location_id: string
          packing_id: string
          quantity?: number
          stock_quantity?: number
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          id?: string
          location_id?: string
          packing_id?: string
          quantity?: number
          stock_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "packing_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_batches_packing_id_fkey"
            columns: ["packing_id"]
            isOneToOne: false
            referencedRelation: "packing"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credit_days: number | null
          credit_limit: number | null
          currency: string | null
          current_balance: number | null
          distance_km: number | null
          distributor_id: string
          district: string | null
          email: string | null
          group_name: string | null
          gst_number: string | null
          gst_reg_date: string | null
          id: string
          industry_type: string | null
          is_active: boolean | null
          legal_name: string | null
          mobile: string | null
          name: string
          opening_balance: number | null
          pan_number: string | null
          party_code: string | null
          phone: string | null
          pincode: string | null
          price_structure: string | null
          registration_type: string | null
          sales_executive_id: string | null
          sales_zone: string | null
          state: string
          type: string
          updated_at: string
          village: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_days?: number | null
          credit_limit?: number | null
          currency?: string | null
          current_balance?: number | null
          distance_km?: number | null
          distributor_id: string
          district?: string | null
          email?: string | null
          group_name?: string | null
          gst_number?: string | null
          gst_reg_date?: string | null
          id?: string
          industry_type?: string | null
          is_active?: boolean | null
          legal_name?: string | null
          mobile?: string | null
          name: string
          opening_balance?: number | null
          pan_number?: string | null
          party_code?: string | null
          phone?: string | null
          pincode?: string | null
          price_structure?: string | null
          registration_type?: string | null
          sales_executive_id?: string | null
          sales_zone?: string | null
          state: string
          type: string
          updated_at?: string
          village?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_days?: number | null
          credit_limit?: number | null
          currency?: string | null
          current_balance?: number | null
          distance_km?: number | null
          distributor_id?: string
          district?: string | null
          email?: string | null
          group_name?: string | null
          gst_number?: string | null
          gst_reg_date?: string | null
          id?: string
          industry_type?: string | null
          is_active?: boolean | null
          legal_name?: string | null
          mobile?: string | null
          name?: string
          opening_balance?: number | null
          pan_number?: string | null
          party_code?: string | null
          phone?: string | null
          pincode?: string | null
          price_structure?: string | null
          registration_type?: string | null
          sales_executive_id?: string | null
          sales_zone?: string | null
          state?: string
          type?: string
          updated_at?: string
          village?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parties_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_delivery_addresses: {
        Row: {
          address: string
          city: string | null
          country: string | null
          created_at: string | null
          distance_km: number | null
          distributor_id: string
          district: string | null
          id: string
          is_default: boolean | null
          party_id: string
          pincode: string | null
          ship_to: string | null
          state: string
          updated_at: string | null
        }
        Insert: {
          address: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          distance_km?: number | null
          distributor_id: string
          district?: string | null
          id?: string
          is_default?: boolean | null
          party_id: string
          pincode?: string | null
          ship_to?: string | null
          state: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          distance_km?: number | null
          distributor_id?: string
          district?: string | null
          id?: string
          is_default?: boolean | null
          party_id?: string
          pincode?: string | null
          ship_to?: string | null
          state?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_delivery_addresses_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_delivery_addresses_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      party_groups: {
        Row: {
          code: string | null
          created_at: string
          distributor_id: string
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          distributor_id: string
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_groups_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "party_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_name: string | null
          cheque_date: string | null
          cheque_number: string | null
          created_at: string
          created_by: string | null
          distributor_id: string
          id: string
          invoice_id: string | null
          notes: string | null
          party_id: string
          payment_date: string
          payment_mode: string | null
          payment_type: string
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_name?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          distributor_id: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          party_id: string
          payment_date?: string
          payment_mode?: string | null
          payment_type: string
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          distributor_id?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          party_id?: string
          payment_date?: string
          payment_mode?: string | null
          payment_type?: string
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      price_structure_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          mrp: number | null
          price: number | null
          structure_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          mrp?: number | null
          price?: number | null
          structure_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          mrp?: number | null
          price?: number | null
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_structure_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_structure_items_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "price_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      price_structures: {
        Row: {
          created_at: string
          discount_percent: number | null
          distributor_id: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          discount_percent?: number | null
          distributor_id: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          discount_percent?: number | null
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_structures_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          cgst_amount: number | null
          cgst_percent: number | null
          created_at: string | null
          discount_amount: number | null
          discount_percent: number | null
          gst_percent: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          igst_percent: number | null
          item_id: string | null
          item_name: string
          net_amount: number | null
          price: number
          purchase_order_id: string
          quantity: number
          remark: string | null
          sgst_amount: number | null
          sgst_percent: number | null
          sort_order: number | null
          taxable_amount: number | null
          unit: string
        }
        Insert: {
          cgst_amount?: number | null
          cgst_percent?: number | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          gst_percent?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          igst_percent?: number | null
          item_id?: string | null
          item_name: string
          net_amount?: number | null
          price?: number
          purchase_order_id: string
          quantity?: number
          remark?: string | null
          sgst_amount?: number | null
          sgst_percent?: number | null
          sort_order?: number | null
          taxable_amount?: number | null
          unit?: string
        }
        Update: {
          cgst_amount?: number | null
          cgst_percent?: number | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          gst_percent?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          igst_percent?: number | null
          item_id?: string | null
          item_name?: string
          net_amount?: number | null
          price?: number
          purchase_order_id?: string
          quantity?: number
          remark?: string | null
          sgst_amount?: number | null
          sgst_percent?: number | null
          sort_order?: number | null
          taxable_amount?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          cgst_amount: number | null
          contact_number: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          delivery_address: string | null
          distributor_id: string
          gst_type: number | null
          id: string
          igst_amount: number | null
          net_amount: number | null
          party_gstin: string | null
          party_id: string
          po_date: string
          po_full_number: string
          po_number: number
          po_prefix: string | null
          remark: string | null
          round_off_amount: number | null
          sgst_amount: number | null
          status: string | null
          taxable_amount: number | null
          terms_conditions: Json | null
          transport_name: string | null
          updated_at: string | null
        }
        Insert: {
          cgst_amount?: number | null
          contact_number?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_address?: string | null
          distributor_id: string
          gst_type?: number | null
          id?: string
          igst_amount?: number | null
          net_amount?: number | null
          party_gstin?: string | null
          party_id: string
          po_date?: string
          po_full_number: string
          po_number: number
          po_prefix?: string | null
          remark?: string | null
          round_off_amount?: number | null
          sgst_amount?: number | null
          status?: string | null
          taxable_amount?: number | null
          terms_conditions?: Json | null
          transport_name?: string | null
          updated_at?: string | null
        }
        Update: {
          cgst_amount?: number | null
          contact_number?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_address?: string | null
          distributor_id?: string
          gst_type?: number | null
          id?: string
          igst_amount?: number | null
          net_amount?: number | null
          party_gstin?: string | null
          party_id?: string
          po_date?: string
          po_full_number?: string
          po_number?: number
          po_prefix?: string | null
          remark?: string | null
          round_off_amount?: number | null
          sgst_amount?: number | null
          status?: string | null
          taxable_amount?: number | null
          terms_conditions?: Json | null
          transport_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      sac_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          gst_rate: number | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          gst_rate?: number | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          gst_rate?: number | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      sales_zones: {
        Row: {
          created_at: string
          description: string | null
          distributor_id: string
          id: string
          is_active: boolean | null
          name: string
          remark: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          distributor_id: string
          id?: string
          is_active?: boolean | null
          name: string
          remark?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          remark?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_zones_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salespersons: {
        Row: {
          commission_percent: number | null
          created_at: string
          distributor_id: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_percent?: number | null
          created_at?: string
          distributor_id: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_percent?: number | null
          created_at?: string
          distributor_id?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salespersons_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          distributor_id: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          distributor_id: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          distributor_id?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_number: string | null
          created_at: string
          distributor_id: string
          id: string
          item_id: string
          location_id: string | null
          movement_type: string
          new_stock: number
          notes: string | null
          previous_stock: number
          quantity: number
          rate: number | null
          reference_id: string | null
          reference_number: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          distributor_id: string
          id?: string
          item_id: string
          location_id?: string | null
          movement_type: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          quantity: number
          rate?: number | null
          reference_id?: string | null
          reference_number?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          distributor_id?: string
          id?: string
          item_id?: string
          location_id?: string | null
          movement_type?: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          quantity?: number
          rate?: number | null
          reference_id?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      store_locations: {
        Row: {
          created_at: string
          distributor_id: string
          id: string
          is_final_location: boolean
          location: string
          parent_store_id: string | null
          remark: string | null
          store_level: number
          store_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distributor_id: string
          id?: string
          is_final_location?: boolean
          location: string
          parent_store_id?: string | null
          remark?: string | null
          store_level?: number
          store_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distributor_id?: string
          id?: string
          is_final_location?: boolean
          location?: string
          parent_store_id?: string | null
          remark?: string | null
          store_level?: number
          store_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_locations_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_locations_parent_store_id_fkey"
            columns: ["parent_store_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_class: {
        Row: {
          class_code: string
          class_name: string
          class_type: string
          created_at: string | null
          distributor_id: string
          expense_name: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          ledger_name: string | null
          tax_name: string | null
          updated_at: string | null
        }
        Insert: {
          class_code: string
          class_name: string
          class_type: string
          created_at?: string | null
          distributor_id: string
          expense_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          ledger_name?: string | null
          tax_name?: string | null
          updated_at?: string | null
        }
        Update: {
          class_code?: string
          class_name?: string
          class_type?: string
          created_at?: string | null
          distributor_id?: string
          expense_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          ledger_name?: string | null
          tax_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_class_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_master: {
        Row: {
          add_deduct: string | null
          calculation_type: string
          created_at: string | null
          distributor_id: string
          id: string
          is_active: boolean | null
          ledger_name: string | null
          tax_name: string
          tax_type: string
          updated_at: string | null
        }
        Insert: {
          add_deduct?: string | null
          calculation_type: string
          created_at?: string | null
          distributor_id: string
          id?: string
          is_active?: boolean | null
          ledger_name?: string | null
          tax_name: string
          tax_type: string
          updated_at?: string | null
        }
        Update: {
          add_deduct?: string | null
          calculation_type?: string
          created_at?: string | null
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          ledger_name?: string | null
          tax_name?: string
          tax_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_master_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          conditions: string
          created_at: string | null
          distributor_id: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          conditions: string
          created_at?: string | null
          distributor_id: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          conditions?: string
          created_at?: string | null
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terms_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transports: {
        Row: {
          address: string | null
          created_at: string | null
          distributor_id: string
          id: string
          is_active: boolean | null
          transport_id: string
          transport_name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          distributor_id: string
          id?: string
          is_active?: boolean | null
          transport_id: string
          transport_name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          transport_id?: string
          transport_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transports_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          inviter_id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          inviter_id: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          inviter_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      voucher_items: {
        Row: {
          amount: number
          application: string | null
          brand_clearance: string | null
          cess_amount: number | null
          cess_percent: number | null
          cgst_amount: number | null
          created_at: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          failure_cause: string | null
          fitment_tools: string | null
          gst_percent: number | null
          how_old_mfg: string | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          item_id: string | null
          item_name: string
          item_sku: string | null
          line_order: number | null
          notes: string | null
          old_bearing_life: string | null
          place_of_fitment: string | null
          quantity: number | null
          rate: number | null
          remarks: string | null
          sgst_amount: number | null
          shaft_housing: string | null
          taxable_amount: number | null
          total_amount: number | null
          unit: string | null
          unit_price: number | null
          voucher_id: string
          weather_effect: string | null
        }
        Insert: {
          amount?: number
          application?: string | null
          brand_clearance?: string | null
          cess_amount?: number | null
          cess_percent?: number | null
          cgst_amount?: number | null
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          failure_cause?: string | null
          fitment_tools?: string | null
          gst_percent?: number | null
          how_old_mfg?: string | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          item_id?: string | null
          item_name: string
          item_sku?: string | null
          line_order?: number | null
          notes?: string | null
          old_bearing_life?: string | null
          place_of_fitment?: string | null
          quantity?: number | null
          rate?: number | null
          remarks?: string | null
          sgst_amount?: number | null
          shaft_housing?: string | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
          voucher_id: string
          weather_effect?: string | null
        }
        Update: {
          amount?: number
          application?: string | null
          brand_clearance?: string | null
          cess_amount?: number | null
          cess_percent?: number | null
          cgst_amount?: number | null
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          failure_cause?: string | null
          fitment_tools?: string | null
          gst_percent?: number | null
          how_old_mfg?: string | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          item_id?: string | null
          item_name?: string
          item_sku?: string | null
          line_order?: number | null
          notes?: string | null
          old_bearing_life?: string | null
          place_of_fitment?: string | null
          quantity?: number | null
          rate?: number | null
          remarks?: string | null
          sgst_amount?: number | null
          shaft_housing?: string | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
          voucher_id?: string
          weather_effect?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voucher_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_items_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_number_sequences: {
        Row: {
          created_at: string | null
          financial_year: string
          id: string
          last_number: number | null
          prefix_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          financial_year: string
          id?: string
          last_number?: number | null
          prefix_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          financial_year?: string
          id?: string
          last_number?: number | null
          prefix_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voucher_number_sequences_prefix_id_fkey"
            columns: ["prefix_id"]
            isOneToOne: false
            referencedRelation: "voucher_prefixes"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_prefixes: {
        Row: {
          auto_start_no: number | null
          created_at: string | null
          distributor_id: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          prefix_separator: string | null
          updated_at: string | null
          voucher_name: string
          voucher_prefix: string
          year_format: string | null
        }
        Insert: {
          auto_start_no?: number | null
          created_at?: string | null
          distributor_id: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          prefix_separator?: string | null
          updated_at?: string | null
          voucher_name: string
          voucher_prefix: string
          year_format?: string | null
        }
        Update: {
          auto_start_no?: number | null
          created_at?: string | null
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          prefix_separator?: string | null
          updated_at?: string | null
          voucher_name?: string
          voucher_prefix?: string
          year_format?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voucher_prefixes_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          address: string | null
          apply_round_off: boolean | null
          attachment_url: string | null
          cess_amount: number | null
          cgst_amount: number | null
          city: string | null
          cn_type: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          customer_po_date: string | null
          customer_po_number: string | null
          delivery_date: string | null
          discount_amount: number | null
          discount_percent: number | null
          distributor_id: string
          dn_number: number | null
          dn_prefix: string | null
          dn_type: string | null
          doc_number: number | null
          doc_prefix: string | null
          due_date: string | null
          einv_ack_no: string | null
          eligibility_itc: string | null
          ewb_date: string | null
          ewb_no: string | null
          gst_number: string | null
          gst_type: string | null
          id: string
          igst_amount: number | null
          inv_date: string | null
          inv_number: string | null
          inv_prefix: string | null
          invoice_date: string | null
          invoice_number: string | null
          liability_expense_hd: string | null
          lr_number: string | null
          memo_type: string | null
          narration: string | null
          parent_voucher_id: string | null
          party_balance: number | null
          party_gstin: string | null
          party_id: string | null
          party_name: string | null
          party_turnover: number | null
          pincode: string | null
          po_challan_number: string | null
          po_number: string | null
          reference_by: string | null
          reference_number: string | null
          reference_voucher_id: string | null
          round_off: number | null
          sales_executive_id: string | null
          sgst_amount: number | null
          ship_to: string | null
          source_enquiry_id: string | null
          state: string | null
          status: string | null
          subtotal: number | null
          taxable_amount: number | null
          tcs_amount: number | null
          tcs_percent: number | null
          tds_amount: number | null
          tds_percent: number | null
          terms_conditions: Json | null
          total_amount: number
          total_tax: number | null
          transport_name: string | null
          updated_at: string | null
          valid_till: string | null
          voucher_date: string
          voucher_number: string
          voucher_type: Database["public"]["Enums"]["voucher_type"]
        }
        Insert: {
          address?: string | null
          apply_round_off?: boolean | null
          attachment_url?: string | null
          cess_amount?: number | null
          cgst_amount?: number | null
          city?: string | null
          cn_type?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_po_date?: string | null
          customer_po_number?: string | null
          delivery_date?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          distributor_id: string
          dn_number?: number | null
          dn_prefix?: string | null
          dn_type?: string | null
          doc_number?: number | null
          doc_prefix?: string | null
          due_date?: string | null
          einv_ack_no?: string | null
          eligibility_itc?: string | null
          ewb_date?: string | null
          ewb_no?: string | null
          gst_number?: string | null
          gst_type?: string | null
          id?: string
          igst_amount?: number | null
          inv_date?: string | null
          inv_number?: string | null
          inv_prefix?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          liability_expense_hd?: string | null
          lr_number?: string | null
          memo_type?: string | null
          narration?: string | null
          parent_voucher_id?: string | null
          party_balance?: number | null
          party_gstin?: string | null
          party_id?: string | null
          party_name?: string | null
          party_turnover?: number | null
          pincode?: string | null
          po_challan_number?: string | null
          po_number?: string | null
          reference_by?: string | null
          reference_number?: string | null
          reference_voucher_id?: string | null
          round_off?: number | null
          sales_executive_id?: string | null
          sgst_amount?: number | null
          ship_to?: string | null
          source_enquiry_id?: string | null
          state?: string | null
          status?: string | null
          subtotal?: number | null
          taxable_amount?: number | null
          tcs_amount?: number | null
          tcs_percent?: number | null
          tds_amount?: number | null
          tds_percent?: number | null
          terms_conditions?: Json | null
          total_amount?: number
          total_tax?: number | null
          transport_name?: string | null
          updated_at?: string | null
          valid_till?: string | null
          voucher_date?: string
          voucher_number: string
          voucher_type: Database["public"]["Enums"]["voucher_type"]
        }
        Update: {
          address?: string | null
          apply_round_off?: boolean | null
          attachment_url?: string | null
          cess_amount?: number | null
          cgst_amount?: number | null
          city?: string | null
          cn_type?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_po_date?: string | null
          customer_po_number?: string | null
          delivery_date?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          distributor_id?: string
          dn_number?: number | null
          dn_prefix?: string | null
          dn_type?: string | null
          doc_number?: number | null
          doc_prefix?: string | null
          due_date?: string | null
          einv_ack_no?: string | null
          eligibility_itc?: string | null
          ewb_date?: string | null
          ewb_no?: string | null
          gst_number?: string | null
          gst_type?: string | null
          id?: string
          igst_amount?: number | null
          inv_date?: string | null
          inv_number?: string | null
          inv_prefix?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          liability_expense_hd?: string | null
          lr_number?: string | null
          memo_type?: string | null
          narration?: string | null
          parent_voucher_id?: string | null
          party_balance?: number | null
          party_gstin?: string | null
          party_id?: string | null
          party_name?: string | null
          party_turnover?: number | null
          pincode?: string | null
          po_challan_number?: string | null
          po_number?: string | null
          reference_by?: string | null
          reference_number?: string | null
          reference_voucher_id?: string | null
          round_off?: number | null
          sales_executive_id?: string | null
          sgst_amount?: number | null
          ship_to?: string | null
          source_enquiry_id?: string | null
          state?: string | null
          status?: string | null
          subtotal?: number | null
          taxable_amount?: number | null
          tcs_amount?: number | null
          tcs_percent?: number | null
          tds_amount?: number | null
          tds_percent?: number | null
          terms_conditions?: Json | null
          total_amount?: number
          total_tax?: number | null
          transport_name?: string | null
          updated_at?: string | null
          valid_till?: string | null
          voucher_date?: string
          voucher_number?: string
          voucher_type?: Database["public"]["Enums"]["voucher_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_parent_voucher_id_fkey"
            columns: ["parent_voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_reference_voucher_id_fkey"
            columns: ["reference_voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_sales_executive_id_fkey"
            columns: ["sales_executive_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_source_enquiry_id_fkey"
            columns: ["source_enquiry_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      credit_note_summary: {
        Row: {
          cn_type: string | null
          distributor_id: string | null
          gst_type: string | null
          month: string | null
          total_amount: number | null
          total_cgst: number | null
          total_credit_notes: number | null
          total_igst: number | null
          total_round_off: number | null
          total_sgst: number | null
          total_subtotal: number | null
          total_tax: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string | null
          email: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          tenant_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      view_available_packing_stock: {
        Row: {
          available_quantity: number | null
          batch_number: string | null
          item_id: string | null
          location_id: string | null
          marked_quantity: number | null
          packed_quantity: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marking_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marking_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      view_batch_stock_ledger: {
        Row: {
          batch_number: string | null
          distributor_id: string | null
          item_id: string | null
          location_id: string | null
          quantity: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      view_stock_ledger: {
        Row: {
          current_stock: number | null
          distributor_id: string | null
          item_id: string | null
          item_name: string | null
          last_updated: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      belongs_to_tenant: { Args: { p_tenant_id: string }; Returns: boolean }
      create_gate_inward_atomic: {
        Args: { p_header: Json; p_items: Json }
        Returns: Json
      }
      create_marking_atomic: {
        Args: { p_batches: Json; p_header: Json }
        Returns: Json
      }
      create_purchase_order_atomic: {
        Args: { p_header: Json; p_items: Json }
        Returns: Json
      }
      create_voucher_atomic:
        | { Args: { p_items: Json; p_voucher: Json }; Returns: Json }
        | {
            Args: { p_items: Json; p_ledgers?: Json; p_voucher: Json }
            Returns: Json
          }
      fn_get_next_mrk_number: {
        Args: { p_distributor_id: string; p_prefix?: string }
        Returns: number
      }
      fn_get_next_pck_number: {
        Args: { p_distributor_id: string; p_prefix?: string }
        Returns: number
      }
      generate_credit_note_number: {
        Args: { p_distributor_id: string; p_prefix?: string }
        Returns: {
          doc_number: number
          full_number: string
        }[]
      }
      generate_invoice_number: {
        Args: {
          p_distributor_id: string
          p_invoice_type: string
          p_prefix?: string
        }
        Returns: string
      }
      generate_item_code: {
        Args: {
          p_category_id?: string
          p_distributor_id: string
          p_item_type: Database["public"]["Enums"]["item_type"]
        }
        Returns: string
      }
      generate_party_code: {
        Args: { p_distributor_id: string; p_party_type: string }
        Returns: string
      }
      generate_voucher_number:
        | {
            Args: { p_distributor_id: string; p_voucher_type: string }
            Returns: string
          }
        | {
            Args: {
              p_distributor_id: string
              p_prefix?: string
              p_voucher_type: Database["public"]["Enums"]["voucher_type"]
            }
            Returns: string
          }
      get_category_children: {
        Args: { p_parent_id: string }
        Returns: {
          category_type: Database["public"]["Enums"]["category_type"]
          children_count: number
          id: string
          is_final: boolean
          is_returnable: boolean
          items_count: number
          name: string
          parent_id: string
          remark: string
        }[]
      }
      get_category_hierarchy: {
        Args: { p_category_id: string }
        Returns: {
          id: string
          level: number
          name: string
        }[]
      }
      get_current_financial_year: { Args: never; Returns: string }
      get_next_gi_number: {
        Args: { p_distributor_id: string }
        Returns: string
      }
      get_next_gi_number_preview: {
        Args: { p_distributor_id: string; p_prefix: string }
        Returns: number
      }
      get_next_mrk_number: {
        Args: { p_distributor_id: string; p_prefix: string }
        Returns: number
      }
      get_next_po_number: {
        Args: { p_distributor_id: string; p_prefix: string }
        Returns: number
      }
      get_next_voucher_number_preview: {
        Args: { p_distributor_id: string; p_prefix: string }
        Returns: number
      }
      get_party_closing_balance: {
        Args: { p_party_id: string }
        Returns: number
      }
      get_party_turnover: {
        Args: { p_distributor_id: string; p_party_id: string }
        Returns: number
      }
      get_salesperson_distributor_id: { Args: never; Returns: string }
      get_user_distributor_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      get_voucher_prefixes_for_type: {
        Args: { p_distributor_id: string; p_voucher_name: string }
        Returns: {
          id: string
          is_default: boolean
          next_number: string
          prefix_separator: string
          voucher_prefix: string
          year_format: string
        }[]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_document_number: {
        Args: {
          p_distributor_id: string
          p_prefix?: string
          p_voucher_name: string
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_salesperson: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      is_superadmin_user: { Args: never; Returns: boolean }
      is_tenant_superadmin: { Args: { p_tenant_id: string }; Returns: boolean }
      preview_next_document_number: {
        Args: {
          p_distributor_id: string
          p_prefix?: string
          p_voucher_name: string
        }
        Returns: string
      }
      recalculate_ledger_balance: {
        Args: { p_ledger_id: string }
        Returns: number
      }
      seed_default_ledgers: {
        Args: { p_distributor_id: string }
        Returns: undefined
      }
      seed_default_voucher_prefixes: {
        Args: { p_distributor_id: string }
        Returns: undefined
      }
      validate_invoice_stock: {
        Args: { p_items: Json }
        Returns: {
          error_message: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "distributor" | "salesperson" | "superadmin"
      category_type: "product" | "service" | "both"
      invoice_status: "draft" | "confirmed" | "cancelled"
      invoice_type: "sale" | "purchase" | "sale_return" | "purchase_return"
      item_type: "product" | "service"
      ledger_entry_type:
        | "sale"
        | "purchase"
        | "receipt"
        | "payment"
        | "sale_return"
        | "purchase_return"
        | "opening"
        | "adjustment"
      ledger_nature:
        | "assets"
        | "liabilities"
        | "income"
        | "expenses"
        | "capital"
      party_type: "customer" | "supplier" | "both"
      payment_mode: "cash" | "bank" | "cheque" | "upi" | "card" | "other"
      payment_status: "unpaid" | "partial" | "paid"
      payment_type: "receipt" | "payment"
      stock_movement_type:
        | "sale"
        | "purchase"
        | "sale_return"
        | "purchase_return"
        | "adjustment"
        | "opening"
      voucher_status: "draft" | "confirmed" | "cancelled"
      voucher_type:
        | "purchase_invoice"
        | "debit_note"
        | "tax_invoice"
        | "credit_note"
        | "receipt_voucher"
        | "journal_entry"
        | "gst_payment"
        | "tcs_tds_payment"
        | "gst_journal"
        | "gst_havala"
        | "havala"
        | "payment_voucher"
        | "sales_enquiry"
        | "sales_quotation"
        | "sales_order"
        | "delivery_challan"
        | "purchase_order"
        | "sales_invoice"
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
      app_role: ["admin", "distributor", "salesperson", "superadmin"],
      category_type: ["product", "service", "both"],
      invoice_status: ["draft", "confirmed", "cancelled"],
      invoice_type: ["sale", "purchase", "sale_return", "purchase_return"],
      item_type: ["product", "service"],
      ledger_entry_type: [
        "sale",
        "purchase",
        "receipt",
        "payment",
        "sale_return",
        "purchase_return",
        "opening",
        "adjustment",
      ],
      ledger_nature: ["assets", "liabilities", "income", "expenses", "capital"],
      party_type: ["customer", "supplier", "both"],
      payment_mode: ["cash", "bank", "cheque", "upi", "card", "other"],
      payment_status: ["unpaid", "partial", "paid"],
      payment_type: ["receipt", "payment"],
      stock_movement_type: [
        "sale",
        "purchase",
        "sale_return",
        "purchase_return",
        "adjustment",
        "opening",
      ],
      voucher_status: ["draft", "confirmed", "cancelled"],
      voucher_type: [
        "purchase_invoice",
        "debit_note",
        "tax_invoice",
        "credit_note",
        "receipt_voucher",
        "journal_entry",
        "gst_payment",
        "tcs_tds_payment",
        "gst_journal",
        "gst_havala",
        "havala",
        "payment_voucher",
        "sales_enquiry",
        "sales_quotation",
        "sales_order",
        "delivery_challan",
        "purchase_order",
        "sales_invoice",
      ],
    },
  },
} as const
