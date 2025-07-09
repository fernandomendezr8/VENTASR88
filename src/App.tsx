import React, { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Auth from './components/Auth'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'
import Dashboard from './components/Dashboard'
import NewSale from './components/NewSale'
import Sales from './components/Sales'
import Products from './components/Products'
import Customers from './components/Customers'
import Suppliers from './components/Suppliers'
import Categories from './components/Categories'
import Reports from './components/Reports'
import Inventory from './components/Inventory'
import CashRegister from './components/CashRegister'
import Employees from './components/Employees'
import Settings from './components/Settings'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'new-sale':
        return <NewSale />
      case 'sales':
        return <Sales />
      case 'products':
        return <Products />
      case 'categories':
        return <Categories />
      case 'suppliers':
        return <Suppliers />
      case 'customers':
        return <Customers />
      case 'inventory':
        return <Inventory />
      case 'cash-register':
        return <CashRegister />
      case 'reports':
        return <Reports />
      case 'employees':
        return <Employees />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    .catch((error) => {
      // Handle invalid refresh token errors
      if (error.message && error.message.includes('Invalid Refresh Token')) {
        // Clear invalid session data and force re-authentication
        supabase.auth.signOut()
        setUser(null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthSuccess = () => {
    // The auth state change listener will handle setting the user
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <Layout 
      currentPage={currentPage} 
      onPageChange={setCurrentPage}
      user={user}
      onLogout={() => supabase.auth.signOut()}
    >
      {renderPage()}
    </Layout>
  )
}

export default App