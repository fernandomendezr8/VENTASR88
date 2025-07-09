/*
# Fix Infinite Recursion in Employees RLS Policies

This migration fixes the infinite recursion error in the employees table RLS policies
by creating a SECURITY DEFINER function that can safely query the employees table
without triggering RLS checks.

1. Changes
   - Drop existing problematic RLS policies
   - Create SECURITY DEFINER function to get user role safely
   - Recreate RLS policies using the safe function
   - Add policy for initial admin setup

2. Security
   - Maintain proper access control
   - Allow initial admin account creation
   - Prevent recursion in policy evaluation
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all employees" ON employees;
DROP POLICY IF EXISTS "Managers can view employees" ON employees;
DROP POLICY IF EXISTS "Users can view their own employee record" ON employees;
DROP POLICY IF EXISTS "Users can update their own basic info" ON employees;

-- Create a SECURITY DEFINER function to safely get user role
CREATE OR REPLACE FUNCTION get_my_employee_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM employees 
  WHERE user_id = auth.uid() AND status = 'active';
  
  RETURN COALESCE(user_role, 'none');
END;
$$;

-- Create a SECURITY DEFINER function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_my_employee_role() = 'admin';
END;
$$;

-- Create a SECURITY DEFINER function to check if user is manager or admin
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_my_employee_role() IN ('admin', 'manager');
END;
$$;

-- Recreate RLS policies using the safe functions
CREATE POLICY "Admins can manage all employees"
  ON employees FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Managers can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (is_manager_or_admin());

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
    AND role = (SELECT role FROM employees WHERE user_id = auth.uid() LIMIT 1)
    AND status = (SELECT status FROM employees WHERE user_id = auth.uid() LIMIT 1)
  );

-- Policy to allow initial admin setup (when no employees exist yet)
CREATE POLICY "Allow initial admin creation"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM employees WHERE status = 'active')
    OR is_admin()
  );

-- Update the get_current_user_permissions function to use the safe role function
CREATE OR REPLACE FUNCTION get_current_user_permissions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_permissions jsonb;
  user_role text;
BEGIN
  user_role := get_my_employee_role();
  
  -- If no role found, return empty permissions
  IF user_role = 'none' THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Get custom permissions
  SELECT permissions INTO user_permissions
  FROM employees 
  WHERE user_id = auth.uid() AND status = 'active';
  
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

-- Add helpful comments
COMMENT ON FUNCTION get_my_employee_role() IS 'Safely gets current user role without RLS recursion';
COMMENT ON FUNCTION is_admin() IS 'Checks if current user is admin';
COMMENT ON FUNCTION is_manager_or_admin() IS 'Checks if current user is manager or admin';