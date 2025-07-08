import React, { useState } from 'react'
import Layout from './components/Layout'
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
        return <Inventory />
      case 'cash-register':
        return <CashRegister />
      case 'reports':
        return <Reports />
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