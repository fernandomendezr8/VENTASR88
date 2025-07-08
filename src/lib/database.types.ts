export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          cost: number
          sku: string | null
          category_id: string | null
          supplier_id: string | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price?: number
          cost?: number
          sku?: string | null
          category_id?: string | null
          supplier_id?: string | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          cost?: number
          sku?: string | null
          category_id?: string | null
          supplier_id?: string | null
          is_active?: boolean | null
          created_at?: string
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
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory: {
        Row: {
          id: string
          product_id: string | null
          quantity: number | null
          min_stock: number | null
          max_stock: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          quantity?: number | null
          min_stock?: number | null
          max_stock?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          quantity?: number | null
          min_stock?: number | null
          max_stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      sales: {
        Row: {
          id: string
          customer_id: string | null
          subtotal: number | null
          discount: number | null
          tax: number | null
          total_amount: number
          status: string | null
          payment_method: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          subtotal?: number | null
          discount?: number | null
          tax?: number | null
          total_amount?: number
          status?: string | null
          payment_method?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          subtotal?: number | null
          discount?: number | null
          tax?: number | null
          total_amount?: number
          status?: string | null
          payment_method?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string | null
          product_id: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id?: string | null
          product_id?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string | null
          product_id?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          }
        ]
      }
      cash_register: {
        Row: {
          id: string
          type: string
          amount: number
          description: string | null
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          amount?: number
          description?: string | null
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          amount?: number
          description?: string | null
          reference_id?: string | null
          created_at?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}