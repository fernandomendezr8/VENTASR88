import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, RefreshCw, Database, Shield, Bell, Palette, Globe, Lock, User, Mail, Phone, MapPin, DollarSign, Percent, Hash, Eye, EyeOff, Download, Upload, Trash2, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface SystemSettings {
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyWebsite: string
  companyLogo: string
  currency: string
  taxRate: number
  lowStockThreshold: number
  enableNotifications: boolean
  enableEmailReports: boolean
  autoBackup: boolean
  theme: string
  language: string
  timezone: string
  receiptFooter: string
  maxDiscountPercent: number
  requireCustomerForSales: boolean
  enableInventoryAlerts: boolean
  backupFrequency: string
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('company')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [systemInfo, setSystemInfo] = useState<any>(null)

  const [settings, setSettings] = useState<SystemSettings>({
    companyName: 'VentasPro',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    companyLogo: '',
    currency: 'COP',
    taxRate: 19,
    lowStockThreshold: 5,
    enableNotifications: true,
    enableEmailReports: false,
    autoBackup: true,
    theme: 'light',
    language: 'es',
    timezone: 'America/Bogota',
    receiptFooter: '¡Gracias por su compra!',
    maxDiscountPercent: 50,
    requireCustomerForSales: false,
    enableInventoryAlerts: true,
    backupFrequency: 'daily'
  })

  useEffect(() => {
    loadSettings()
    getCurrentUser()
    getSystemInfo()
  }, [])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        const { data: employee } = await supabase
          .from('employees')
          .select('role')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
        
        if (employee) {
          setUserRole(employee.role)
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error)
    }
  }

  const getSystemInfo = async () => {
    try {
      // Obtener estadísticas del sistema
      const { data: stats } = await supabase.rpc('get_system_stats')
      
      // Obtener información de tablas
      const { data: tables } = await supabase.rpc('get_table_info')
      
      setSystemInfo({
        stats: stats || [],
        tables: tables || [],
        version: '2.1.0',
        database: 'PostgreSQL 15.0',
        lastUpdate: new Date().toLocaleDateString('es-ES')
      })
    } catch (error) {
      console.error('Error getting system info:', error)
      setSystemInfo({
        stats: [],
        tables: [],
        version: '2.1.0',
        database: 'PostgreSQL 15.0',
        lastUpdate: new Date().toLocaleDateString('es-ES')
      })
    }
  }

  const loadSettings = async () => {
    try {
      // Cargar configuraciones desde localStorage
      const savedSettings = localStorage.getItem('ventaspro_settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      }

      // También intentar cargar desde la base de datos si existe una tabla de configuraciones
      // Por ahora usamos localStorage como almacenamiento principal
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSaveSuccess(false)
    
    try {
      // Validaciones
      if (!settings.companyName.trim()) {
        throw new Error('El nombre de la empresa es requerido')
      }
      
      if (settings.taxRate < 0 || settings.taxRate > 100) {
        throw new Error('La tasa de IVA debe estar entre 0 y 100')
      }
      
      if (settings.lowStockThreshold < 1) {
        throw new Error('El umbral de stock bajo debe ser mayor a 0')
      }

      if (settings.maxDiscountPercent < 0 || settings.maxDiscountPercent > 100) {
        throw new Error('El descuento máximo debe estar entre 0 y 100')
      }

      // Guardar en localStorage
      localStorage.setItem('ventaspro_settings', JSON.stringify(settings))
      
      // Simular guardado en base de datos
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSaveSuccess(true)
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
      
    } catch (error: any) {
      console.error('Error saving settings:', error)
      setError(error.message || 'Error al guardar la configuración. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (confirm('¿Está seguro de que desea restablecer la configuración a los valores por defecto?\n\nEsta acción no se puede deshacer.')) {
      setSettings({
        companyName: 'VentasPro',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        companyWebsite: '',
        companyLogo: '',
        currency: 'COP',
        taxRate: 19,
        lowStockThreshold: 5,
        enableNotifications: true,
        enableEmailReports: false,
        autoBackup: true,
        theme: 'light',
        language: 'es',
        timezone: 'America/Bogota',
        receiptFooter: '¡Gracias por su compra!',
        maxDiscountPercent: 50,
        requireCustomerForSales: false,
        enableInventoryAlerts: true,
        backupFrequency: 'daily'
      })
      setError('')
      setSaveSuccess(false)
    }
  }

  const exportSettings = () => {
    try {
      const dataStr = JSON.stringify(settings, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ventaspro-configuracion-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setError('Error al exportar la configuración')
    }
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        setSettings(prev => ({ ...prev, ...imported }))
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } catch (error) {
        setError('Error al importar la configuración. Verifique que el archivo sea válido.')
      }
    }
    reader.readAsText(file)
  }

  const cleanupData = async () => {
    if (confirm('¿Está seguro de que desea limpiar datos huérfanos?\n\nEsto eliminará registros inconsistentes pero no afectará los datos principales.')) {
      try {
        setLoading(true)
        await supabase.rpc('clean_orphaned_data')
        alert('Datos huérfanos limpiados exitosamente')
        getSystemInfo() // Actualizar estadísticas
      } catch (error) {
        setError('Error al limpiar datos huérfanos')
      } finally {
        setLoading(false)
      }
    }
  }

  const tabs = [
    { id: 'company', label: 'Empresa', icon: Globe },
    { id: 'business', label: 'Negocio', icon: SettingsIcon },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'system', label: 'Sistema', icon: Database }
  ]

  const canManageSettings = userRole === 'admin'

  if (!canManageSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No tienes permisos para acceder a la configuración</p>
          <p className="text-xs text-gray-400 mt-2">Solo los administradores pueden modificar la configuración del sistema</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-600">Personaliza y configura tu sistema de ventas</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportSettings}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
          >
            <Download size={20} className="mr-2" />
            Exportar
          </button>
          <label className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center cursor-pointer">
            <Upload size={20} className="mr-2" />
            Importar
            <input
              type="file"
              accept=".json"
              onChange={importSettings}
              className="hidden"
            />
          </label>
          <button
            onClick={handleReset}
            disabled={loading}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center"
          >
            <RefreshCw size={20} className="mr-2" />
            Restablecer
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <Save size={20} className="mr-2" />
            )}
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-800">
                ¡Configuración guardada exitosamente!
              </p>
              <p className="text-sm text-green-700 mt-1">
                Todos los cambios han sido aplicados correctamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-red-800">Error al guardar</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Company Information Tab */}
        {activeTab === 'company' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-blue-100 rounded-full mr-4">
                  <Globe className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Información de la Empresa</h3>
                  <p className="text-sm text-gray-600">Datos básicos de tu negocio</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="h-4 w-4 inline mr-1" />
                    Nombre de la Empresa *
                  </label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre de tu empresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Dirección
                  </label>
                  <textarea
                    value={settings.companyAddress}
                    onChange={(e) => setSettings({...settings, companyAddress: e.target.value})}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Dirección completa de la empresa"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={settings.companyPhone}
                      onChange={(e) => setSettings({...settings, companyPhone: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+57 123 456 7890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="h-4 w-4 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings.companyEmail}
                      onChange={(e) => setSettings({...settings, companyEmail: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="h-4 w-4 inline mr-1" />
                    Sitio Web
                  </label>
                  <input
                    type="url"
                    value={settings.companyWebsite}
                    onChange={(e) => setSettings({...settings, companyWebsite: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://www.empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pie de Página del Recibo
                  </label>
                  <textarea
                    value={settings.receiptFooter}
                    onChange={(e) => setSettings({...settings, receiptFooter: e.target.value})}
                    rows={2}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Mensaje que aparece en los recibos"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-purple-100 rounded-full mr-4">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Usuario Actual</h3>
                  <p className="text-sm text-gray-600">Información de tu cuenta</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Email:</span>
                    <span className="text-sm text-gray-900">{currentUser?.email}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Rol:</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      userRole === 'admin' ? 'bg-red-100 text-red-800' :
                      userRole === 'manager' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {userRole === 'admin' ? 'Administrador' :
                       userRole === 'manager' ? 'Gerente' :
                       userRole === 'cashier' ? 'Cajero' : 'Usuario'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Último acceso:</span>
                    <span className="text-sm text-gray-900">{new Date().toLocaleDateString('es-ES')}</span>
                  </div>
                </div>

                <button className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Cambiar Contraseña
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Business Settings Tab */}
        {activeTab === 'business' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-green-100 rounded-full mr-4">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Configuración Financiera</h3>
                  <p className="text-sm text-gray-600">Parámetros monetarios y fiscales</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="h-4 w-4 inline mr-1" />
                      Moneda
                    </label>
                    <select
                      value={settings.currency}
                      onChange={(e) => setSettings({...settings, currency: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="COP">Peso Colombiano (COP)</option>
                      <option value="USD">Dólar Americano (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="MXN">Peso Mexicano (MXN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Percent className="h-4 w-4 inline mr-1" />
                      Tasa de IVA (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={settings.taxRate}
                      onChange={(e) => setSettings({...settings, taxRate: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Percent className="h-4 w-4 inline mr-1" />
                    Descuento Máximo Permitido (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.maxDiscountPercent}
                    onChange={(e) => setSettings({...settings, maxDiscountPercent: parseInt(e.target.value) || 0})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Porcentaje máximo de descuento"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Hash className="h-4 w-4 inline mr-1" />
                    Umbral de Stock Bajo
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.lowStockThreshold}
                    onChange={(e) => setSettings({...settings, lowStockThreshold: parseInt(e.target.value) || 5})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Cantidad mínima para alertas"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-orange-100 rounded-full mr-4">
                  <SettingsIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Configuración Operativa</h3>
                  <p className="text-sm text-gray-600">Reglas de negocio y operación</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Requerir Cliente en Ventas</h4>
                    <p className="text-xs text-gray-600">Obligar a seleccionar un cliente para cada venta</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.requireCustomerForSales}
                      onChange={(e) => setSettings({...settings, requireCustomerForSales: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Alertas de Inventario</h4>
                    <p className="text-xs text-gray-600">Mostrar notificaciones cuando el stock esté bajo</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableInventoryAlerts}
                      onChange={(e) => setSettings({...settings, enableInventoryAlerts: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tema de la Aplicación
                  </label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings({...settings, theme: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Oscuro</option>
                    <option value="auto">Automático</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({...settings, language: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-yellow-100 rounded-full mr-4">
                <Bell className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
                <p className="text-sm text-gray-600">Configurar alertas y notificaciones</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Notificaciones del Sistema</h4>
                  <p className="text-xs text-gray-600">Alertas de stock bajo, ventas importantes, etc.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => setSettings({...settings, enableNotifications: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Reportes por Email</h4>
                  <p className="text-xs text-gray-600">Recibir reportes diarios/semanales por correo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableEmailReports}
                    onChange={(e) => setSettings({...settings, enableEmailReports: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-red-100 rounded-full mr-4">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Seguridad y Respaldos</h3>
                  <p className="text-sm text-gray-600">Configuración de seguridad y copias de seguridad</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Respaldo Automático</h4>
                    <p className="text-xs text-gray-600">Crear copias de seguridad automáticas</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoBackup}
                      onChange={(e) => setSettings({...settings, autoBackup: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frecuencia de Respaldo
                  </label>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) => setSettings({...settings, backupFrequency: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!settings.autoBackup}
                  >
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 text-blue-600 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Estado de la Base de Datos</h4>
                      <p className="text-xs text-blue-700">Última sincronización: Hace 2 minutos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-orange-100 rounded-full mr-4">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mantenimiento</h3>
                  <p className="text-sm text-gray-600">Herramientas de limpieza y optimización</p>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={cleanupData}
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  Limpiar Datos Huérfanos
                </button>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-900">Información</h4>
                      <p className="text-xs text-yellow-700 mt-1">
                        La limpieza de datos huérfanos elimina registros inconsistentes pero no afecta los datos principales.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* System Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-purple-100 rounded-full mr-4">
                  <Database className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Información del Sistema</h3>
                  <p className="text-sm text-gray-600">Detalles técnicos y estadísticas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900">Versión</h4>
                  <p className="text-sm text-gray-600">{systemInfo?.version || 'VentasPro v2.1.0'}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900">Base de Datos</h4>
                  <p className="text-sm text-gray-600">{systemInfo?.database || 'PostgreSQL 15.0'}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900">Última Actualización</h4>
                  <p className="text-sm text-gray-600">{systemInfo?.lastUpdate || new Date().toLocaleDateString('es-ES')}</p>
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <div className="border-t pt-6">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">Configuración Avanzada</span>
                  {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zona Horaria
                        </label>
                        <select
                          value={settings.timezone}
                          onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="America/Bogota">Bogotá (GMT-5)</option>
                          <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                          <option value="America/New_York">Nueva York (GMT-5)</option>
                          <option value="Europe/Madrid">Madrid (GMT+1)</option>
                        </select>
                      </div>
                    </div>

                    {/* System Statistics */}
                    {systemInfo?.stats && systemInfo.stats.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Estadísticas del Sistema</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {systemInfo.stats.map((stat: any, index: number) => (
                            <div key={index} className="bg-blue-50 p-3 rounded-lg">
                              <div className="text-lg font-bold text-blue-600">{stat.metric_value}</div>
                              <div className="text-xs text-blue-700">{stat.metric_description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings