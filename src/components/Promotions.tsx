import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, Tag, Calendar, Percent, DollarSign, Gift, Package, Users, TrendingUp, Eye, EyeOff, Copy, BarChart3 } from 'lucide-react'
import { supabase, Promotion, Product, Category } from '../lib/supabase'

const Promotions: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'bundle'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'bundle',
    value: '',
    start_date: '',
    end_date: '',
    min_purchase_amount: '',
    max_uses: '',
    selectedProducts: [] as string[],
    selectedCategories: [] as string[],
    conditions: {
      buy_quantity: '',
      get_quantity: '',
      bundle_products: [] as string[]
    }
  })

  useEffect(() => {
    fetchPromotions()
    fetchProducts()
    fetchCategories()
    getCurrentUserRole()
  }, [])

  const getCurrentUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('role')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
        
        if (employee) {
          setCurrentUserRole(employee.role)
        }
      }
    } catch (error) {
      console.error('Error getting current user role:', error)
    }
  }

  const fetchPromotions = async () => {
    try {
      const { data } = await supabase
        .from('promotions')
        .select(`
          *,
          promotion_products(
            id,
            product:products(id, name)
          ),
          promotion_categories(
            id,
            category:categories(id, name)
          )
        `)
        .order('created_at', { ascending: false })
      
      setPromotions(data || [])
    } catch (error) {
      console.error('Error fetching promotions:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, is_active')
        .eq('is_active', true)
        .order('name')
      
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')
      
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!employee) throw new Error('Employee not found')

      const promotionData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        value: parseFloat(formData.value),
        start_date: formData.start_date,
        end_date: formData.end_date,
        min_purchase_amount: parseFloat(formData.min_purchase_amount) || 0,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        conditions: formData.type === 'buy_x_get_y' ? {
          buy_quantity: parseInt(formData.conditions.buy_quantity) || 1,
          get_quantity: parseInt(formData.conditions.get_quantity) || 1
        } : formData.type === 'bundle' ? {
          bundle_products: formData.conditions.bundle_products
        } : {},
        created_by: employee.id
      }

      let promotionId: string

      if (editingPromotion) {
        await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id)
        
        promotionId = editingPromotion.id

        // Delete existing associations
        await supabase.from('promotion_products').delete().eq('promotion_id', promotionId)
        await supabase.from('promotion_categories').delete().eq('promotion_id', promotionId)
      } else {
        const { data: newPromotion } = await supabase
          .from('promotions')
          .insert(promotionData)
          .select()
          .single()

        if (!newPromotion) throw new Error('Failed to create promotion')
        promotionId = newPromotion.id
      }

      // Add product associations
      if (formData.selectedProducts.length > 0) {
        const productAssociations = formData.selectedProducts.map(productId => ({
          promotion_id: promotionId,
          product_id: productId
        }))

        await supabase
          .from('promotion_products')
          .insert(productAssociations)
      }

      // Add category associations
      if (formData.selectedCategories.length > 0) {
        const categoryAssociations = formData.selectedCategories.map(categoryId => ({
          promotion_id: promotionId,
          category_id: categoryId
        }))

        await supabase
          .from('promotion_categories')
          .insert(categoryAssociations)
      }

      setShowModal(false)
      setEditingPromotion(null)
      resetForm()
      fetchPromotions()
    } catch (error) {
      console.error('Error saving promotion:', error)
      alert('Error al guardar la promoción')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'percentage',
      value: '',
      start_date: '',
      end_date: '',
      min_purchase_amount: '',
      max_uses: '',
      selectedProducts: [],
      selectedCategories: [],
      conditions: {
        buy_quantity: '',
        get_quantity: '',
        bundle_products: []
      }
    })
  }

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setFormData({
      name: promotion.name,
      description: promotion.description,
      type: promotion.type,
      value: promotion.value.toString(),
      start_date: promotion.start_date.split('T')[0],
      end_date: promotion.end_date.split('T')[0],
      min_purchase_amount: promotion.min_purchase_amount.toString(),
      max_uses: promotion.max_uses?.toString() || '',
      selectedProducts: promotion.promotion_products?.map(pp => pp.product_id) || [],
      selectedCategories: promotion.promotion_categories?.map(pc => pc.category_id) || [],
      conditions: {
        buy_quantity: promotion.conditions?.buy_quantity?.toString() || '',
        get_quantity: promotion.conditions?.get_quantity?.toString() || '',
        bundle_products: promotion.conditions?.bundle_products || []
      }
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta promoción?')) {
      try {
        await supabase.from('promotions').delete().eq('id', id)
        fetchPromotions()
      } catch (error) {
        console.error('Error deleting promotion:', error)
        alert('Error al eliminar la promoción')
      }
    }
  }

  const togglePromotionStatus = async (id: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('promotions')
        .update({ is_active: !currentStatus })
        .eq('id', id)
      
      fetchPromotions()
    } catch (error) {
      console.error('Error updating promotion status:', error)
      alert('Error al actualizar el estado de la promoción')
    }
  }

  const duplicatePromotion = async (promotion: Promotion) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!employee) throw new Error('Employee not found')

      const newPromotionData = {
        name: `${promotion.name} (Copia)`,
        description: promotion.description,
        type: promotion.type,
        value: promotion.value,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        min_purchase_amount: promotion.min_purchase_amount,
        max_uses: promotion.max_uses,
        conditions: promotion.conditions,
        is_active: false,
        created_by: employee.id
      }

      const { data: newPromotion } = await supabase
        .from('promotions')
        .insert(newPromotionData)
        .select()
        .single()

      if (newPromotion) {
        // Copy product associations
        if (promotion.promotion_products && promotion.promotion_products.length > 0) {
          const productAssociations = promotion.promotion_products.map(pp => ({
            promotion_id: newPromotion.id,
            product_id: pp.product_id
          }))

          await supabase
            .from('promotion_products')
            .insert(productAssociations)
        }

        // Copy category associations
        if (promotion.promotion_categories && promotion.promotion_categories.length > 0) {
          const categoryAssociations = promotion.promotion_categories.map(pc => ({
            promotion_id: newPromotion.id,
            category_id: pc.category_id
          }))

          await supabase
            .from('promotion_categories')
            .insert(categoryAssociations)
        }

        fetchPromotions()
      }
    } catch (error) {
      console.error('Error duplicating promotion:', error)
      alert('Error al duplicar la promoción')
    }
  }

  const getPromotionStatus = (promotion: Promotion) => {
    const now = new Date()
    const startDate = new Date(promotion.start_date)
    const endDate = new Date(promotion.end_date)

    if (!promotion.is_active) return 'inactive'
    if (now < startDate) return 'scheduled'
    if (now > endDate) return 'expired'
    if (promotion.max_uses && promotion.current_uses >= promotion.max_uses) return 'exhausted'
    return 'active'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'exhausted':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa'
      case 'inactive':
        return 'Inactiva'
      case 'scheduled':
        return 'Programada'
      case 'expired':
        return 'Expirada'
      case 'exhausted':
        return 'Agotada'
      default:
        return status
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="h-4 w-4" />
      case 'fixed_amount':
        return <DollarSign className="h-4 w-4" />
      case 'buy_x_get_y':
        return <Gift className="h-4 w-4" />
      case 'bundle':
        return <Package className="h-4 w-4" />
      default:
        return <Tag className="h-4 w-4" />
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'Porcentaje'
      case 'fixed_amount':
        return 'Monto Fijo'
      case 'buy_x_get_y':
        return 'Compra X Lleva Y'
      case 'bundle':
        return 'Paquete'
      default:
        return type
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'COP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const filteredPromotions = useMemo(() => {
    return promotions.filter(promotion => {
      const matchesSearch = 
        promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promotion.description.toLowerCase().includes(searchTerm.toLowerCase())

      const status = getPromotionStatus(promotion)
      const matchesStatus = statusFilter === 'all' || status === statusFilter

      const matchesType = typeFilter === 'all' || promotion.type === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [promotions, searchTerm, statusFilter, typeFilter])

  const stats = useMemo(() => {
    const total = promotions.length
    const active = promotions.filter(p => getPromotionStatus(p) === 'active').length
    const scheduled = promotions.filter(p => getPromotionStatus(p) === 'scheduled').length
    const expired = promotions.filter(p => getPromotionStatus(p) === 'expired').length

    return { total, active, scheduled, expired }
  }, [promotions])

  const canManagePromotions = ['admin', 'manager'].includes(currentUserRole)

  if (!canManagePromotions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No tienes permisos para gestionar promociones</p>
          <p className="text-xs text-gray-400 mt-2">Solo administradores y gerentes pueden acceder a esta sección</p>
        </div>
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
              placeholder="Buscar promociones..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="scheduled">Programadas</option>
            <option value="inactive">Inactivas</option>
            <option value="expired">Expiradas</option>
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los tipos</option>
            <option value="percentage">Porcentaje</option>
            <option value="fixed_amount">Monto Fijo</option>
            <option value="buy_x_get_y">Compra X Lleva Y</option>
            <option value="bundle">Paquete</option>
          </select>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center shadow-lg"
        >
          <Plus size={20} className="mr-2" />
          Nueva Promoción
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Promociones</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="p-3 bg-purple-400 bg-opacity-30 rounded-full">
              <Tag className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Promociones Activas</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
            <div className="p-3 bg-green-400 bg-opacity-30 rounded-full">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Programadas</p>
              <p className="text-2xl font-bold">{stats.scheduled}</p>
            </div>
            <div className="p-3 bg-blue-400 bg-opacity-30 rounded-full">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Expiradas</p>
              <p className="text-2xl font-bold">{stats.expired}</p>
            </div>
            <div className="p-3 bg-red-400 bg-opacity-30 rounded-full">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPromotions.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'No se encontraron promociones' 
                : 'No hay promociones registradas'}
            </p>
          </div>
        ) : (
          filteredPromotions.map((promotion) => {
            const status = getPromotionStatus(promotion)
            
            return (
              <div key={promotion.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-100 rounded-full mr-4">
                        {getTypeIcon(promotion.type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{promotion.name}</h3>
                        <p className="text-sm text-gray-500">{getTypeText(promotion.type)}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                      {getStatusText(status)}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Descuento:</span>
                      <span className="font-semibold text-purple-600">
                        {promotion.type === 'percentage' 
                          ? `${promotion.value}%`
                          : promotion.type === 'fixed_amount'
                          ? formatCurrency(promotion.value)
                          : promotion.type === 'buy_x_get_y'
                          ? `Compra ${promotion.conditions?.buy_quantity || 1} lleva ${promotion.conditions?.get_quantity || 1}`
                          : 'Paquete especial'
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Vigencia:</span>
                      <span className="text-sm text-gray-900">
                        {formatDate(promotion.start_date)} - {formatDate(promotion.end_date)}
                      </span>
                    </div>

                    {promotion.min_purchase_amount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Compra mínima:</span>
                        <span className="text-sm text-gray-900">{formatCurrency(promotion.min_purchase_amount)}</span>
                      </div>
                    )}

                    {promotion.max_uses && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Usos:</span>
                        <span className="text-sm text-gray-900">
                          {promotion.current_uses} / {promotion.max_uses}
                        </span>
                      </div>
                    )}
                  </div>

                  {promotion.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{promotion.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(promotion)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => duplicatePromotion(promotion)}
                        className="p-2 text-green-500 hover:bg-green-50 rounded-full transition-colors"
                        title="Duplicar"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => togglePromotionStatus(promotion.id, promotion.is_active)}
                        className="p-2 text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
                        title={promotion.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {promotion.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(promotion.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors">
                      <BarChart3 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Promoción *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ej: Descuento de Verano"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Promoción *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="percentage">Descuento por Porcentaje</option>
                    <option value="fixed_amount">Descuento Monto Fijo</option>
                    <option value="buy_x_get_y">Compra X Lleva Y</option>
                    <option value="bundle">Paquete Especial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Descripción detallada de la promoción"
                />
              </div>

              {/* Promotion Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.type === 'percentage' ? 'Porcentaje de Descuento (%) *' :
                     formData.type === 'fixed_amount' ? 'Monto de Descuento *' :
                     'Valor *'}
                  </label>
                  <input
                    type="number"
                    step={formData.type === 'percentage' ? '0.1' : '0.01'}
                    min="0"
                    max={formData.type === 'percentage' ? '100' : undefined}
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder={formData.type === 'percentage' ? '20' : '5000'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compra Mínima
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_purchase_amount}
                    onChange={(e) => setFormData({...formData, min_purchase_amount: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Special Conditions for Buy X Get Y */}
              {formData.type === 'buy_x_get_y' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad a Comprar *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.conditions.buy_quantity}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {...formData.conditions, buy_quantity: e.target.value}
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad Gratis *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.conditions.get_quantity}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {...formData.conditions, get_quantity: e.target.value}
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="1"
                    />
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Fin *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Límite de Usos (opcional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({...formData, max_uses: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Dejar vacío para uso ilimitado"
                />
              </div>

              {/* Product and Category Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Productos Específicos
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {products.map((product) => (
                      <label key={product.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={formData.selectedProducts.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedProducts: [...formData.selectedProducts, product.id]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                selectedProducts: formData.selectedProducts.filter(id => id !== product.id)
                              })
                            }
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">{product.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categorías
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={formData.selectedCategories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedCategories: [...formData.selectedCategories, category.id]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                selectedCategories: formData.selectedCategories.filter(id => id !== category.id)
                              })
                            }
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingPromotion(null)
                    resetForm()
                  }}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 transition-all duration-200"
                >
                  {loading ? 'Guardando...' : 'Guardar Promoción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Promotions