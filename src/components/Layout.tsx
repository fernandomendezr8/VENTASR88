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
  User
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

  const menuSections = [
    {
      title: 'Panel Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Resumen general' }
      ]
    },
    {
      title: 'Ventas',
      items: [
        { id: 'new-sale', label: 'Nueva Venta', icon: ShoppingCart, description: 'Punto de venta' },
        { id: 'sales', label: 'Historial de Ventas', icon: FileText, description: 'Ver todas las ventas' },
        { id: 'cash-register', label: 'Caja Registradora', icon: Calculator, description: 'Control de caja' }
      ]
    },
    {
      title: 'Inventario',
      items: [
        { id: 'products', label: 'Productos', icon: Package, description: 'Gestión de productos' },
        { id: 'categories', label: 'Categorías', icon: Tags, description: 'Organizar productos' },
        { id: 'inventory', label: 'Stock', icon: Archive, description: 'Control de inventario' }
      ]
    },
    {
      title: 'Contactos',
      items: [
        { id: 'customers', label: 'Clientes', icon: UserCheck, description: 'Base de clientes' },
        { id: 'suppliers', label: 'Proveedores', icon: Building2, description: 'Gestión de proveedores' }
      ]
    },
    {
      title: 'Reportes',
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg mr-3">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">VentasPro</h1>
              <p className="text-xs text-blue-100">Sistema de Gestión</p>
              <p className="text-blue-200 text-sm mt-1">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-blue-600 text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-6">
            {menuSections.map((section) => (
              <div key={section.title}>
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
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
                        <div className="flex-1 text-left">
                          <div className="font-medium">{item.label}</div>
                          <div className={`text-xs ${
                            isActive ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {item.description}
                          </div>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">A</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Administrador</p>
              <p className="text-xs text-gray-500">Sistema activo</p>
            </div>
          </div>
          
          <div className="p-4 border-t border-blue-700">
            <button
              onClick={onLogout}
              className="w-full flex items-center px-4 py-2 text-blue-200 hover:bg-blue-700 hover:text-white rounded-lg transition-colors"
            >
              <LogOut size={20} className="mr-3" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="flex items-center justify-between px-6 h-full">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center ml-2 lg:ml-0">
                <currentPageInfo.icon className="h-6 w-6 text-gray-600 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {currentPageInfo.label}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {getCurrentPageInfo().description || 'Gestión del sistema'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>Sistema Online</span>
                </div>
              </div>
              
              {/* User Avatar */}
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">A</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
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