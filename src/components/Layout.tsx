import React from 'react'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Tags, 
  Truck, 
  Users, 
  Archive, 
  Calculator,
  Menu,
  X,
  TrendingUp,
  FileText,
  UserCheck,
  Building2,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Shield,
  Settings,
  Crown,
  Bell,
  Search,
  Sun,
  Moon
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onPageChange: (page: string) => void
  user: SupabaseUser
  onLogout: () => void
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    'ventas': true,
    'inventario': true,
    'contactos': false,
    'administracion': false,
    'reportes': false
  })
  const [darkMode, setDarkMode] = React.useState(false)

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const menuSections = [
    {
      id: 'principal',
      title: 'Panel Principal',
      icon: LayoutDashboard,
      color: 'from-blue-500 to-blue-600',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Resumen general del negocio', color: 'text-blue-600' }
      ]
    },
    {
      id: 'ventas',
      title: 'Punto de Venta',
      icon: ShoppingCart,
      color: 'from-green-500 to-green-600',
      items: [
        { id: 'new-sale', label: 'Nueva Venta', icon: ShoppingCart, description: 'Realizar nueva venta', color: 'text-green-600' },
        { id: 'sales', label: 'Historial de Ventas', icon: FileText, description: 'Ver todas las ventas', color: 'text-green-600' },
        { id: 'cash-register', label: 'Caja Registradora', icon: Calculator, description: 'Control de caja y movimientos', color: 'text-green-600' }
      ]
    },
    {
      id: 'inventario',
      title: 'Inventario',
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      items: [
        { id: 'products', label: 'Productos', icon: Package, description: 'Gestión de productos', color: 'text-purple-600' },
        { id: 'categories', label: 'Categorías', icon: Tags, description: 'Organizar productos por categorías', color: 'text-purple-600' },
        { id: 'inventory', label: 'Control de Stock', icon: Archive, description: 'Monitoreo de inventario', color: 'text-purple-600' }
      ]
    },
    {
      id: 'contactos',
      title: 'Contactos',
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      items: [
        { id: 'customers', label: 'Clientes', icon: UserCheck, description: 'Base de datos de clientes', color: 'text-orange-600' },
        { id: 'suppliers', label: 'Proveedores', icon: Building2, description: 'Gestión de proveedores', color: 'text-orange-600' }
      ]
    },
    {
      id: 'administracion',
      title: 'Administración',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      items: [
        { id: 'employees', label: 'Empleados', icon: Users, description: 'Gestión de empleados y administradores', color: 'text-red-600' },
        { id: 'settings', label: 'Configuración', icon: Settings, description: 'Configuración del sistema', color: 'text-red-600' }
      ]
    },
    {
      id: 'reportes',
      title: 'Reportes',
      icon: TrendingUp,
      color: 'from-indigo-500 to-indigo-600',
      items: [
        { id: 'reports', label: 'Análisis y Reportes', icon: TrendingUp, description: 'Estadísticas y análisis de ventas', color: 'text-indigo-600' }
      ]
    }
  ]

  const getCurrentPageInfo = () => {
    for (const section of menuSections) {
      const item = section.items.find(item => item.id === currentPage)
      if (item) return item
    }
    return { label: 'Dashboard', icon: LayoutDashboard, description: 'Panel principal', color: 'text-blue-600' }
  }

  const currentPageInfo = getCurrentPageInfo()

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-900 shadow-2xl transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:w-72 xl:w-80 border-r border-gray-200 dark:border-gray-700`}>
        
        {/* Header */}
        <div className="relative h-20 px-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-12 translate-y-12"></div>
          </div>
          
          <div className="relative flex items-center justify-between h-full">
            <div className="flex items-center min-w-0">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl mr-3 flex-shrink-0 shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white truncate">VentasPro</h1>
                <p className="text-xs text-blue-100 hidden sm:block">Sistema de Gestión Comercial</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-colors flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* User Info - Mobile */}
        <div className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-semibold text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.email?.split('@')[0] || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="space-y-6">
            {menuSections.map((section) => (
              <div key={section.id}>
                {section.id === 'principal' ? (
                  // Principal section - no collapsible
                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const isActive = currentPage === item.id
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onPageChange(item.id)
                            setSidebarOpen(false)
                          }}
                          className={`w-full group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 transform scale-[1.02]'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md hover:scale-[1.01]'
                          }`}
                        >
                          <div className={`p-2 rounded-lg mr-3 flex-shrink-0 ${
                            isActive 
                              ? 'bg-white/20' 
                              : 'bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                            <Icon 
                              size={18} 
                              className={isActive ? 'text-white' : item.color} 
                            />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-semibold truncate">{item.label}</div>
                            <div className={`text-xs truncate ${
                              isActive ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {item.description}
                            </div>
                          </div>
                          {isActive && (
                            <div className="w-2 h-2 bg-white rounded-full flex-shrink-0 animate-pulse"></div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  // Collapsible sections
                  <div>
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center">
                        <div className={`p-1.5 rounded-lg mr-2 bg-gradient-to-r ${section.color}`}>
                          <section.icon className="h-3 w-3 text-white" />
                        </div>
                        <span>{section.title}</span>
                      </div>
                      <div className="transition-transform duration-200">
                        {expandedSections[section.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </button>
                    
                    {expandedSections[section.id] && (
                      <div className="mt-3 space-y-2 ml-2">
                        {section.items.map((item) => {
                          const Icon = item.icon
                          const isActive = currentPage === item.id
                          
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                onPageChange(item.id)
                                setSidebarOpen(false)
                              }}
                              className={`w-full group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                                isActive
                                  ? `bg-gradient-to-r ${section.color} text-white shadow-lg transform scale-[1.02]`
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md hover:scale-[1.01]'
                              }`}
                            >
                              <div className={`p-2 rounded-lg mr-3 flex-shrink-0 ${
                                isActive 
                                  ? 'bg-white/20' 
                                  : 'bg-gray-100 dark:bg-gray-800'
                              }`}>
                                <Icon 
                                  size={16} 
                                  className={isActive ? 'text-white' : item.color} 
                                />
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <div className="font-semibold truncate">{item.label}</div>
                                <div className={`text-xs truncate hidden lg:block ${
                                  isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {item.description}
                                </div>
                              </div>
                              {isActive && (
                                <div className="w-2 h-2 bg-white rounded-full flex-shrink-0 animate-pulse"></div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer - Desktop */}
        <div className="hidden lg:block p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-semibold text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.email?.split('@')[0] || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {new Date().toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex-1 flex items-center justify-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Footer - Mobile */}
        <div className="lg:hidden p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex-1 flex items-center justify-center px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
            >
              {darkMode ? <Sun size={18} className="mr-2" /> : <Moon size={18} className="mr-2" />}
              <span className="text-sm">{darkMode ? 'Claro' : 'Oscuro'}</span>
            </button>
            
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
            >
              <LogOut size={18} className="mr-2" />
              <span className="text-sm">Salir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 h-16 flex-shrink-0">
          <div className="flex items-center justify-between px-4 lg:px-6 h-full">
            <div className="flex items-center min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-2 flex-shrink-0"
              >
                <Menu size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center min-w-0">
                <div className={`p-2 rounded-lg mr-3 flex-shrink-0 ${
                  currentPageInfo.color?.includes('blue') ? 'bg-blue-100 dark:bg-blue-900/30' :
                  currentPageInfo.color?.includes('green') ? 'bg-green-100 dark:bg-green-900/30' :
                  currentPageInfo.color?.includes('purple') ? 'bg-purple-100 dark:bg-purple-900/30' :
                  currentPageInfo.color?.includes('orange') ? 'bg-orange-100 dark:bg-orange-900/30' :
                  currentPageInfo.color?.includes('red') ? 'bg-red-100 dark:bg-red-900/30' :
                  'bg-indigo-100 dark:bg-indigo-900/30'
                }`}>
                  <currentPageInfo.icon className={`h-5 w-5 lg:h-6 lg:w-6 ${currentPageInfo.color} flex-shrink-0`} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg lg:text-xl font-bold text-gray-800 dark:text-white truncate">
                    {currentPageInfo.label}
                  </h2>
                  <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:block">
                    {currentPageInfo.description}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="hidden lg:inline">Sistema Online</span>
                  <span className="lg:hidden">Online</span>
                </div>
              </div>
              
              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              {/* User Avatar - Desktop */}
              <div className="hidden lg:flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Layout