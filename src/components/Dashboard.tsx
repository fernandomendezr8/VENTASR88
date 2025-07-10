import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { TrendingUp, DollarSign, Package, Users, AlertTriangle, ShoppingCart, Calendar, TrendingDown, BarChart3, PieChart, Activity } from 'lucide-react'
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

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Ejecutar consultas en paralelo para mejor rendimiento
      const [
        salesResult,
        recentSalesResult,
        productsResult,
        customersResult,
        categoriesResult,
        suppliersResult,
        inventoryResult
      ] = await Promise.all([
        supabase.from('sales').select('total_amount, created_at, status'),
        supabase.from('sales').select('id, total_amount, created_at, customer:customers(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('suppliers').select('*', { count: 'exact', head: true }),
        supabase.from('inventory').select('quantity, min_stock, product:products(id, name)')
      ])

      // Procesar datos de forma más eficiente
      const salesData = salesResult.data || []
      const lowStockItems = inventoryResult.data?.filter(item => item.quantity < item.min_stock) || []
      const lowStockProducts = lowStockItems.map(item => ({
        id: item.product?.id || '',
        name: item.product?.name || '',
        quantity: item.quantity,
        min_stock: item.min_stock
      }))

      const totalSales = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const todaySales = salesData
        .filter(sale => new Date(sale.created_at) >= today)
        .reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const pendingSales = salesData.filter(sale => sale.status === 'pending').length

      setStats({
        totalSales,
        todaySales,
        totalProducts: productsResult.count || 0,
        lowStockItems: lowStockItems.length,
        totalCustomers: customersResult.count || 0,
        pendingSales,
        totalCategories: categoriesResult.count || 0,
        totalSuppliers: suppliersResult.count || 0
      })

      setRecentSales(recentSalesResult.data || [])
      setLowStockProducts(lowStockProducts)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const formatCurrency = useMemo(() => (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'COP'
    }).format(amount)
  }, [])

  const formatDate = useMemo(() => (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 lg:p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-blue-100 text-sm font-medium">Ventas Totales</p>
              <p className="text-xl lg:text-2xl font-bold truncate">{formatCurrency(stats.totalSales)}</p>
              <p className="text-blue-100 text-xs mt-1">Acumulado</p>
            </div>
            <div className="p-3 bg-blue-400 bg-opacity-30 rounded-full flex-shrink-0">
              <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 lg:p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-green-100 text-sm font-medium">Ventas Hoy</p>
              <p className="text-xl lg:text-2xl font-bold truncate">{formatCurrency(stats.todaySales)}</p>
              <p className="text-green-100 text-xs mt-1">Día actual</p>
            </div>
            <div className="p-3 bg-green-400 bg-opacity-30 rounded-full flex-shrink-0">
              <DollarSign className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 lg:p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-purple-100 text-sm font-medium">Total Productos</p>
              <p className="text-xl lg:text-2xl font-bold">{stats.totalProducts}</p>
              <p className="text-purple-100 text-xs mt-1">En catálogo</p>
            </div>
            <div className="p-3 bg-purple-400 bg-opacity-30 rounded-full flex-shrink-0">
              <Package className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 lg:p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-red-100 text-sm font-medium">Stock Bajo</p>
              <p className="text-xl lg:text-2xl font-bold">{stats.lowStockItems}</p>
              <p className="text-red-100 text-xs mt-1">Requieren atención</p>
            </div>
            <div className="p-3 bg-red-400 bg-opacity-30 rounded-full flex-shrink-0">
              <AlertTriangle className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">Clientes</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full flex-shrink-0">
              <Users className="h-5 w-5 lg:h-6 lg:w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">Categorías</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
            </div>
            <div className="p-3 bg-pink-100 rounded-full flex-shrink-0">
              <Package className="h-5 w-5 lg:h-6 lg:w-6 text-pink-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">Proveedores</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.totalSuppliers}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full flex-shrink-0">
              <Users className="h-5 w-5 lg:h-6 lg:w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.pendingSales}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full flex-shrink-0">
              <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 lg:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Ventas Recientes</h3>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-4 lg:p-6">
            {recentSales.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay ventas recientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0 h-8 w-8 lg:h-10 lg:w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                      </div>
                      <div className="ml-3 lg:ml-4 min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {sale.customer?.name || 'Cliente general'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{formatDate(sale.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
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
          <div className="p-4 lg:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Productos con Stock Bajo</h3>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <div className="p-4 lg:p-6">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Todos los productos tienen stock suficiente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 lg:p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0 h-8 w-8 lg:h-10 lg:w-10 bg-red-100 rounded-full flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 lg:h-5 lg:w-5 text-red-600" />
                      </div>
                      <div className="ml-3 lg:ml-4 min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-sm text-red-600">
                          Stock: {product.quantity} (Mín: {product.min_stock})
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
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
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          <button
            onClick={() => window.location.hash = '#new-sale'}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 p-3 lg:p-4 rounded-lg transition-all duration-200 flex items-center"
          >
            <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6 mr-3 flex-shrink-0" />
            <span className="font-medium">Nueva Venta</span>
          </button>
          <button
            onClick={() => window.location.hash = '#products'}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 p-3 lg:p-4 rounded-lg transition-all duration-200 flex items-center"
          >
            <Package className="h-5 w-5 lg:h-6 lg:w-6 mr-3 flex-shrink-0" />
            <span className="font-medium">Gestionar Productos</span>
          </button>
          <button
            onClick={() => window.location.hash = '#reports'}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 p-3 lg:p-4 rounded-lg transition-all duration-200 flex items-center"
          >
            <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 mr-3 flex-shrink-0" />
            <span className="font-medium">Ver Reportes</span>
          </button>
        </div>
      </div>

      {/* Performance Metrics - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700">Rendimiento</h4>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ventas del mes</span>
              <span className="text-sm font-semibold text-green-600">+12%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Productos vendidos</span>
              <span className="text-sm font-semibold text-blue-600">+8%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Nuevos clientes</span>
              <span className="text-sm font-semibold text-purple-600">+15%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700">Análisis</h4>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ticket promedio</span>
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(45000)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Margen promedio</span>
              <span className="text-sm font-semibold text-gray-900">35%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rotación stock</span>
              <span className="text-sm font-semibold text-gray-900">2.3x</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700">Tendencias</h4>
            <PieChart className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Efectivo</span>
              <span className="text-sm font-semibold text-gray-900">65%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tarjeta</span>
              <span className="text-sm font-semibold text-gray-900">30%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Transferencia</span>
              <span className="text-sm font-semibold text-gray-900">5%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard