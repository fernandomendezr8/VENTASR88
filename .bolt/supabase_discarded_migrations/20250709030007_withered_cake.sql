-- =====================================================
-- CONFIGURACIÓN COMPLETA DE BASE DE DATOS SUPABASE
-- Ejecutar este script completo en el SQL Editor de Supabase
-- =====================================================

-- 1. CREAR TODAS LAS TABLAS PRINCIPALES
-- =====================================================

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de unidades de medida
CREATE TABLE IF NOT EXISTS units_of_measure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('weight', 'volume', 'length', 'area', 'unit')),
  created_at timestamptz DEFAULT now()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cedula text,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL DEFAULT 0,
  cost decimal(10,2) NOT NULL DEFAULT 0,
  sku text UNIQUE,
  category_id uuid REFERENCES categories(id),
  supplier_id uuid REFERENCES suppliers(id),
  unit_of_measure_id uuid REFERENCES units_of_measure(id),
  is_active boolean DEFAULT true,
  image_url text,
  image_alt text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de inventario
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  quantity integer DEFAULT 0,
  min_stock integer DEFAULT 5,
  max_stock integer DEFAULT 100,
  updated_at timestamptz DEFAULT now()
);

-- Tabla de ventas
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  subtotal decimal(10,2) DEFAULT 0,
  discount decimal(10,2) DEFAULT 0,
  tax decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer')),
  created_at timestamptz DEFAULT now()
);

-- Tabla de items de venta
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  total_price decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabla de caja registradora
CREATE TABLE IF NOT EXISTS cash_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('sale', 'expense', 'deposit', 'withdrawal')),
  amount decimal(10,2) NOT NULL DEFAULT 0,
  description text DEFAULT '',
  reference_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabla de empleados
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

-- 2. CREAR ÍNDICES PARA RENDIMIENTO
-- =====================================================

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_unit_measure ON products(unit_of_measure_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_date ON cash_register(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_register_reference ON cash_register(reference_id);

-- Índices para empleados
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_customers_cedula ON customers(cedula) WHERE cedula IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;

-- Índices de texto completo
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers USING gin(to_tsvector('spanish', name));

-- Índices para reportes
CREATE INDEX IF NOT EXISTS idx_sales_date_range ON sales(created_at, status);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(quantity, min_stock) WHERE quantity <= min_stock;

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 4. CREAR FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Función para obtener rol del usuario actual
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

-- Función para verificar si es admin
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

-- Función para verificar si es manager o admin
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

-- Función para crear inventario automático
CREATE OR REPLACE FUNCTION ensure_product_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO inventory (product_id, quantity, min_stock, max_stock)
    VALUES (NEW.id, 0, 5, 100)
    ON CONFLICT (product_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Función para obtener permisos del usuario
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
  
  IF user_role = 'none' THEN
    RETURN '{}'::jsonb;
  END IF;
  
  SELECT permissions INTO user_permissions
  FROM employees 
  WHERE user_id = auth.uid() AND status = 'active';
  
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

-- Función para verificar permisos específicos
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

-- Funciones de mantenimiento y estadísticas
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE(
  metric_name text,
  metric_value bigint,
  metric_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 'total_products'::text, COUNT(*)::bigint, 'Total de productos'::text FROM products
  UNION ALL
  SELECT 'active_products'::text, COUNT(*)::bigint, 'Productos activos'::text FROM products WHERE is_active = true
  UNION ALL
  SELECT 'total_sales'::text, COUNT(*)::bigint, 'Total de ventas'::text FROM sales
  UNION ALL
  SELECT 'completed_sales'::text, COUNT(*)::bigint, 'Ventas completadas'::text FROM sales WHERE status = 'completed'
  UNION ALL
  SELECT 'total_customers'::text, COUNT(*)::bigint, 'Total de clientes'::text FROM customers
  UNION ALL
  SELECT 'low_stock_products'::text, COUNT(*)::bigint, 'Productos con stock bajo'::text FROM inventory WHERE quantity <= min_stock
  UNION ALL
  SELECT 'active_employees'::text, COUNT(*)::bigint, 'Empleados activos'::text FROM employees WHERE status = 'active';
END;
$$;

-- Función para limpiar datos huérfanos
CREATE OR REPLACE FUNCTION clean_orphaned_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM inventory WHERE product_id NOT IN (SELECT id FROM products);
  DELETE FROM sale_items WHERE product_id NOT IN (SELECT id FROM products);
  DELETE FROM cash_register WHERE type = 'sale' AND reference_id IS NOT NULL AND reference_id NOT IN (SELECT id FROM sales);
  RAISE NOTICE 'Datos huérfanos limpiados exitosamente';
END;
$$;

-- 5. CREAR TRIGGERS
-- =====================================================

-- Triggers para timestamps
CREATE TRIGGER update_categories_timestamp
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_suppliers_timestamp
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_customers_timestamp
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_products_timestamp
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_employees_timestamp
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Trigger para crear inventario automático
CREATE TRIGGER ensure_inventory_trigger
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION ensure_product_inventory();

-- 6. CREAR POLÍTICAS RLS
-- =====================================================

-- Políticas para empleados (sin recursión)
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

CREATE POLICY "Allow initial admin creation"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM employees WHERE status = 'active')
    OR is_admin()
  );

-- Políticas generales para todas las demás tablas
CREATE POLICY "Allow authenticated users to manage categories"
  ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage suppliers"
  ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage units_of_measure"
  ON units_of_measure FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage customers"
  ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage products"
  ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage inventory"
  ON inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage sales"
  ON sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage sale_items"
  ON sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage cash_register"
  ON cash_register FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. INSERTAR DATOS INICIALES
-- =====================================================

-- Unidades de medida
INSERT INTO units_of_measure (name, abbreviation, category) VALUES
  ('Unidad', 'und', 'unit'),
  ('Pieza', 'pza', 'unit'),
  ('Docena', 'doc', 'unit'),
  ('Ciento', 'cto', 'unit'),
  ('Par', 'par', 'unit'),
  ('Kilogramo', 'kg', 'weight'),
  ('Gramo', 'g', 'weight'),
  ('Libra', 'lb', 'weight'),
  ('Onza', 'oz', 'weight'),
  ('Tonelada', 't', 'weight'),
  ('Litro', 'l', 'volume'),
  ('Mililitro', 'ml', 'volume'),
  ('Galón', 'gal', 'volume'),
  ('Metro', 'm', 'length'),
  ('Centímetro', 'cm', 'length'),
  ('Milímetro', 'mm', 'length'),
  ('Metro cuadrado', 'm²', 'area'),
  ('Centímetro cuadrado', 'cm²', 'area')
ON CONFLICT (abbreviation) DO NOTHING;

-- Categorías iniciales
INSERT INTO categories (name, description) VALUES
  ('Electrónicos', 'Productos electrónicos y tecnología'),
  ('Ropa', 'Vestimenta y accesorios'),
  ('Hogar', 'Artículos para el hogar'),
  ('Alimentación', 'Productos alimenticios'),
  ('Salud y Belleza', 'Productos de cuidado personal'),
  ('Deportes', 'Artículos deportivos y fitness'),
  ('Libros', 'Libros y material educativo'),
  ('Juguetes', 'Juguetes y entretenimiento')
ON CONFLICT DO NOTHING;

-- Proveedores iniciales
INSERT INTO suppliers (name, contact_person, phone, email) VALUES
  ('TechSupply S.A.', 'Juan Pérez', '+57 300 123 4567', 'juan@techsupply.com'),
  ('FashionWorld Ltd.', 'María García', '+57 301 234 5678', 'maria@fashionworld.com'),
  ('HomeGoods Inc.', 'Carlos López', '+57 302 345 6789', 'carlos@homegoods.com'),
  ('FoodDistrib', 'Ana Martínez', '+57 303 456 7890', 'ana@fooddistrib.com')
ON CONFLICT DO NOTHING;

-- Empleado administrador inicial (se actualizará con el primer usuario)
INSERT INTO employees (
  user_id, 
  name, 
  email, 
  role, 
  status,
  permissions
) VALUES (
  NULL,
  'Administrador del Sistema',
  'admin@ventaspro.com',
  'admin',
  'active',
  '{}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- 8. CREAR VISTAS ÚTILES
-- =====================================================

-- Vista para dashboard de administrador
CREATE OR REPLACE VIEW admin_dashboard AS
SELECT 
  'products' as entity,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_count
FROM products
UNION ALL
SELECT 
  'sales' as entity,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'completed') as active_count,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_count
FROM sales
UNION ALL
SELECT 
  'customers' as entity,
  COUNT(*) as total_count,
  COUNT(*) as active_count,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_count
FROM customers
UNION ALL
SELECT 
  'employees' as entity,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_count
FROM employees;

-- Vista de productos con información completa
CREATE OR REPLACE VIEW products_full AS
SELECT 
  p.*,
  c.name as category_name,
  s.name as supplier_name,
  u.name as unit_name,
  u.abbreviation as unit_abbreviation,
  i.quantity as stock_quantity,
  i.min_stock,
  i.max_stock,
  CASE 
    WHEN i.quantity <= i.min_stock THEN 'low'
    WHEN i.quantity >= i.max_stock THEN 'high'
    ELSE 'normal'
  END as stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
LEFT JOIN units_of_measure u ON p.unit_of_measure_id = u.id
LEFT JOIN inventory i ON p.id = i.product_id;

-- Vista de ventas con información completa
CREATE OR REPLACE VIEW sales_full AS
SELECT 
  s.*,
  c.name as customer_name,
  c.cedula as customer_cedula,
  COUNT(si.id) as items_count,
  SUM(si.quantity) as total_items
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN sale_items si ON s.id = si.sale_id
GROUP BY s.id, c.name, c.cedula;

-- 9. OTORGAR PERMISOS
-- =====================================================

GRANT SELECT ON admin_dashboard TO authenticated;
GRANT SELECT ON products_full TO authenticated;
GRANT SELECT ON sales_full TO authenticated;

-- 10. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE categories IS 'Categorías de productos';
COMMENT ON TABLE suppliers IS 'Proveedores y vendedores';
COMMENT ON TABLE units_of_measure IS 'Unidades de medida para productos';
COMMENT ON TABLE customers IS 'Clientes del sistema';
COMMENT ON TABLE products IS 'Catálogo de productos';
COMMENT ON TABLE inventory IS 'Control de inventario por producto';
COMMENT ON TABLE sales IS 'Registro de ventas';
COMMENT ON TABLE sale_items IS 'Items individuales de cada venta';
COMMENT ON TABLE cash_register IS 'Movimientos de caja registradora';
COMMENT ON TABLE employees IS 'Empleados del sistema con roles y permisos';

COMMENT ON FUNCTION get_my_employee_role() IS 'Obtiene el rol del empleado actual sin recursión RLS';
COMMENT ON FUNCTION is_admin() IS 'Verifica si el usuario actual es administrador';
COMMENT ON FUNCTION is_manager_or_admin() IS 'Verifica si el usuario es manager o admin';
COMMENT ON FUNCTION get_current_user_permissions() IS 'Obtiene permisos del usuario basado en su rol';
COMMENT ON FUNCTION check_permission(text, text) IS 'Verifica un permiso específico';
COMMENT ON FUNCTION get_system_stats() IS 'Obtiene estadísticas generales del sistema';
COMMENT ON FUNCTION clean_orphaned_data() IS 'Limpia datos huérfanos del sistema';

-- =====================================================
-- FIN DE LA CONFIGURACIÓN
-- =====================================================

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Base de datos configurada exitosamente!';
  RAISE NOTICE '📊 Tablas creadas: categories, suppliers, units_of_measure, customers, products, inventory, sales, sale_items, cash_register, employees';
  RAISE NOTICE '🔒 RLS habilitado en todas las tablas';
  RAISE NOTICE '⚡ Índices creados para optimización';
  RAISE NOTICE '🔧 Funciones de utilidad disponibles';
  RAISE NOTICE '👥 Sistema de empleados y permisos configurado';
  RAISE NOTICE '📈 Vistas y reportes listos';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 El sistema está listo para usar!';
END $$;