import React, { useState } from 'react'
import { Mail, Lock, User, LogIn } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AuthProps {
  onAuthSuccess: () => void
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        })
        
        if (error) throw error
        onAuthSuccess()
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden')
          setLoading(false)
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password
        })
        
        if (error) throw error
        
        // Si el registro fue exitoso y hay un usuario, crear el empleado
        if (data.user) {
          // Verificar si es el primer usuario (será admin)
          const { count } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
          
          const isFirstUser = count === 0 || count === 1 // Considerando el registro placeholder
          
          // Crear empleado
          await supabase
            .from('employees')
            .insert({
              user_id: data.user.id,
              name: formData.email.split('@')[0], // Usar parte del email como nombre temporal
              email: formData.email,
              role: isFirstUser ? 'admin' : 'cashier',
              status: 'active'
            })
          
          // Si es el primer usuario, actualizar el registro placeholder
          if (isFirstUser) {
            await supabase
              .from('employees')
              .update({
                user_id: data.user.id,
                name: formData.email.split('@')[0],
                email: formData.email
              })
              .is('user_id', null)
          }
        }
        
        setError('')
        setIsLogin(true)
        setFormData({ email: '', password: '', confirmPassword: '' })
        // Show success message briefly
        const successMsg = document.createElement('div')
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
        successMsg.textContent = 'Cuenta creada exitosamente. Ya puedes iniciar sesión.'
        document.body.appendChild(successMsg)
        setTimeout(() => document.body.removeChild(successMsg), 3000)
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.message?.includes('Invalid login credentials')) {
        setError(isLogin 
          ? 'Email o contraseña incorrectos. Verifica tus credenciales o regístrate si no tienes cuenta.'
          : 'Error al crear la cuenta. Verifica que el email sea válido.')
      } else if (error.message?.includes('User already registered')) {
        setError('Este email ya está registrado. Intenta iniciar sesión.')
      } else if (error.message?.includes('Password should be at least')) {
        setError('La contraseña debe tener al menos 6 caracteres.')
      } else if (error.message?.includes('Invalid email')) {
        setError('Por favor ingresa un email válido.')
      } else {
        setError(error.message || 'Error en la autenticación. Intenta nuevamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sistema de Ventas
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta para comenzar'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
              setFormData({ email: '', password: '', confirmPassword: '' })
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Auth