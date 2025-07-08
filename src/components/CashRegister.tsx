import React, { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Plus, Minus, Calculator, Calendar, Filter, Download } from 'lucide-react'
import { supabase, CashRegister as CashRegisterType } from '../lib/supabase'

interface CashMovement extends CashRegisterType {
  sale?: { id: string; customer?: { name: string } }
}

const CashRegister: React.FC = () => {
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'expense' | 'deposit' | 'withdrawal'>('all')
  
  const [formData, setFormData] = useState({
    type: 'deposit' as 'deposit' | 'withdrawal' | 'expense',
    amount: '',
    description: ''
  })

  useEffect(() => {
    fetchMovements()
  }, [dateFilter, typeFilter])

  const fetchMovements = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('cash_register')
        .select(`
          *,
          sale:sales(
            id,
            customer:customers(name)
          )
        `)
        .order('created_at', { ascending: false })

      if (dateFilter) {
        query = query.gte('created_at', dateFilter).lte('created_at', dateFilter + 'T23:59:59')
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter)
      }

      const { data } = await query

      setMovements(data || [])
    } catch (error) {
      console.error('Error fetching cash movements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await supabase
        .from('cash_register')
        .insert({
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description
        })

      setShowModal(false)
      resetForm()
      fetchMovements()
    } catch (error) {
      console.error('Error adding cash movement:', error)
      alert('Error al registrar el movimiento')
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'deposit',
      amount: '',
      description: ''
    })
  }

  const calculateBalance = () => {
    return movements.reduce((balance, movement) => {
      switch (movement.type) {
        case 'sale':
        case 'deposit':
          return balance + movement.amount
        case 'expense':
        case 'withdrawal':
          return balance - movement.amount
        default:
          return balance
      }
    }, 0)
  }

  const getTodayMovements = () => {
    const today = new Date().toDateString()
    return movements.filter(movement => 
      new Date(movement.created_at).toDateString() === today
    )
  }

  const calculateTodayStats = () => {
    const todayMovements = getTodayMovements()
    
    const income = todayMovements
      .filter(m => m.type === 'sale' || m.type === 'deposit')
      .reduce((sum, m) => sum + m.amount, 0)
    
    const expenses = todayMovements
      .filter(m => m.type === 'expense' || m.type === 'withdrawal')
      .reduce((sum, m) => sum + m.amount, 0)
    
    return { income, expenses, net: income - expenses }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <Calculator className="h-4 w-4" />
      case 'deposit':
        return <TrendingUp className="h-4 w-4" />
      case 'expense':
      case 'withdrawal':
        return <TrendingDown className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'deposit':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'expense':
      case 'withdrawal':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMovementText = (type: string) => {
    switch (type) {
      case 'sale':
        return 'Venta'
      case 'deposit':
        return 'Depósito'
      case 'expense':
        return 'Gasto'
      case 'withdrawal':
        return 'Retiro'
      default:
        return type
    }
  }

  const exportCashReport = () => {
    const csvContent = generateCashCSV()
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-caja-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const generateCashCSV = () => {
    let csv = 'Reporte de Caja\n\n'
    csv += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n`
    csv += `Balance Actual: ${formatCurrency(calculateBalance())}\n\n`
    
    csv += 'Movimientos:\n'
    csv += 'Fecha,Tipo,Descripción,Monto\n'
    
    movements.forEach(movement => {
      const date = new Date(movement.created_at).toLocaleDateString('es-ES')
      const amount = movement.type === 'expense' || movement.type === 'withdrawal' 
        ? `-${movement.amount}` 
        : movement.amount
      csv += `${date},${getMovementText(movement.type)},${movement.description},${amount}\n`
    })
    
    return csv
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

  const balance = calculateBalance()
  const todayStats = calculateTodayStats()

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
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los tipos</option>
              <option value="sale">Ventas</option>
              <option value="deposit">Depósitos</option>
              <option value="expense">Gastos</option>
              <option value="withdrawal">Retiros</option>
            </select>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={exportCashReport}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
          >
            <Download size={20} className="mr-2" />
            Exportar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Balance and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Balance Actual</p>
              <p className="text-2xl font-bold">{formatCurrency(balance)}</p>
              <p className="text-blue-100 text-xs mt-1">Total en caja</p>
            </div>
            <div className="p-3 bg-blue-400 bg-opacity-30 rounded-full">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Ingresos Hoy</p>
              <p className="text-2xl font-bold">{formatCurrency(todayStats.income)}</p>
              <p className="text-green-100 text-xs mt-1">Ventas y depósitos</p>
            </div>
            <div className="p-3 bg-green-400 bg-opacity-30 rounded-full">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Gastos Hoy</p>
              <p className="text-2xl font-bold">{formatCurrency(todayStats.expenses)}</p>
              <p className="text-red-100 text-xs mt-1">Gastos y retiros</p>
            </div>
            <div className="p-3 bg-red-400 bg-opacity-30 rounded-full">
              <TrendingDown className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Neto Hoy</p>
              <p className="text-2xl font-bold">{formatCurrency(todayStats.net)}</p>
              <p className="text-purple-100 text-xs mt-1">Diferencia del día</p>
            </div>
            <div className="p-3 bg-purple-400 bg-opacity-30 rounded-full">
              <Calculator className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Movimientos de Caja</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha y Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referencia
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {dateFilter || typeFilter !== 'all' ? 'No se encontraron movimientos' : 'No hay movimientos registrados'}
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(movement.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getMovementColor(movement.type)}`}>
                        {getMovementIcon(movement.type)}
                        <span className="ml-1">{getMovementText(movement.type)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {movement.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${
                        movement.type === 'expense' || movement.type === 'withdrawal' 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {movement.type === 'expense' || movement.type === 'withdrawal' ? '-' : '+'}
                        {formatCurrency(movement.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.type === 'sale' && movement.sale ? (
                        <div>
                          <div>Venta #{movement.sale.id.slice(-6)}</div>
                          {movement.sale.customer && (
                            <div className="text-xs">{movement.sale.customer.name}</div>
                          )}
                        </div>
                      ) : (
                        movement.reference_id ? `Ref: ${movement.reference_id.slice(-8)}` : '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Movement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Nuevo Movimiento de Caja
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Movimiento *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="deposit">Depósito (+)</option>
                  <option value="withdrawal">Retiro (-)</option>
                  <option value="expense">Gasto (-)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describa el motivo del movimiento..."
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Balance actual:</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(balance)}</span>
                </div>
                {formData.amount && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-600">Nuevo balance:</span>
                    <span className={`font-semibold ${
                      formData.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(
                        formData.type === 'deposit' 
                          ? balance + parseFloat(formData.amount || '0')
                          : balance - parseFloat(formData.amount || '0')
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Registrar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashRegister