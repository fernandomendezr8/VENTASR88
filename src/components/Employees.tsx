import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Users, Mail, Phone, MapPin, User, Shield, Eye, EyeOff, Calendar, DollarSign } from 'lucide-react'
import { supabase, Employee } from '../lib/supabase'

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'cashier' | 'viewer'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier' | 'viewer',
    phone: '',
    address: '',
    salary: '',
    hire_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchEmployees()
    getCurrentUserRole()
  }, [])

  const getCurrentUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('employees')
          .select('role')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()
        
        if (data) {
          setCurrentUserRole(data.role)
        }
      }
    } catch (error) {
      console.error('Error getting current user role:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })
      
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingEmployee) {
        // Update existing employee
        await supabase
          .from('employees')
          .update({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            phone: formData.phone,
            address: formData.address,
            salary: formData.salary ? parseFloat(formData.salary) : null,
            hire_date: formData.hire_date
          })
          .eq('id', editingEmployee.id)
      } else {
        // Create new employee (without user_id for now)
        await supabase
          .from('employees')
          .insert({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            phone: formData.phone,
            address: formData.address,
            salary: formData.salary ? parseFloat(formData.salary) : null,
            hire_date: formData.hire_date,
            status: 'active'
          })
      }

      setShowModal(false)
      setEditingEmployee(null)
      resetForm()
      fetchEmployees()
    } catch (error) {
      console.error('Error saving employee:', error)
      alert('Error al guardar el empleado')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'cashier',
      phone: '',
      address: '',
      salary: '',
      hire_date: new Date().toISOString().split('T')[0]
    })
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      phone: employee.phone || '',
      address: employee.address || '',
      salary: employee.salary?.toString() || '',
      hire_date: employee.hire_date
    })
    setShowModal(true)
  }

  const handleStatusChange = async (employeeId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      await supabase
        .from('employees')
        .update({ status: newStatus })
        .eq('id', employeeId)
      
      fetchEmployees()
    } catch (error) {
      console.error('Error updating employee status:', error)
      alert('Error al actualizar el estado del empleado')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este empleado?')) {
      try {
        await supabase.from('employees').delete().eq('id', id)
        fetchEmployees()
      } catch (error) {
        console.error('Error deleting employee:', error)
        alert('Error al eliminar el empleado')
      }
    }
  }

  const filteredEmployees = employees.filter(employee =>
    (employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     employee.phone?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (roleFilter === 'all' || employee.role === roleFilter) &&
    (statusFilter === 'all' || employee.status === statusFilter)
  )

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cashier':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'manager':
        return 'Gerente'
      case 'cashier':
        return 'Cajero'
      case 'viewer':
        return 'Consultor'
      default:
        return role
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'inactive':
        return 'Inactivo'
      case 'suspended':
        return 'Suspendido'
      default:
        return status
    }
  }

  const canManageEmployees = currentUserRole === 'admin'
  const canViewEmployees = ['admin', 'manager'].includes(currentUserRole)

  if (!canViewEmployees) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No tienes permisos para ver esta sección</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar empleados..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="manager">Gerentes</option>
            <option value="cashier">Cajeros</option>
            <option value="viewer">Consultores</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="suspended">Suspendidos</option>
          </select>
        </div>
        
        {canManageEmployees && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Nuevo Empleado
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Empleados</p>
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Empleados Activos</p>
              <p className="text-2xl font-bold text-green-600">
                {employees.filter(e => e.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <User className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Administradores</p>
              <p className="text-2xl font-bold text-red-600">
                {employees.filter(e => e.role === 'admin' && e.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cajeros</p>
              <p className="text-2xl font-bold text-purple-600">
                {employees.filter(e => e.role === 'cashier' && e.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empleado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Ingreso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salario
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron empleados' : 'No hay empleados registrados'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(employee.role)}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {getRoleText(employee.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {employee.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2" />
                            {employee.phone}
                          </div>
                        )}
                        {employee.address && (
                          <div className="flex items-start text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="truncate max-w-xs">{employee.address}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                          {getStatusText(employee.status)}
                        </span>
                        {canManageEmployees && employee.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(employee.id, 'suspended')}
                            className="p-1 text-orange-500 hover:bg-orange-50 rounded transition-colors"
                            title="Suspender"
                          >
                            <EyeOff size={14} />
                          </button>
                        )}
                        {canManageEmployees && employee.status === 'suspended' && (
                          <button
                            onClick={() => handleStatusChange(employee.id, 'active')}
                            className="p-1 text-green-500 hover:bg-green-50 rounded transition-colors"
                            title="Activar"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(employee.hire_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.salary ? formatCurrency(employee.salary) : 'No especificado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canManageEmployees && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(employee)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && canManageEmployees && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre completo del empleado"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="cashier">Cajero</option>
                    <option value="manager">Gerente</option>
                    <option value="viewer">Consultor</option>
                    {currentUserRole === 'admin' && (
                      <option value="admin">Administrador</option>
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Ingreso *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.hire_date}
                    onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+57 123 456 7890"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salario
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Dirección completa del empleado"
                />
              </div>

              {/* Role Permissions Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Permisos del Rol:</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  {formData.role === 'admin' && (
                    <p>• Acceso completo a todas las funciones del sistema</p>
                  )}
                  {formData.role === 'manager' && (
                    <>
                      <p>• Gestión de ventas, productos, inventario y clientes</p>
                      <p>• Visualización de reportes y empleados</p>
                      <p>• Sin acceso a configuración del sistema</p>
                    </>
                  )}
                  {formData.role === 'cashier' && (
                    <>
                      <p>• Punto de venta y gestión de clientes</p>
                      <p>• Consulta de productos e inventario</p>
                      <p>• Sin acceso a reportes o configuración</p>
                    </>
                  )}
                  {formData.role === 'viewer' && (
                    <>
                      <p>• Solo lectura de ventas, productos e inventario</p>
                      <p>• Acceso a reportes básicos</p>
                      <p>• Sin permisos de modificación</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingEmployee(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees