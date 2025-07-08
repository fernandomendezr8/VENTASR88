import React, { useState, useEffect } from 'react'
import { Package, AlertTriangle, TrendingUp, TrendingDown, Plus, Minus, Search, Edit2, RefreshCw } from 'lucide-react'
import { supabase, InventoryItem, Product } from '../lib/supabase'

interface InventoryWithProduct extends InventoryItem {
  product: Product & {
    category?: { name: string }
    supplier?: { name: string }
  }
}

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryWithProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'normal' | 'high'>('all')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryWithProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'add' as 'add' | 'remove' | 'set',
    quantity: 0,
    reason: ''
  })

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('inventory')
        .select(`
          *,
          product:products(
            *,
            category:categories(name),
            supplier:suppliers(name)
          )
        `)
        .order('updated_at', { ascending: false })

      setInventory(data || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (item: InventoryWithProduct) => {
    if (item.quantity <= item.min_stock) return 'low'
    if (item.quantity >= item.max_stock) return 'high'
    return 'normal'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'low':
        return 'Stock Bajo'
      case 'high':
        return 'Stock Alto'
      default:
        return 'Stock Normal'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'low':
        return <TrendingDown className="h-4 w-4" />
      case 'high':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.category?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const status = getStockStatus(item)
    const matchesFilter = filterStatus === 'all' || status === filterStatus

    return matchesSearch && matchesFilter
  })

  const handleAdjustStock = (item: InventoryWithProduct) => {
    setSelectedItem(item)
    setAdjustmentData({
      type: 'add',
      quantity: 0,
      reason: ''
    })
    setShowAdjustModal(true)
  }

  const processStockAdjustment = async () => {
    if (!selectedItem) return

    let newQuantity = selectedItem.quantity

    switch (adjustmentData.type) {
      case 'add':
        newQuantity += adjustmentData.quantity
        break
      case 'remove':
        newQuantity = Math.max(0, newQuantity - adjustmentData.quantity)
        break
      case 'set':
        newQuantity = adjustmentData.quantity
        break
    }

    try {
      await supabase
        .from('inventory')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedItem.id)

      // Log the adjustment in cash register if it's a significant change
      if (adjustmentData.type === 'remove' && adjustmentData.quantity > 0) {
        const cost = selectedItem.product.cost * adjustmentData.quantity
        await supabase
          .from('cash_register')
          .insert({
            type: 'expense',
            amount: cost,
            description: `Ajuste de inventario: ${selectedItem.product.name} (-${adjustmentData.quantity}) - ${adjustmentData.reason}`,
            reference_id: selectedItem.id
          })
      }

      setShowAdjustModal(false)
      setSelectedItem(null)
      fetchInventory()
    } catch (error) {
      console.error('Error adjusting stock:', error)
      alert('Error al ajustar el stock')
    }
  }

  const stats = {
    totalItems: inventory.length,
    lowStock: inventory.filter(item => getStockStatus(item) === 'low').length,
    totalValue: inventory.reduce((sum, item) => sum + (item.quantity * item.product.cost), 0),
    outOfStock: inventory.filter(item => item.quantity === 0).length
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="low">Stock bajo</option>
            <option value="normal">Stock normal</option>
            <option value="high">Stock alto</option>
          </select>
        </div>
        
        <button
          onClick={fetchInventory}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
        >
          <RefreshCw size={20} className="mr-2" />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Productos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-red-600">{stats.lowStock}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sin Stock</p>
              <p className="text-2xl font-bold text-orange-600">{stats.outOfStock}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Actual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Límites
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Actualización
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filterStatus !== 'all' ? 'No se encontraron productos' : 'No hay productos en inventario'}
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const status = getStockStatus(item)
                  const stockValue = item.quantity * item.product.cost
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                            <div className="text-sm text-gray-500">
                              SKU: {item.product.sku || 'N/A'} | {item.product.category?.name || 'Sin categoría'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-gray-900">{item.quantity}</div>
                        <div className="text-sm text-gray-500">unidades</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Mín: <span className="font-medium">{item.min_stock}</span>
                        </div>
                        <div className="text-sm text-gray-900">
                          Máx: <span className="font-medium">{item.max_stock}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                          {getStatusIcon(status)}
                          <span className="ml-1">{getStatusText(status)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(stockValue)}</div>
                        <div className="text-sm text-gray-500">{formatCurrency(item.product.cost)} c/u</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(item.updated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleAdjustStock(item)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                          title="Ajustar stock"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Ajustar Stock: {selectedItem.product.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Stock actual: {selectedItem.quantity} unidades
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Ajuste
                </label>
                <select
                  value={adjustmentData.type}
                  onChange={(e) => setAdjustmentData({...adjustmentData, type: e.target.value as any})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="add">Agregar stock</option>
                  <option value="remove">Reducir stock</option>
                  <option value="set">Establecer cantidad exacta</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustmentData.quantity}
                  onChange={(e) => setAdjustmentData({...adjustmentData, quantity: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ingrese la cantidad"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del Ajuste
                </label>
                <textarea
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({...adjustmentData, reason: e.target.value})}
                  rows={3}
                  <span className="font-semibold text-gray-900">Stock: {selectedItem.quantity}</span>
                  placeholder="Describa el motivo del ajuste..."
                />
              </div>
                    <span className="text-sm text-gray-600">Nuevo stock:</span>
              {adjustmentData.type !== 'set' && (
                      adjustmentData.type === 'add' ? 'text-green-600' : 'text-red-600'
                  <p className="text-sm text-gray-600">
                      {adjustmentData.type === 'add' 
                        ? selectedItem.quantity + adjustmentData.quantity
                        : adjustmentData.type === 'remove'
                        ? Math.max(0, selectedItem.quantity - adjustmentData.quantity)
                        : adjustmentData.quantity
                      } unidades
                    </span>
                  </p>
                </div>
              )}

              {adjustmentData.type === 'set' && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Nuevo stock: <span className="font-medium">{adjustmentData.quantity} unidades</span>
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => {
                    setShowAdjustModal(false)
                    setSelectedItem(null)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={processStockAdjustment}
                  disabled={adjustmentData.quantity === 0 && adjustmentData.type !== 'set'}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  Aplicar Ajuste
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory