import React, { useState, useEffect, Suspense, lazy } from 'react'
import Layout from './components/Layout'
import Auth from './components/Auth'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

// Lazy loading de componentes para mejorar rendimiento
const Dashboard = lazy(() => import('./components/Dashboard'))
const NewSale = lazy(() => import('./components/NewSale'))
const Sales = lazy(() => import('./components/Sales'))
const Products = lazy(() => import('./components/Products'))
const Customers = lazy(() => import('./components/Customers'))
const Suppliers = lazy(() => import('./components/Suppliers'))
const Categories = lazy(() => import('./components/Categories'))
const Reports = lazy(() => import('./components/Reports'))
const Inventory = lazy(() => import('./components/Inventory'))
const CashRegister = lazy(() => import('./components/CashRegister'))
const Employees = lazy(() => import('./components/Employees'))
const Settings = lazy(() => import('./components/Settings'))

// Componente de loading optimizado
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
)

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderPage = React.useMemo(() => {
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
  }, [currentPage])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    .catch(() => {
      // Handle authentication errors by clearing session and forcing re-authentication
      supabase.auth.signOut()
      setUser(null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle sign out events and token refresh failures
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null)
      } else if (event === 'SIGNED_IN') {
        setUser(session?.user ?? null)
      } else {
        setUser(session?.user ?? null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthSuccess = React.useCallback(() => {
    // Auth state change listener handles setting the user
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
      <Suspense fallback={<LoadingSpinner />}>
        {renderPage}
      </Suspense>
    </Layout>
  )
}

export default App