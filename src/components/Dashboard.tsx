import React, { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Package, Users, AlertTriangle, ShoppingCart, Calendar, TrendingDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface DashboardStats {
  totalSales: number
  todaySales: number
  totalProducts: number
  lowStockItems: number
  totalCustomers: number
  pendingSales: number
  totalCategories: number
  totalSuppliers: number
}

interface RecentSale {
  id: string
  total_amount: number
  created_at: string
  customer?: { name: string }
}

interface LowStockProduct {
  id: string
  name: string
  quantity: number
  min_stock: number
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    todaySales: 0,
    totalProducts: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    pendingSales: 0,
    totalCategories: 0,
    totalSuppliers: 0
  })
  const [loading, setLoading] = useState(true)
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Fetch sales data
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount, created_at, status')

      // Fetch recent sales with customer info
      const { data: recentSalesData } = await supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          created_at,
          customer:customers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      // Fetch categories count
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })

      // Fetch suppliers count
      const { count: suppliersCount } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })

      // Fetch low stock items
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          quantity,
          min_stock,
          product:products(id, name)
        `)

      if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError)
      }

      // Process low stock items
      const lowStockItems = inventoryData 
        ? inventoryData.filter(item => item.quantity < item.min_stock)
        : []

      const lowStockProducts = lowStockItems.map(item => ({
        id: item.product?.id || '',
        name: item.product?.name || '',
        quantity: item.quantity,
        min_stock: item.min_stock
      }))

      if (salesData) {
        const totalSales = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
        const todaySales = salesData
          .filter(sale => new Date(sale.created_at) >= today)
          .reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
        const pendingSales = salesData.filter(sale => sale.status === 'pending').length

        setStats({
          totalSales,
          todaySales,
          totalProducts: productsCount || 0,
          lowStockItems: lowStockItems.length,
          totalCustomers: customersCount || 0,
          pendingSales,
          totalCategories: categoriesCount || 0,
          totalSuppliers: suppliersCount || 0
        })
      }

      setRecentSales(recentSalesData || [])
      setLowStockProducts(lowStockProducts)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSales)}</p>
              <p className="text-xs text-gray-500 mt-1">Acumulado</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todaySales)}</p>
              <p className="text-xs text-gray-500 mt-1">Día actual</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Productos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              <p className="text-xs text-gray-500 mt-1">En catálogo</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
              <p className="text-xs text-gray-500 mt-1">Requieren atención</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categorías</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
            </div>
            <div className="p-3 bg-pink-100 rounded-full">
              <Package className="h-6 w-6 text-pink-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Proveedores</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSuppliers}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingSales}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Ventas Recientes</h3>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            {recentSales.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay ventas recientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">
                          {sale.customer?.name || 'Cliente general'}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(sale.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(sale.total_amount)}</p>
                      <p className="text-sm text-gray-500">#{sale.id.slice(-6)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Productos con Stock Bajo</h3>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <div className="p-6">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Todos los productos tienen stock suficiente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-red-600">
                          Stock actual: {product.quantity} (Mínimo: {product.min_stock})
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Crítico
                      </span>
                    </div>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    Y {lowStockProducts.length - 5} productos más...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.hash = '#new-sale'}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 p-4 rounded-lg transition-all duration-200 flex items-center"
          >
            <ShoppingCart className="h-6 w-6 mr-3" />
            <span>Nueva Venta</span>
          </button>
          <button
            onClick={() => window.location.hash = '#products'}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 p-4 rounded-lg transition-all duration-200 flex items-center"
          >
            <Package className="h-6 w-6 mr-3" />
            <span>Gestionar Productos</span>
          </button>
          <button
            onClick={() => window.location.hash = '#reports'}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 p-4 rounded-lg transition-all duration-200 flex items-center"
          >
            <TrendingUp className="h-6 w-6 mr-3" />
            <span>Ver Reportes</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard