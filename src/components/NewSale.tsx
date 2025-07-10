import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Minus, Search, ShoppingCart, User, Package, Calculator, X, Receipt } from 'lucide-react'
import { supabase, Product, Customer, Sale } from '../lib/supabase'

interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
  totalPrice: number
}

const NewSale: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [discount, setDiscount] = useState(0)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState<Sale | null>(null)

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    cedula: '',
    email: '',
    phone: '',
    address: ''
  })

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          supplier:suppliers(name),
          unit_of_measure:units_of_measure(name, abbreviation),
          inventory(quantity)
        `)
        .eq('is_active', true)
        .order('name')
      
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('name')
      
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCustomers()])
  }, [fetchProducts, fetchCustomers])

  const addToCart = useCallback((product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id)
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price
      }
      setCart([...cart, newItem])
    }
  }, [cart])

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
        : item
    ))
  }, [cart])

  const removeFromCart = useCallback((productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId))
  }, [cart])

  const calculateSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0)
  }, [cart])

  const calculateTax = useMemo(() => {
    return calculateSubtotal * 0.19 // 19% IVA
  }, [calculateSubtotal])

  const calculateTotal = useMemo(() => {
    return calculateSubtotal + calculateTax - discount
  }, [calculateSubtotal, calculateTax, discount])

  const handleCreateCustomer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single()

      if (error) throw error

      setSelectedCustomer(data)
      setShowCustomerModal(false)
      setNewCustomer({ name: '', cedula: '', email: '', phone: '', address: '' })
      fetchCustomers()
    } catch (error) {
      console.error('Error creating customer:', error)
      alert('Error al crear el cliente')
    }
  }, [newCustomer, fetchCustomers])

  const processSale = useCallback(async () => {
    if (cart.length === 0) {
      alert('El carrito está vacío')
      return
    }

    setLoading(true)

    try {
      // Create sale
      const saleData = {
        customer_id: selectedCustomer?.id || null,
        subtotal: calculateSubtotal,
        discount: discount,
        tax: calculateTax,
        total_amount: calculateTotal,
        payment_method: paymentMethod,
        status: 'completed'
      }

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Update inventory
      for (const item of cart) {
        const currentInventory = item.product.inventory?.[0]?.quantity || 0
        const newQuantity = currentInventory - item.quantity

        await supabase
          .from('inventory')
          .update({ quantity: Math.max(0, newQuantity), updated_at: new Date().toISOString() })
          .eq('product_id', item.product.id)
      }

      // Add to cash register
      await supabase
        .from('cash_register')
        .insert({
          type: 'sale',
          amount: calculateTotal,
          description: `Venta #${sale.id.slice(-8)} - ${selectedCustomer?.name || 'Cliente general'}`,
          reference_id: sale.id
        })

      // Set last sale for receipt
      setLastSale(sale)
      setShowReceipt(true)

      // Clear cart and reset form
      setCart([])
      setSelectedCustomer(null)
      setDiscount(0)
      setPaymentMethod('cash')
      
      // Refresh products to update inventory display
      fetchProducts()

    } catch (error) {
      console.error('Error processing sale:', error)
      alert('Error al procesar la venta')
    } finally {
      setLoading(false)
    }
  }, [cart, selectedCustomer, calculateSubtotal, calculateTax, calculateTotal, discount, paymentMethod, fetchProducts])

  const printReceipt = () => {
    if (!lastSale) return

    const receiptWindow = window.open('', '_blank', 'width=300,height=600')
    if (!receiptWindow) return

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Venta</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; margin: 10px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
          .info-line { display: flex; justify-content: space-between; margin: 3px 0; }
          .items { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin: 10px 0; }
          .total { font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>VENTASPRO</h2>
          <p>Sistema de Gestión</p>
        </div>
        
        <div class="info-line"><span>Venta #:</span><span>${lastSale.id.slice(-8)}</span></div>
        <div class="info-line"><span>Fecha:</span><span>${new Date(lastSale.created_at).toLocaleString('es-ES')}</span></div>
        <div class="info-line"><span>Cliente:</span><span>${selectedCustomer?.name || 'Cliente general'}</span></div>
        <div class="info-line"><span>Método:</span><span>${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</span></div>
        
        <div class="items">
          <strong>PRODUCTOS</strong><br>
          ${cart.map(item => `
            ${item.product.name}<br>
            ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.totalPrice)}<br>
          `).join('')}
        </div>
        
        <div class="info-line"><span>Subtotal:</span><span>${formatCurrency(calculateSubtotal())}</span></div>
        ${discount > 0 ? `<div class="info-line"><span>Descuento:</span><span>-${formatCurrency(discount)}</span></div>` : ''}
        <div class="info-line"><span>IVA (19%):</span><span>${formatCurrency(calculateTax)}</span></div>
        <div class="info-line total"><span>TOTAL:</span><span>${formatCurrency(calculateTotal)}</span></div>
        
        <div style="text-align: center; margin-top: 20px;">
          ¡Gracias por su compra!
        </div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `

    receiptWindow.document.write(receiptHTML)
    receiptWindow.document.close()
  }

  const filteredProducts = useMemo(() => products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [products, searchTerm])

  const formatCurrency = useMemo(() => (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'COP'
    }).format(amount)
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.image_alt || product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{product.name}</h3>
                    <p className="text-xs text-gray-500">Stock: {product.inventory?.[0]?.quantity || 0}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-blue-600">{formatCurrency(product.price)}</span>
                <Plus className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Carrito ({cart.length})
          </h2>
        </div>

        {/* Customer Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
          <div className="flex space-x-2">
            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const customer = customers.find(c => c.id === e.target.value)
                setSelectedCustomer(customer || null)
              }}
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Cliente general</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.cedula ? `- ${customer.cedula}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">El carrito está vacío</p>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">{item.product.name}</h4>
                  <p className="text-xs text-gray-500">{formatCurrency(item.unitPrice)} c/u</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="p-1 text-gray-500 hover:text-green-500 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-gray-500 hover:text-red-500 transition-colors ml-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-right ml-4">
                  <p className="font-medium text-gray-900">{formatCurrency(item.totalPrice)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Method */}
        <div className="mb-4">
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

        {/* Discount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Descuento</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
          />
        </div>

        {/* Totals */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatCurrency(calculateSubtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>IVA (19%):</span>
            <span>{formatCurrency(calculateTax)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>{formatCurrency(calculateTotal)}</span>
          </div>
        </div>

        {/* Process Sale Button */}
        <button
          onClick={processSale}
          disabled={cart.length === 0 || loading}
          className="w-full mt-4 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          ) : (
            <Calculator className="h-5 w-5 mr-2" />
          )}
          {loading ? 'Procesando...' : 'Procesar Venta'}
        </button>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Nuevo Cliente</h3>
            </div>
            
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cédula *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.cedula}
                  onChange={(e) => setNewCustomer({...newCustomer, cedula: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerModal(false)
                    setNewCustomer({ name: '', cedula: '', email: '', phone: '', address: '' })
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Venta Completada</h3>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">¡Venta Exitosa!</h4>
              <p className="text-gray-600 mb-4">
                Venta #{lastSale.id.slice(-8)} procesada correctamente
              </p>
              <p className="text-2xl font-bold text-green-600 mb-6">
                {formatCurrency(lastSale.total_amount)}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={printReceipt}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Imprimir
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewSale