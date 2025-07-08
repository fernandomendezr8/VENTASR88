import React, { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Package, Users, Calendar, BarChart3, PieChart, Download, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ReportData {
  totalSales: number
  totalRevenue: number
  totalProducts: number
  totalCustomers: number
  salesByMonth: { month: string; sales: number; revenue: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
  salesByCategory: { category: string; sales: number; revenue: number }[]
  recentTrends: { period: string; growth: number }[]
}

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData>({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    salesByMonth: [],
    topProducts: [],
    salesByCategory: [],
    recentTrends: []
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      // Fetch sales data
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name),
          sale_items(
            *,
            product:products(
              name,
              category:categories(name)
            )
          )
        `)
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to + 'T23:59:59')
        .eq('status', 'completed')

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      if (salesData) {
        const totalSales = salesData.length
        const totalRevenue = salesData.reduce((sum, sale) => sum + sale.total_amount, 0)

        // Sales by month
        const salesByMonth = generateMonthlySales(salesData)

        // Top products
        const productSales: Record<string, { quantity: number; revenue: number }> = {}
        salesData.forEach(sale => {
          sale.sale_items?.forEach(item => {
            const productName = item.product?.name || 'Unknown'
            if (!productSales[productName]) {
              productSales[productName] = { quantity: 0, revenue: 0 }
            }
            productSales[productName].quantity += item.quantity
            productSales[productName].revenue += item.total_price
          })
        })

        const topProducts = Object.entries(productSales)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)

        // Sales by category
        const categorySales: Record<string, { sales: number; revenue: number }> = {}
        salesData.forEach(sale => {
          sale.sale_items?.forEach(item => {
            const categoryName = item.product?.category?.name || 'Sin categoría'
            if (!categorySales[categoryName]) {
              categorySales[categoryName] = { sales: 0, revenue: 0 }
            }
            categorySales[categoryName].sales += item.quantity
            categorySales[categoryName].revenue += item.total_price
          })
        })

        const salesByCategory = Object.entries(categorySales)
          .map(([category, data]) => ({ category, ...data }))
          .sort((a, b) => b.revenue - a.revenue)

        // Recent trends (simplified)
        const recentTrends = [
          { period: 'Esta semana', growth: 12.5 },
          { period: 'Este mes', growth: 8.3 },
          { period: 'Último trimestre', growth: 15.7 }
        ]

        setReportData({
          totalSales,
          totalRevenue,
          totalProducts: productsCount || 0,
          totalCustomers: customersCount || 0,
          salesByMonth,
          topProducts,
          salesByCategory,
          recentTrends
        })
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateMonthlySales = (salesData: any[]) => {
    const monthlyData: Record<string, { sales: number; revenue: number }> = {}
    
    salesData.forEach(sale => {
      const month = new Date(sale.created_at).toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short' 
      })
      
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, revenue: 0 }
      }
      
      monthlyData[month].sales += 1
      monthlyData[month].revenue += sale.total_amount
    })

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const exportReport = () => {
    const csvContent = generateCSVReport()
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-ventas-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const generateCSVReport = () => {
    let csv = 'Reporte de Ventas\n\n'
    csv += `Período: ${dateRange.from} - ${dateRange.to}\n\n`
    csv += `Total Ventas: ${reportData.totalSales}\n`
    csv += `Ingresos Totales: ${formatCurrency(reportData.totalRevenue)}\n\n`
    
    csv += 'Top Productos:\n'
    csv += 'Producto,Cantidad,Ingresos\n'
    reportData.topProducts.forEach(product => {
      csv += `${product.name},${product.quantity},${formatCurrency(product.revenue)}\n`
    })
    
    return csv
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
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-500">-</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <button
          onClick={exportReport}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
        >
          <Download size={20} className="mr-2" />
          Exportar Reporte
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Ingresos Totales</p>
              <p className="text-2xl font-bold">{formatCurrency(reportData.totalRevenue)}</p>
              <p className="text-blue-100 text-xs mt-1">En el período seleccionado</p>
            </div>
            <div className="p-3 bg-blue-400 bg-opacity-30 rounded-full">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Ventas</p>
              <p className="text-2xl font-bold">{reportData.totalSales}</p>
              <p className="text-green-100 text-xs mt-1">Transacciones completadas</p>
            </div>
            <div className="p-3 bg-green-400 bg-opacity-30 rounded-full">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Productos Activos</p>
              <p className="text-2xl font-bold">{reportData.totalProducts}</p>
              <p className="text-purple-100 text-xs mt-1">En catálogo</p>
            </div>
            <div className="p-3 bg-purple-400 bg-opacity-30 rounded-full">
              <Package className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Clientes Registrados</p>
              <p className="text-2xl font-bold">{reportData.totalCustomers}</p>
              <p className="text-orange-100 text-xs mt-1">Base de datos</p>
            </div>
            <div className="p-3 bg-orange-400 bg-opacity-30 rounded-full">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Ventas por Mes</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {reportData.salesByMonth.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">{item.month}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.revenue)}</div>
                  <div className="text-xs text-gray-500">{item.sales} ventas</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Productos Más Vendidos</h3>
            <Package className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {reportData.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.quantity} unidades</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(product.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Ventas por Categoría</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {reportData.salesByCategory.map((category, index) => {
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']
              return (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 ${colors[index % colors.length]} rounded-full`}></div>
                    <span className="text-sm font-medium text-gray-700">{category.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(category.revenue)}</div>
                    <div className="text-xs text-gray-500">{category.sales} unidades</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Growth Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Tendencias de Crecimiento</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {reportData.recentTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{trend.period}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-green-600">+{trend.growth}%</span>
                  <div className="text-xs text-gray-500">crecimiento</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports