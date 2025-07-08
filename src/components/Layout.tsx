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
  ChevronRight
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
    'reportes': false
  })

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
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Resumen general' }
      ]
    },
    {
      id: 'ventas',
      title: 'Ventas',
      icon: ShoppingCart,
      items: [
        { id: 'new-sale', label: 'Nueva Venta', icon: ShoppingCart, description: 'Punto de venta' },
        { id: 'sales', label: 'Historial', icon: FileText, description: 'Ver todas las ventas' },
        { id: 'cash-register', label: 'Caja', icon: Calculator, description: 'Control de caja' }
      ]
    },
    {
      id: 'inventario',
      title: 'Inventario',
      icon: Package,
      items: [
        { id: 'products', label: 'Productos', icon: Package, description: 'Gestión de productos' },
        { id: 'categories', label: 'Categorías', icon: Tags, description: 'Organizar productos' },
        { id: 'inventory', label: 'Stock', icon: Archive, description: 'Control de inventario' }
      ]
    },
    {
      id: 'contactos',
      title: 'Contactos',
      icon: Users,
      items: [
        { id: 'customers', label: 'Clientes', icon: UserCheck, description: 'Base de clientes' },
        { id: 'suppliers', label: 'Proveedores', icon: Building2, description: 'Gestión de proveedores' }
      ]
    },
    {
      id: 'reportes',
      title: 'Reportes',
      icon: TrendingUp,
      items: [
        { id: 'reports', label: 'Reportes', icon: TrendingUp, description: 'Análisis y estadísticas' }
      ]
    }
  ]

  const getCurrentPageInfo = () => {
    for (const section of menuSections) {
      const item = section.items.find(item => item.id === currentPage)
      if (item) return item
    }
    return { label: 'Dashboard', icon: LayoutDashboard }
  }

  const currentPageInfo = getCurrentPageInfo()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:w-72 xl:w-80`}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 lg:px-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center min-w-0">
            <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg mr-3 flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">VentasPro</h1>
              <p className="text-xs text-blue-100 hidden sm:block">Sistema de Gestión</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-blue-600 text-white transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* User Info - Mobile */}
        <div className="lg:hidden p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-medium text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.email?.split('@')[0] || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 lg:px-4 py-4 lg:py-6 overflow-y-auto">
          <div className="space-y-4 lg:space-y-6">
            {menuSections.map((section) => (
              <div key={section.id}>
                {section.id === 'principal' ? (
                  // Principal section - no collapsible
                  <div className="space-y-1">
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
                          className={`w-full group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-500 shadow-sm'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <Icon 
                            size={20} 
                            className={`mr-3 flex-shrink-0 transition-colors ${
                              isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                            }`} 
                          />
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-medium truncate">{item.label}</div>
                            <div className={`text-xs truncate ${
                              isActive ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                              {item.description}
                            </div>
                          </div>
                          {isActive && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
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
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    >
                      <div className="flex items-center">
                        <section.icon className="h-4 w-4 mr-2" />
                        <span>{section.title}</span>
                      </div>
                      {expandedSections[section.id] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    
                    {expandedSections[section.id] && (
                      <div className="mt-2 space-y-1">
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
                              className={`w-full group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                                isActive
                                  ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-500 shadow-sm'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <Icon 
                                size={18} 
                                className={`mr-3 flex-shrink-0 transition-colors ${
                                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                                }`} 
                              />
                              <div className="flex-1 text-left min-w-0">
                                <div className="font-medium truncate">{item.label}</div>
                                <div className={`text-xs truncate hidden lg:block ${
                                  isActive ? 'text-blue-600' : 'text-gray-500'
                                }`}>
                                  {item.description}
                                </div>
                              </div>
                              {isActive && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
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
        <div className="hidden lg:block p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-medium text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.email?.split('@')[0] || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {new Date().toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
          >
            <LogOut size={16} className="mr-3 flex-shrink-0" />
            <span className="truncate">Cerrar Sesión</span>
          </button>
        </div>

        {/* Footer - Mobile */}
        <div className="lg:hidden p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center px-4 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
          >
            <LogOut size={18} className="mr-2" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex-shrink-0">
          <div className="flex items-center justify-between px-4 lg:px-6 h-full">
            <div className="flex items-center min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors mr-2 flex-shrink-0"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center min-w-0">
                <currentPageInfo.icon className="h-5 w-5 lg:h-6 lg:w-6 text-gray-600 mr-2 lg:mr-3 flex-shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-800 truncate">
                    {currentPageInfo.label}
                  </h2>
                  <p className="text-xs lg:text-sm text-gray-500 truncate hidden sm:block">
                    {getCurrentPageInfo().description || 'Gestión del sistema'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="hidden lg:inline">Sistema Online</span>
                  <span className="lg:hidden">Online</span>
                </div>
              </div>
              
              {/* User Avatar - Desktop */}
              <div className="hidden lg:flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Layout