import React, { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import NewSale from './components/NewSale'
import Sales from './components/Sales'
import Products from './components/Products'
import Customers from './components/Customers'
import Suppliers from './components/Suppliers'
import Categories from './components/Categories'

function App() {
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
        return <div className="text-center py-12 text-gray-500">Módulo de Inventario - Próximamente</div>
      case 'cash-register':
        return <div className="text-center py-12 text-gray-500">Módulo de Caja - Próximamente</div>
      case 'reports':
        return <div className="text-center py-12 text-gray-500">Módulo de Reportes - Próximamente</div>
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

export default App