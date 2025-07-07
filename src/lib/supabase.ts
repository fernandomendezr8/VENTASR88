import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for our database schema
export interface Category {
  id: string
  name: string
  description: string
  created_at: string
}

export interface Supplier {
  id: string
  name: string
  contact_person: string
  phone: string
  email: string
  address: string
  created_at: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  cost: number
  sku: string
  category_id: string
  supplier_id: string
  is_active: boolean
  created_at: string
  category?: Category
  supplier?: Supplier
  inventory?: { quantity: number }[]
}

export interface InventoryItem {
  id: string
  product_id: string
  quantity: number
  min_stock: number
  max_stock: number
  updated_at: string
  product?: Product
}

export interface Sale {
  id: string
  customer_id: string
  subtotal: number
  discount: number
  tax: number
  total_amount: number
  status: 'pending' | 'completed' | 'cancelled'
  payment_method: 'cash' | 'card' | 'transfer'
  created_at: string
  customer?: Customer
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  product?: Product
}

export interface CashRegister {
  id: string
  type: 'sale' | 'expense' | 'deposit' | 'withdrawal'
  amount: number
  description: string
  reference_id: string
  created_at: string
}