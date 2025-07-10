import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Users, Mail, Phone, MapPin, User, Shield, Eye, EyeOff, Calendar, DollarSign, UserPlus, Crown, Settings } from 'lucide-react'
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
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [permissionsLoading, setPermissionsLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier' | 'viewer',
    phone: '',
    address: '',
    salary: '',
    hire_date: new Date().toISOString().split('T')[0]
  })

  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier' | 'viewer',
    phone: '',
    temporaryPassword: ''
  })

  useEffect(() => {
    fetchEmployees()
    getCurrentUserRole()
  }, [])

  const getCurrentUserRole = async () => {
    setPermissionsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Primero verificar si existe un empleado para este usuario
        const { data: employee } = await supabase
          .from('employees')
          .select('role')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
        
        if (employee) {
          setCurrentUserRole(employee.role)
        } else {
          // Si no existe empleado, verificar si es el primer usuario y crear admin
          const { count } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
          
          if (count === 0 || count === null) {
            // Es el primer usuario, crear como admin
            const { data: newEmployee, error } = await supabase
              .from('employees')
              .insert({
                user_id: user.id,
                name: user.email?.split('@')[0] || 'Administrador',
                email: user.email || '',
                role: 'admin',
                status: 'active'
              })
              .select()
              .single()
            
            if (!error && newEmployee) {
              setCurrentUserRole('admin')
            }
          } else {
            // No es el primer usuario y no tiene empleado, sin permisos
            setCurrentUserRole('none')
          }
        }
      } else {
        setCurrentUserRole('none')
      }
    } catch (error) {
      console.error('Error getting current user role:', error)
      setCurrentUserRole('none')
    } finally {
      setPermissionsLoading(false)
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

  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleInviteEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Generar contraseña temporal si no se proporcionó
      const tempPassword = inviteData.temporaryPassword || generateTemporaryPassword()

      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: inviteData.email,
        password: tempPassword,
        email_confirm: true
      })

      if (authError) throw authError

      // Crear registro de empleado
      const { error: employeeError } = await supabase
        .from('employees')
        .insert({
          user_id: authData.user.id,
          name: inviteData.name,
          email: inviteData.email,
          role: inviteData.role,
          phone: inviteData.phone,
          status: 'active',
          hire_date: new Date().toISOString().split('T')[0]
        })

      if (employeeError) throw employeeError

      // Mostrar información de acceso
      alert(`Empleado creado exitosamente!\n\nEmail: ${inviteData.email}\nContraseña temporal: ${tempPassword}\n\nEl empleado debe cambiar su contraseña en el primer inicio de sesión.`)

      setShowInviteModal(false)
      resetInviteForm()
      fetchEmployees()
    } catch (error: any) {
      console.error('Error inviting employee:', error)
      if (error.message?.includes('User already registered')) {
        alert('Este email ya está registrado en el sistema.')
      } else {
        alert('Error al crear el empleado: ' + error.message)
      }
    } finally {
      setLoading(false)
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

  const resetInviteForm = () => {
    setInviteData({
      name: '',
      email: '',
      role: 'cashier',
      phone: '',
      temporaryPassword: ''
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
    if (confirm('¿Está seguro de que desea eliminar este empleado? Esta acción no se puede deshacer.')) {
      try {
        await supabase.from('employees').delete().eq('id', id)
        fetchEmployees()
      } catch (error) {
        console.error('Error deleting employee:', error)
        alert('Error al eliminar el empleado')
      }
    }
  }

  const promoteToAdmin = async (employeeId: string) => {
    if (confirm('¿Está seguro de que desea promover este empleado a Administrador?\n\nEsto le dará:\n• Acceso completo al sistema\n• Capacidad de gestionar otros empleados\n• Control sobre todas las configuraciones')) {
      try {
        await supabase
          .from('employees')
          .update({ role: 'admin' })
          .eq('id', employeeId)
        
        fetchEmployees()
        alert('Empleado promovido a Administrador exitosamente')
      } catch (error) {
        console.error('Error promoting employee:', error)
        alert('Error al promover el empleado')
      }
    }
  }

  const demoteFromAdmin = async (employeeId: string) => {
    if (confirm('¿Está seguro de que desea quitar los privilegios de Administrador a este empleado?\n\nSe convertirá en Gerente y perderá:\n• Acceso a gestión de empleados\n• Control sobre configuraciones del sistema')) {
      try {
        await supabase
          .from('employees')
          .update({ role: 'manager' })
          .eq('id', employeeId)
        
        fetchEmployees()
        alert('Privilegios de Administrador removidos exitosamente. El empleado ahora es Gerente.')
      } catch (error) {
        console.error('Error demoting admin:', error)
        alert('Error al cambiar el rol del empleado')
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3 mr-1" />
      case 'manager':
        return <Settings className="h-3 w-3 mr-1" />
      case 'cashier':
        return <DollarSign className="h-3 w-3 mr-1" />
      case 'viewer':
        return <Eye className="h-3 w-3 mr-1" />
      default:
        return <User className="h-3 w-3 mr-1" />
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

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!canViewEmployees && currentUserRole !== 'none') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No tienes permisos para ver esta sección</p>
          <p className="text-xs text-gray-400 mt-2">Rol actual: {currentUserRole}</p>
        </div>
      </div>
    )
  }

  if (currentUserRole === 'none') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Tu usuario no está registrado como empleado</p>
          <p className="text-xs text-gray-400 mt-2">Contacta al administrador para obtener acceso</p>
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
          <div className="flex space-x-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
            >
              <UserPlus size={20} className="mr-2" />
              Invitar Empleado
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
            >
              <Plus size={20} className="mr-2" />
              Nuevo Empleado
            </button>
          </div>
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
              <Crown className="h-6 w-6 text-red-600" />
            </div>
          </div>
          {currentUserRole === 'admin' && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Puedes promover empleados a administradores usando el botón <Crown className="h-3 w-3 inline text-purple-500" />
              </p>
            </div>
          )}
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
                        {getRoleIcon(employee.role)}
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
                          {employee.role !== 'admin' && currentUserRole === 'admin' && (
                            <button
                              onClick={() => promoteToAdmin(employee.id)}
                              className="p-2 text-purple-500 hover:bg-purple-50 rounded-full transition-colors"
                              title="Promover a Administrador"
                            >
                              <Crown size={16} />
                            </button>
                          )}
                          {employee.role === 'admin' && currentUserRole === 'admin' && employee.user_id !== user?.id && (
                            <button
                              onClick={() => demoteFromAdmin(employee.id)}
                              className="p-2 text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
                              title="Quitar privilegios de Administrador"
                            >
                              <User size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(employee)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          {employee.user_id !== user?.id && (
                            <button
                              onClick={() => handleDelete(employee.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              title="Eliminar empleado"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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

      {/* Invite Employee Modal */}
      {showInviteModal && canManageEmployees && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Invitar Nuevo Empleado
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Se creará una cuenta y se enviará la información de acceso
              </p>
            </div>
            
            <form onSubmit={handleInviteEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={inviteData.name}
                  onChange={(e) => setInviteData({...inviteData, name: e.target.value})}
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
                  value={inviteData.email}
                  onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol *
                </label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({...inviteData, role: e.target.value as any})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="cashier">Cajero</option>
                  <option value="manager">Gerente</option>
                  <option value="viewer">Consultor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={inviteData.phone}
                  onChange={(e) => setInviteData({...inviteData, phone: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+57 123 456 7890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña Temporal (opcional)
                </label>
                <input
                  type="text"
                  value={inviteData.temporaryPassword}
                  onChange={(e) => setInviteData({...inviteData, temporaryPassword: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Se generará automáticamente si se deja vacío"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si no especificas una contraseña, se generará una automáticamente
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Permisos del Rol:</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  {inviteData.role === 'admin' && (
                    <>
                      <p>• Acceso completo a todas las funciones del sistema</p>
                      <p>• Puede crear y gestionar otros administradores</p>
                      <p>• Control total sobre empleados y configuraciones</p>
                    </>
                  )}
                  {inviteData.role === 'manager' && (
                    <>
                      <p>• Gestión de ventas, productos, inventario y clientes</p>
                      <p>• Visualización de reportes y empleados</p>
                    </>
                  )}
                  {inviteData.role === 'cashier' && (
                    <>
                      <p>• Punto de venta y gestión de clientes</p>
                      <p>• Consulta de productos e inventario</p>
                    </>
                  )}
                  {inviteData.role === 'viewer' && (
                    <>
                      <p>• Solo lectura de ventas, productos e inventario</p>
                      <p>• Acceso a reportes básicos</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false)
                    resetInviteForm()
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Invitando...' : 'Invitar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
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