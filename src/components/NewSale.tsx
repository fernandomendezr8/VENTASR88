import React, { useState, useEffect } from 'react'
import { Plus, Minus, ShoppingCart, Search, X, Package, User, Calculator, Percent, Receipt, AlertCircle, Scan, CreditCard, DollarSign, Trash2, Edit3, Clock, CheckCircle, Grid3X3, List } from 'lucide-react'
import { supabase, Product, Customer } from '../lib/supabase'

interface CartItem {
  product: Product
  quantity: number
  total: number
  discount?: number
}

interface QuickAction {
  id: string
  name: string
  action: () => void
  icon: React.ReactNode
  color: string
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
  const [tax, setTax] = useState(19)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [loading, setLoading] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddCustomer, setQuickAddCustomer] = useState({ name: '', cedula: '', phone: '' })
  const [currentView, setCurrentView] = useState<'products' | 'cart'>('products')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [cashReceived, setCashReceived] = useState('')
  const [saleCompleted, setSaleCompleted] = useState(false)
  const [lastSaleId, setLastSaleId] = useState('')
  const [lastSaleData, setLastSaleData] = useState<{
    id: string
    total: number
    customer?: string
    items: CartItem[]
    subtotal: number
    discount: number
    tax: number
    paymentMethod: string
    date: string
  } | null>(null)
  const [productsViewMode, setProductsViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchProducts()
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (customerSearch.trim() === '') {
      setFilteredCustomers(customers.slice(0, 10))
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
        unit_of_measure:units_of_measure(name, abbreviation),
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
    
    // Auto switch to cart view on mobile when adding items
    if (window.innerWidth < 1024) {
      setCurrentView('cart')
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

  const clearCart = () => {
    setCart([])
    setDiscount(0)
    setSelectedCustomer('')
    setCustomerSearch('')
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

      // Reset form and show success
      setLastSaleId(sale.id)
      setLastSaleData({
        id: sale.id,
        total,
        customer: selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : 'Cliente general',
        items: [...cart],
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        paymentMethod,
        date: new Date().toISOString()
      })
      setSaleCompleted(true)
      setShowPaymentModal(false)
      clearCart()
      
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

  const getChange = () => {
    const received = parseFloat(cashReceived) || 0
    return received - total
  }

  const printReceipt = (saleData?: typeof lastSaleData) => {
    const dataToUse = saleData || lastSaleData
    if (!dataToUse) return

    const receiptWindow = window.open('', '_blank', 'width=300,height=600')
    if (!receiptWindow) return

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Venta</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 10px;
            width: 280px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .company-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .receipt-title {
            font-size: 14px;
            font-weight: bold;
            margin: 10px 0;
          }
          .info-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .items-header {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 5px 0;
            margin: 10px 0;
            font-weight: bold;
          }
          .item-line {
            margin: 3px 0;
          }
          .totals {
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 10px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .final-total {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 1px solid #000;
            padding-top: 10px;
            font-size: 10px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">VENTASPRO</div>
          <div>Sistema de Gestión</div>
        </div>
        
        <div class="receipt-title">COMPROBANTE DE VENTA</div>
        
        <div class="info-line">
          <span>Venta #:</span>
          <span>${dataToUse.id.slice(-8)}</span>
        </div>
        <div class="info-line">
          <span>Fecha:</span>
          <span>${new Date(dataToUse.date).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
        </div>
        <div class="info-line">
          <span>Cliente:</span>
          <span>${dataToUse.customer}</span>
        </div>
        <div class="info-line">
          <span>Método:</span>
          <span>${dataToUse.paymentMethod === 'cash' ? 'Efectivo' : 
                   dataToUse.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
        </div>
        
        <div class="items-header">
          PRODUCTOS
        </div>
        
        ${dataToUse.items.map(item => `
          <div class="item-line">
            <div>${item.product.name}</div>
            <div class="info-line">
              <span>${item.quantity} x ${formatCurrency(item.product.price)}</span>
              <span>${formatCurrency(item.total)}</span>
            </div>
          </div>
        `).join('')}
        
        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${formatCurrency(dataToUse.subtotal)}</span>
          </div>
          ${dataToUse.discount > 0 ? `
          <div class="total-line">
            <span>Descuento:</span>
            <span>-${formatCurrency(dataToUse.discount)}</span>
          </div>
          ` : ''}
          <div class="total-line">
            <span>IVA (19%):</span>
            <span>${formatCurrency(dataToUse.tax)}</span>
          </div>
          <div class="total-line final-total">
            <span>TOTAL:</span>
            <span>${formatCurrency(dataToUse.total)}</span>
          </div>
        </div>
        
        <div class="footer">
          ¡Gracias por su compra!<br>
          Conserve este comprobante
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    receiptWindow.document.write(receiptHTML)
    receiptWindow.document.close()
  }

  const quickActions: QuickAction[] = [
    {
      id: 'clear-cart',
      name: 'Limpiar',
      action: clearCart,
      icon: <Trash2 className="h-4 w-4" />,
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      id: 'hold-sale',
      name: 'Suspender',
      action: () => alert('Función de suspender venta próximamente'),
      icon: <Clock className="h-4 w-4" />,
      color: 'bg-yellow-500 hover:bg-yellow-600'
    }
  ]

  if (saleCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 lg:p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">¡Venta Completada!</h2>
          <p className="text-gray-600 mb-6">
            La venta se ha procesado exitosamente
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">ID de Venta</p>
            <p className="text-lg font-mono font-bold text-gray-900">#{lastSaleId.slice(-8)}</p>
            <p className="text-sm text-gray-600 mt-2">Total</p>
            <p className="text-xl lg:text-2xl font-bold text-green-600">
              {lastSaleData ? formatCurrency(lastSaleData.total) : formatCurrency(0)}
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                setSaleCompleted(false)
                setLastSaleId('')
                setLastSaleData(null)
              }}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Nueva Venta
            </button>
            <button
              onClick={() => printReceipt()}
              className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Imprimir Recibo
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-3 lg:p-4 flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-lg lg:text-xl font-bold text-gray-900">Punto de Venta</h1>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 lg:w-3 lg:h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs lg:text-sm text-gray-600">Online</span>
              </div>
            </div>
            
            {/* Mobile Cart Summary */}
            <div className="lg:hidden bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                <div className="text-xs">
                  <p className="font-medium text-blue-900">{getTotalItems()}</p>
                  <p className="font-bold text-blue-900">{formatCurrency(total)}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Quick Actions */}
            <div className="flex space-x-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={`${action.color} text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm`}
                >
                  {action.icon}
                  <span className="hidden sm:inline">{action.name}</span>
                </button>
              ))}
            </div>
            
            {/* Desktop Cart Summary */}
            <div className="hidden lg:block bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">{getTotalItems()} artículos</p>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(total)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Products or Cart */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* View Toggle */}
          <div className="bg-white border-b border-gray-200 p-3 lg:p-4 flex-shrink-0">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrentView('products')}
                className={`flex-1 py-2 px-3 lg:px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                  currentView === 'products'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="h-4 w-4 mr-2" />
                <span>Productos</span>
              </button>
              <button
                onClick={() => setCurrentView('cart')}
                className={`flex-1 py-2 px-3 lg:px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                  currentView === 'cart'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                <span>Carrito ({getTotalItems()})</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {currentView === 'products' ? (
              <div className="h-full flex flex-col">
                {/* Search and View Toggle */}
                <div className="p-3 lg:p-4 bg-white border-b border-gray-200 flex-shrink-0">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar productos..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setProductsViewMode('grid')}
                        className={`p-2 rounded-md transition-colors ${
                          productsViewMode === 'grid'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setProductsViewMode('list')}
                        className={`p-2 rounded-md transition-colors ${
                          productsViewMode === 'list'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Products Display */}
                <div className="flex-1 overflow-y-auto p-3 lg:p-4">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
                      </p>
                    </div>
                  ) : productsViewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4">
                      {filteredProducts.map((product) => {
                        const stock = product.inventory?.[0]?.quantity || 0
                        const inCart = cart.find(item => item.product.id === product.id)?.quantity || 0
                        const availableStock = stock - inCart
                        
                        return (
                          <div
                            key={product.id}
                            className="bg-white border border-gray-200 rounded-lg p-3 lg:p-4 hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => addToCart(product)}
                          >
                            {/* Product Image */}
                            <div className="w-full h-20 lg:h-24 mb-3 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                              {product.image_url ? (
                                <img 
                                  src={product.image_url} 
                                  alt={product.image_alt || product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-6 w-6 lg:h-8 lg:w-8 text-gray-400" />
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                                {product.name}
                              </h4>
                              
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-blue-600 text-sm lg:text-base">{formatCurrency(product.price)}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  stock <= 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {stock}
                                </span>
                              </div>
                              
                              {inCart > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1">
                                  <span className="text-xs text-blue-800 font-medium">
                                    {inCart} en carrito
                                  </span>
                                </div>
                              )}
                              
                              <button
                                disabled={availableStock <= 0}
                                className="w-full mt-2 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                              >
                                {availableStock <= 0 ? 'Sin stock' : 'Agregar'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredProducts.map((product) => {
                        const stock = product.inventory?.[0]?.quantity || 0
                        const inCart = cart.find(item => item.product.id === product.id)?.quantity || 0
                        const availableStock = stock - inCart
                        
                        return (
                          <div
                            key={product.id}
                            className="bg-white border border-gray-200 rounded-lg p-3 lg:p-4 hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => addToCart(product)}
                          >
                            <div className="flex items-center space-x-4">
                              {/* Product Image */}
                              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.image_alt || product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="h-6 w-6 text-gray-400" />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                  {product.name}
                                </h4>
                                <p className="text-sm text-gray-500 truncate">
                                  {product.category?.name || 'Sin categoría'}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="font-bold text-blue-600">{formatCurrency(product.price)}</span>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    stock <= 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    Stock: {stock}
                                  </span>
                                  {inCart > 0 && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                      {inCart} en carrito
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <button
                                disabled={availableStock <= 0}
                                className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium flex-shrink-0"
                              >
                                {availableStock <= 0 ? 'Sin stock' : 'Agregar'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-3 lg:p-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">El carrito está vacío</p>
                      <button
                        onClick={() => setCurrentView('products')}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Ver Productos
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.product.id} className="bg-white border border-gray-200 rounded-lg p-3 lg:p-4">
                          <div className="flex items-center space-x-3 lg:space-x-4">
                            {/* Product Image */}
                            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                              {item.product.image_url ? (
                                <img 
                                  src={item.product.image_url} 
                                  alt={item.product.image_alt || item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-5 w-5 lg:h-6 lg:w-6 text-gray-400" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">{item.product.name}</h4>
                              <p className="text-sm text-gray-500 truncate">
                                {formatCurrency(item.product.price)}/{item.product.unit_of_measure?.abbreviation || 'und'}
                              </p>
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-2 lg:space-x-3">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 lg:w-12 text-center font-medium text-sm lg:text-base">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                              <button
                                onClick={() => removeFromCart(item.product.id)}
                                className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors ml-2"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-base lg:text-lg">{formatCurrency(item.total)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Checkout (Desktop) */}
        <div className="hidden lg:flex w-80 xl:w-96 bg-white border-l border-gray-200 flex-col">
          {/* Customer Selection */}
          <div className="p-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cliente..."
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
            
            {/* Selected Customer Display */}
            {selectedCustomer && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-900">
                      {customers.find(c => c.id === selectedCustomer)?.name}
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
          </div>

          {/* Totals */}
          <div className="p-4 border-b border-gray-200">
            <div className="space-y-3">
              {/* Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <option value="fixed">$</option>
                  </select>
                </div>
              </div>

              {/* Totals Display */}
              <div className="space-y-2 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>IVA ({tax}%):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-xl border-t pt-2">
                  <span>Total:</span>
                  <span className="text-green-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="p-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DollarSign className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs font-medium">Efectivo</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs font-medium">Tarjeta</span>
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'transfer'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Scan className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs font-medium">Transfer</span>
              </button>
            </div>
          </div>

          {/* Checkout Button */}
          <div className="p-4">
            {cart.length > 0 && total > 0 && (
              <button
                onClick={() => {
                  if (paymentMethod === 'cash') {
                    setShowPaymentModal(true)
                  } else {
                    processSale()
                  }
                }}
                disabled={loading}
                className="w-full bg-green-500 text-white py-4 px-4 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-lg font-semibold"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                ) : (
                  <Receipt size={24} className="mr-2" />
                )}
                {loading ? 'Procesando...' : 'Procesar Venta'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Checkout Panel */}
      <div className="lg:hidden bg-white border-t border-gray-200 p-4">
        {cart.length > 0 && (
          <div className="space-y-4">
            {/* Quick Totals */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(total)}</span>
            </div>
            
            {/* Payment Method Selection */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-2 rounded-lg border-2 transition-colors text-xs ${
                  paymentMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DollarSign className="h-4 w-4 mx-auto mb-1" />
                <span>Efectivo</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-2 rounded-lg border-2 transition-colors text-xs ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className="h-4 w-4 mx-auto mb-1" />
                <span>Tarjeta</span>
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`p-2 rounded-lg border-2 transition-colors text-xs ${
                  paymentMethod === 'transfer'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Scan className="h-4 w-4 mx-auto mb-1" />
                <span>Transfer</span>
              </button>
            </div>
            
            {/* Checkout Button */}
            <button
              onClick={() => {
                if (paymentMethod === 'cash') {
                  setShowPaymentModal(true)
                } else {
                  processSale()
                }
              }}
              disabled={loading}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center font-semibold"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Receipt size={20} className="mr-2" />
              )}
              {loading ? 'Procesando...' : 'Procesar Venta'}
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal for Cash */}
      {showPaymentModal && paymentMethod === 'cash' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Pago en Efectivo</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total a Pagar</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dinero Recibido
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={total}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-center"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              
              {cashReceived && parseFloat(cashReceived) >= total && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-sm text-green-600">Cambio</p>
                    <p className="text-xl lg:text-2xl font-bold text-green-700">{formatCurrency(getChange())}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setCashReceived('')
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={processSale}
                  disabled={!cashReceived || parseFloat(cashReceived) < total || loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Procesando...' : 'Completar Venta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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