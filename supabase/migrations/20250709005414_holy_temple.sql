/*
# Sistema de Empleados y Administradores

1. Nueva Tabla
   - `employees` - Empleados del sistema (id, user_id, name, role, permissions, status, created_at)

2. Modificaciones
   - Agregar tabla de empleados con roles y permisos
   - Conectar empleados con usuarios de auth
   - Sistema de permisos granular

3. Seguridad
   - Habilitar RLS en la tabla employees
   - Políticas basadas en roles
   - Control de acceso por permisos

4. Roles
   - admin: Acceso completo al sistema
   - manager: Gestión de ventas, productos, inventario
   - cashier: Solo punto de venta y consultas básicas
   - viewer: Solo lectura de reportes
*/

-- Crear tabla de empleados
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'cashier', 'viewer')),
  permissions jsonb DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  hire_date date DEFAULT CURRENT_DATE,
  phone text,
  address text,
  salary decimal(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS en employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para employees
CREATE POLICY "Admins can manage all employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.user_id = auth.uid() 
      AND e.role = 'admin' 
      AND e.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.user_id = auth.uid() 
      AND e.role = 'admin' 
      AND e.status = 'active'
    )
  );

CREATE POLICY "Managers can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.user_id = auth.uid() 
      AND e.role IN ('admin', 'manager') 
      AND e.status = 'active'
    )
  );

CREATE POLICY "Users can view their own employee record"
  ON employees FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own basic info"
  ON employees FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND role = (SELECT role FROM employees WHERE user_id = auth.uid())
    AND status = (SELECT status FROM employees WHERE user_id = auth.uid())
  );

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- Crear función para obtener permisos del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_permissions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_permissions jsonb;
  user_role text;
BEGIN
  SELECT role, permissions INTO user_role, user_permissions
  FROM employees 
  WHERE user_id = auth.uid() AND status = 'active';
  
  -- Si no se encuentra el empleado, retornar permisos vacíos
  IF user_role IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Permisos por defecto según el rol
  CASE user_role
    WHEN 'admin' THEN
      RETURN jsonb_build_object(
        'sales', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', true),
        'products', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', true),
        'inventory', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', true),
        'customers', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', true),
        'suppliers', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', true),
        'categories', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', true),
        'employees', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', true),
        'reports', jsonb_build_object('read', true),
        'cash_register', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', true),
        'settings', jsonb_build_object('read', true, 'update', true)
      ) || COALESCE(user_permissions, '{}'::jsonb);
    WHEN 'manager' THEN
      RETURN jsonb_build_object(
        'sales', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', false),
        'products', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', false),
        'inventory', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', false),
        'customers', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', false),
        'suppliers', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', false),
        'categories', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', false),
        'employees', jsonb_build_object('create', false, 'read', true, 'update', false, 'delete', false),
        'reports', jsonb_build_object('read', true),
        'cash_register', jsonb_build_object('create', true, 'read', true, 'update', false, 'delete', false),
        'settings', jsonb_build_object('read', true, 'update', false)
      ) || COALESCE(user_permissions, '{}'::jsonb);
    WHEN 'cashier' THEN
      RETURN jsonb_build_object(
        'sales', jsonb_build_object('create', true, 'read', true, 'update', false, 'delete', false),
        'products', jsonb_build_object('create', false, 'read', true, 'update', false, 'delete', false),
        'inventory', jsonb_build_object('create', false, 'read', true, 'update', false, 'delete', false),
        'customers', jsonb_build_object('create', true, 'read', true, 'update', true, 'delete', false),
        'suppliers', jsonb_build_object('create', false, 'read', false, 'update', false, 'delete', false),
        'categories', jsonb_build_object('create', false, 'read', true, 'update', false, 'delete', false),
        'employees', jsonb_build_object('create', false, 'read', false, 'update', false, 'delete', false),
        'reports', jsonb_build_object('read', false),
        'cash_register', jsonb_build_object('create', true, 'read', true, 'update', false, 'delete', false),
        'settings', jsonb_build_object('read', false, 'update', false)
      ) || COALESCE(user_permissions, '{}'::jsonb);
    WHEN 'viewer' THEN
      RETURN jsonb_build_object(
        'sales', jsonb_build_object('create', false, 'read', true, 'update', false, 'delete', false),
        'products', jsonb_build_object('create', false, 'read', true, 'update', false, 'delete', false),
        'inventory', jsonb_build_object('create', false, 'read', true, 'update', false, 'delete', false),
        'customers', jsonb_build_object('create', false, 'read', true, 'update', false, 'delete', false),
        'suppliers', jsonb_build_object('create', false, 'read', true, 'update', false, 'delete', false),
        'categories', jsonb_build_object('create', false, 'read', true, 'update', false, 'delete', false),
        'employees', jsonb_build_object('create', false, 'read', false, 'update', false, 'delete', false),
        'reports', jsonb_build_object('read', true),
        'cash_register', jsonb_build_object('create', false, 'read', true, 'update', false, 'delete', false),
        'settings', jsonb_build_object('read', false, 'update', false)
      ) || COALESCE(user_permissions, '{}'::jsonb);
    ELSE
      RETURN '{}'::jsonb;
  END CASE;
END;
$$;

-- Crear función para verificar permisos
CREATE OR REPLACE FUNCTION check_permission(module_name text, action_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_permissions jsonb;
BEGIN
  user_permissions := get_current_user_permissions();
  
  RETURN COALESCE(
    (user_permissions -> module_name -> action_name)::boolean,
    false
  );
END;
$$;

-- Crear trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario administrador por defecto (se debe actualizar con el user_id real)
-- Este será actualizado por el frontend cuando se registre el primer usuario
INSERT INTO employees (
  user_id, 
  name, 
  email, 
  role, 
  status,
  permissions
) VALUES (
  NULL, -- Se actualizará con el primer usuario que se registre
  'Administrador del Sistema',
  'admin@ventaspro.com',
  'admin',
  'active',
  '{}'::jsonb
) ON CONFLICT DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE employees IS 'Empleados del sistema con roles y permisos';
COMMENT ON COLUMN employees.role IS 'Rol del empleado: admin, manager, cashier, viewer';
COMMENT ON COLUMN employees.permissions IS 'Permisos específicos en formato JSON';
COMMENT ON COLUMN employees.status IS 'Estado del empleado: active, inactive, suspended';
COMMENT ON FUNCTION get_current_user_permissions() IS 'Obtiene los permisos del usuario actual';
COMMENT ON FUNCTION check_permission(text, text) IS 'Verifica si el usuario tiene un permiso específico';