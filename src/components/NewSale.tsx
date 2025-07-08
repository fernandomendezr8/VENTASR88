import React, { useState, useEffect } from 'react'
import { Plus, Minus, ShoppingCart, Search, X, Package, User, Calculator, Percent, Receipt, AlertCircle } from 'lucide-react'
import { supabase, Product, Customer } from '../lib/supabase'
import { createPlaceholderImage } from '../utils/imageUtils'

interface CartItem {
  product: Product
  quantity: number
  total: number
}

const NewSale: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [tax, setTax] = useState(21)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [loading, setLoading] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddCustomer, setQuickAddCustomer] = useState({ name: '', cedula: '', phone: '' })

  useEffect(() => {
    fetchProducts()
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (customerSearch.trim() === '') {
      setFilteredCustomers(customers.slice(0, 10)) // Limit to 10 for performance
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.cedula?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
      ).slice(0, 10)
      setFilteredCustomers(filtered)
    }
  }, [customerSearch, customers])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(name),
        inventory(quantity)
      `)
      .eq('is_active', true)
      .order('name')
    
    setProducts(data || [])
  }

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name')
    
    setCustomers(data || [])
  }

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer.id)
    setCustomerSearch(customer.name)
    setShowCustomerDropdown(false)
  }

  const clearCustomerSelection = () => {
    setSelectedCustomer('')
    setCustomerSearch('')
    setShowCustomerDropdown(false)
  }

  const addQuickCustomer = async () => {
    if (!quickAddCustomer.name.trim() || !quickAddCustomer.cedula.trim()) {
      alert('El nombre y la cédula del cliente son requeridos')
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: quickAddCustomer.name,
          cedula: quickAddCustomer.cedula,
          phone: quickAddCustomer.phone
        })
        .select()
        .single()

      if (error) throw error

      setCustomers([...customers, data])
      setSelectedCustomer(data.id)
      setCustomerSearch(data.name)
      setQuickAddCustomer({ name: '', cedula: '', phone: '' })
      setShowQuickAdd(false)
    } catch (error) {
      console.error('Error adding customer:', error)
      if (error.message?.includes('duplicate key')) {
        alert('Ya existe un cliente con esta cédula')
      } else {
        alert('Error al agregar el cliente')
      }
    }
  }

  const addToCart = (product: Product) => {
    const availableStock = product.inventory?.[0]?.quantity || 0
    const existingItem = cart.find(item => item.product.id === product.id)
    const currentQuantity = existingItem ? existingItem.quantity : 0
    
    if (currentQuantity >= availableStock) {
      alert('No hay suficiente stock disponible')
      return
    }
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * product.price }
          : item
      ))
    } else {
      setCart([...cart, { product, quantity: 1, total: product.price }])
    }
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId))
    } else {
      const product = products.find(p => p.id === productId)
      const availableStock = product?.inventory?.[0]?.quantity || 0
      
      if (quantity > availableStock) {
        alert('No hay suficiente stock disponible')
        return
      }
      
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity, total: quantity * item.product.price }
          : item
      ))
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const discountAmount = discountType === 'percentage' 
    ? subtotal * (discount / 100)
    : Math.min(discount, subtotal)
  const taxAmount = (subtotal - discountAmount) * (tax / 100)
  const total = subtotal - discountAmount + taxAmount

  const processSale = async () => {
    if (cart.length === 0) {
      alert('El carrito está vacío')
      return
    }

    if (total <= 0) {
      alert('El total de la venta debe ser mayor a 0')
      return
    }

    setLoading(true)
    try {
      // Create sale record
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: selectedCustomer || null,
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          total_amount: total,
          status: 'completed',
          payment_method: paymentMethod
        })
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.total
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Update inventory
      for (const item of cart) {
        const currentStock = item.product.inventory?.[0]?.quantity || 0
        const newQuantity = currentStock - item.quantity

        const { error: inventoryError } = await supabase
          .from('inventory')
          .update({ 
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('product_id', item.product.id)

        if (inventoryError) console.error('Error updating inventory:', inventoryError)
      }

      // Add cash register entry
      const { error: cashError } = await supabase
        .from('cash_register')
        .insert({
          type: 'sale',
          amount: total,
          description: `Venta #${sale.id.slice(-8)} - ${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}`,
          reference_id: sale.id
        })

      if (cashError) {
        console.error('Error adding cash register entry:', cashError)
      }

      // Reset form
      setCart([])
      setSelectedCustomer('')
      setCustomerSearch('')
      setDiscount(0)
      setDiscountType('percentage')
      setSearchTerm('')
      setPaymentMethod('cash')
      
      // Show success message
      alert(`¡Venta procesada exitosamente!\nTotal: ${formatCurrency(total)}\nID: #${sale.id.slice(-8)}`)
      
      // Refresh products to update stock
      fetchProducts()
      
    } catch (error) {
      console.error('Error processing sale:', error)
      alert('Error al procesar la venta')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'COP'
    }).format(amount)
  }

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Products Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Productos Disponibles</h3>
            <div className="text-sm text-gray-500">
              {filteredProducts.length} productos
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o categoría..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredProducts.map((product) => {
                const stock = product.inventory?.[0]?.quantity || 0
                const inCart = cart.find(item => item.product.id === product.id)?.quantity || 0
                const availableStock = stock - inCart
                
                return (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    {/* Product Image */}
                    <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.image_alt || product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{product.category?.name || 'Sin categoría'}</span>
                          {product.sku && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {product.sku}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className={`${stock <= 5 ? 'text-red-600' : 'text-gray-500'}`}>
                            Stock: {stock}
                          </span>
                          {inCart > 0 && (
                            <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs">
                              {inCart} en carrito
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(product.price)}</p>
                        <p className="text-xs text-gray-500">Costo: {formatCurrency(product.cost)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={availableStock <= 0}
                      className="w-full mt-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      <Plus size={16} className="mr-2" />
                      {availableStock <= 0 ? 'Sin stock' : 'Agregar al carrito'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Carrito de Compras</h3>
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">{getTotalItems()} artículos</span>
            </div>
          </div>
          
          {/* Customer Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Cliente</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cliente por nombre, cédula, teléfono o email..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setShowCustomerDropdown(true)
                }}
                onFocus={() => setShowCustomerDropdown(true)}
              />
              
              {/* Customer Dropdown */}
              {showCustomerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200">
                    <button
                      onClick={() => setShowQuickAdd(true)}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                      + Agregar nuevo cliente
                    </button>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={clearCustomerSelection}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                    >
                      Cliente general (sin registro)
                    </button>
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-xs text-gray-500">
                          {customer.cedula && `CC: ${customer.cedula}`}
                          {customer.cedula && customer.phone && ' • '}
                          {customer.phone}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 max-h-64 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">El carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {/* Product Image */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {item.product.image_url ? (
                        <img 
                          src={item.product.image_url} 
                          alt={item.product.image_alt || item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.product.price)}/{item.product.unit_of_measure?.abbreviation || 'und'}
                    </p>
                  </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 rounded-full hover:bg-red-100 text-red-500 ml-2 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold">{formatCurrency(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals and Checkout */}
        <div className="p-6 border-t border-gray-200">
          {/* Selected Customer Display */}
          {selectedCustomer && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">
                    Cliente: {customers.find(c => c.id === selectedCustomer)?.name}
                  </span>
                </div>
                <button
                  onClick={clearCustomerSelection}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>

            {/* Discount and Tax */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center">
                    <Percent className="h-4 w-4 mr-1" />
                    Descuento
                  </div>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? "100" : subtotal.toString()}
                    step={discountType === 'percentage' ? "1" : "0.01"}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => {
                      setDiscountType(e.target.value as any)
                      setDiscount(0)
                    }}
                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">€</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cédula *</label>
                <input
                  type="text"
                  value={quickAddCustomer.cedula}
                  onChange={(e) => setQuickAddCustomer({...quickAddCustomer, cedula: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Número de cédula"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IVA (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento ({discountType === 'percentage' ? `${discount}%` : 'Fijo'}):</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>IVA ({tax}%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span className="text-green-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Validation Warnings */}
            {cart.length > 0 && total <= 0 && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="text-sm text-yellow-800">El total debe ser mayor a 0</span>
              </div>
            )}

            <button
              onClick={processSale}
              disabled={cart.length === 0 || loading || total <= 0}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Receipt size={20} className="mr-2" />
              )}
              {loading ? 'Procesando...' : 'Procesar Venta'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Agregar Cliente Rápido</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  value={quickAddCustomer.name}
                  onChange={(e) => setQuickAddCustomer({...quickAddCustomer, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={quickAddCustomer.phone}
                  onChange={(e) => setQuickAddCustomer({...quickAddCustomer, phone: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Teléfono del cliente"
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => {
                    setShowQuickAdd(false)
                    setQuickAddCustomer({ name: '', cedula: '', phone: '' })
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={addQuickCustomer}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Click outside to close dropdown */}
      {showCustomerDropdown && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowCustomerDropdown(false)}
        />
      )}
    </div>
  )
}

export default NewSale