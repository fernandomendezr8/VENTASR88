/*
# Manual Migration: Create Employees Table and Functions

This migration creates the employees table and related functions that are missing from the database.
Run this SQL in your Supabase SQL Editor to fix the "relation does not exist" errors.

1. New Tables
   - `employees` - Employee management with roles and permissions
   
2. Functions
   - `get_current_user_permissions()` - Get user permissions based on role
   - `check_permission()` - Check specific permission
   - `update_updated_at_column()` - Trigger function for updated_at
   
3. Security
   - Enable RLS on employees table
   - Role-based access policies
   - Secure permission checking
*/

-- Create employees table
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

-- Enable RLS on employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create policies RLS for employees
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get current user permissions
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
  
  -- If employee not found, return empty permissions
  IF user_role IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Default permissions by role
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

-- Create function to check specific permissions
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

-- Insert default admin employee (will be updated when first user registers)
INSERT INTO employees (
  user_id, 
  name, 
  email, 
  role, 
  status,
  permissions
) VALUES (
  NULL, -- Will be updated with first registered user
  'Administrador del Sistema',
  'admin@ventaspro.com',
  'admin',
  'active',
  '{}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE employees IS 'System employees with roles and permissions';
COMMENT ON COLUMN employees.role IS 'Employee role: admin, manager, cashier, viewer';
COMMENT ON COLUMN employees.permissions IS 'Specific permissions in JSON format';
COMMENT ON COLUMN employees.status IS 'Employee status: active, inactive, suspended';
COMMENT ON FUNCTION get_current_user_permissions() IS 'Gets current user permissions';
COMMENT ON FUNCTION check_permission(text, text) IS 'Checks if user has specific permission';