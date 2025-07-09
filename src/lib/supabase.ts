import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export interface UnitOfMeasure {
  id: string
  name: string
  abbreviation: string
  category: 'weight' | 'volume' | 'length' | 'area' | 'unit'
  created_at: string
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Types for our database tables
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
  cedula: string | null
  email: string | null
  phone: string | null
  address: string | null
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
  unit_of_measure_id: string
  is_active: boolean
  created_at: string
  image_url?: string
  image_alt?: string
  category?: Category
  supplier?: Supplier
  unit_of_measure?: UnitOfMeasure
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

export interface Employee {
  id: string
  user_id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'cashier' | 'viewer'
  permissions: Record<string, any>
  status: 'active' | 'inactive' | 'suspended'
  hire_date: string
  phone?: string
  address?: string
  salary?: number
  created_at: string
  updated_at: string
  created_by?: string
}

export interface UserPermissions {
  sales: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
  }
  products: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
  }
  inventory: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
  }
  customers: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
  }
  suppliers: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
  }
  categories: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
  }
  employees: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
  }
  reports: {
    read: boolean
  }
  cash_register: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
  }
  settings: {
    read: boolean
    update: boolean
  }
}

// Función para obtener los permisos del usuario actual
export const getCurrentUserPermissions = async (): Promise<UserPermissions | null> => {
  try {
    const { data, error } = await supabase.rpc('get_current_user_permissions')
    
    if (error) {
      console.error('Error getting user permissions:', error)
      return null
    }
    
    return data as UserPermissions
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return null
  }
}

// Función para verificar un permiso específico
export const checkPermission = async (module: string, action: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_permission', {
      module_name: module,
      action_name: action
    })
    
    if (error) {
      console.error('Error checking permission:', error)
      return false
    }
    
    return data as boolean
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

// Función para obtener el empleado actual
export const getCurrentEmployee = async (): Promise<Employee | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()
    
    if (error) {
      console.error('Error getting current employee:', error)
      return null
    }
    
    return data as Employee
  } catch (error) {
    console.error('Error getting current employee:', error)
    return null
  }
}