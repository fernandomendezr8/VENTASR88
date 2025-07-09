/*
# Ajustes de Base de Datos para Flexibilidad del Sistema

1. Nuevas Funciones
   - Función para resetear datos de prueba
   - Función para verificar integridad de datos
   - Función para limpiar datos huérfanos
   - Función para estadísticas del sistema

2. Mejoras de Seguridad
   - Políticas más flexibles para desarrollo
   - Funciones de utilidad para administradores

3. Optimizaciones
   - Índices adicionales para mejor rendimiento
   - Triggers para mantener consistencia de datos

4. Utilidades
   - Funciones para backup y restore de configuraciones
   - Herramientas de diagnóstico del sistema
*/

-- Función para limpiar datos de prueba (solo para desarrollo)
CREATE OR REPLACE FUNCTION clean_test_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo permitir si hay menos de 100 ventas (indicador de datos de prueba)
  IF (SELECT COUNT(*) FROM sales) < 100 THEN
    -- Limpiar en orden correcto para evitar violaciones de FK
    DELETE FROM sale_items;
    DELETE FROM sales;
    DELETE FROM cash_register WHERE type != 'sale';
    DELETE FROM inventory WHERE quantity = 0;
    
    -- Resetear secuencias si es necesario
    -- (PostgreSQL usa UUIDs, así que no hay secuencias que resetear)
    
    RAISE NOTICE 'Datos de prueba limpiados exitosamente';
  ELSE
    RAISE EXCEPTION 'No se puede limpiar: demasiados registros de ventas (posible datos de producción)';
  END IF;
END;
$$;

-- Función para verificar integridad de datos
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
  table_name text,
  issue_type text,
  issue_count bigint,
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Productos sin inventario
  RETURN QUERY
  SELECT 
    'products'::text,
    'missing_inventory'::text,
    COUNT(*)::bigint,
    'Productos sin registro de inventario'::text
  FROM products p
  LEFT JOIN inventory i ON p.id = i.product_id
  WHERE i.id IS NULL AND p.is_active = true;

  -- Inventario con productos inactivos
  RETURN QUERY
  SELECT 
    'inventory'::text,
    'inactive_products'::text,
    COUNT(*)::bigint,
    'Inventario de productos inactivos'::text
  FROM inventory i
  JOIN products p ON i.product_id = p.id
  WHERE p.is_active = false;

  -- Ventas sin items
  RETURN QUERY
  SELECT 
    'sales'::text,
    'empty_sales'::text,
    COUNT(*)::bigint,
    'Ventas sin items'::text
  FROM sales s
  LEFT JOIN sale_items si ON s.id = si.sale_id
  WHERE si.id IS NULL;

  -- Items de venta con productos inexistentes
  RETURN QUERY
  SELECT 
    'sale_items'::text,
    'orphaned_items'::text,
    COUNT(*)::bigint,
    'Items de venta con productos inexistentes'::text
  FROM sale_items si
  LEFT JOIN products p ON si.product_id = p.id
  WHERE p.id IS NULL;
END;
$$;

-- Función para obtener estadísticas del sistema
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
  SELECT 
    'total_products'::text,
    COUNT(*)::bigint,
    'Total de productos en el sistema'::text
  FROM products;

  RETURN QUERY
  SELECT 
    'active_products'::text,
    COUNT(*)::bigint,
    'Productos activos'::text
  FROM products
  WHERE is_active = true;

  RETURN QUERY
  SELECT 
    'total_sales'::text,
    COUNT(*)::bigint,
    'Total de ventas'::text
  FROM sales;

  RETURN QUERY
  SELECT 
    'completed_sales'::text,
    COUNT(*)::bigint,
    'Ventas completadas'::text
  FROM sales
  WHERE status = 'completed';

  RETURN QUERY
  SELECT 
    'total_customers'::text,
    COUNT(*)::bigint,
    'Total de clientes'::text
  FROM customers;

  RETURN QUERY
  SELECT 
    'low_stock_products'::text,
    COUNT(*)::bigint,
    'Productos con stock bajo'::text
  FROM inventory i
  WHERE i.quantity <= i.min_stock;

  RETURN QUERY
  SELECT 
    'active_employees'::text,
    COUNT(*)::bigint,
    'Empleados activos'::text
  FROM employees
  WHERE status = 'active';
END;
$$;

-- Función para limpiar datos huérfanos
CREATE OR REPLACE FUNCTION clean_orphaned_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Limpiar inventario de productos inexistentes
  DELETE FROM inventory 
  WHERE product_id NOT IN (SELECT id FROM products);

  -- Limpiar items de venta de productos inexistentes
  DELETE FROM sale_items 
  WHERE product_id NOT IN (SELECT id FROM products);

  -- Limpiar movimientos de caja de ventas inexistentes
  DELETE FROM cash_register 
  WHERE type = 'sale' 
  AND reference_id IS NOT NULL 
  AND reference_id NOT IN (SELECT id FROM sales);

  RAISE NOTICE 'Datos huérfanos limpiados exitosamente';
END;
$$;

-- Función para crear inventario automático para productos nuevos
CREATE OR REPLACE FUNCTION ensure_product_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Crear inventario automáticamente para productos nuevos
  IF TG_OP = 'INSERT' THEN
    INSERT INTO inventory (product_id, quantity, min_stock, max_stock)
    VALUES (NEW.id, 0, 5, 100)
    ON CONFLICT (product_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para inventario automático
DROP TRIGGER IF EXISTS ensure_inventory_trigger ON products;
CREATE TRIGGER ensure_inventory_trigger
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION ensure_product_inventory();

-- Función para actualizar timestamps automáticamente
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Agregar columna updated_at a tablas que no la tienen
DO $$
BEGIN
  -- Agregar updated_at a products si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE products ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Agregar updated_at a categories si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE categories ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Agregar updated_at a suppliers si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Crear triggers para updated_at
DROP TRIGGER IF EXISTS update_products_timestamp ON products;
CREATE TRIGGER update_products_timestamp
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_categories_timestamp ON categories;
CREATE TRIGGER update_categories_timestamp
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_suppliers_timestamp ON suppliers;
CREATE TRIGGER update_suppliers_timestamp
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Índices adicionales para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_sales_date_range ON sales(created_at, status);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(quantity, min_stock) WHERE quantity <= min_stock;

-- Función para backup de configuraciones
CREATE OR REPLACE FUNCTION backup_system_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_backup jsonb;
BEGIN
  SELECT jsonb_build_object(
    'categories', (SELECT jsonb_agg(row_to_json(c)) FROM categories c),
    'suppliers', (SELECT jsonb_agg(row_to_json(s)) FROM suppliers s),
    'units_of_measure', (SELECT jsonb_agg(row_to_json(u)) FROM units_of_measure u),
    'employees', (SELECT jsonb_agg(row_to_json(e)) FROM employees e WHERE status = 'active'),
    'backup_date', now()
  ) INTO config_backup;
  
  RETURN config_backup;
END;
$$;

-- Función para obtener información de tablas
CREATE OR REPLACE FUNCTION get_table_info()
RETURNS TABLE(
  table_name text,
  row_count bigint,
  table_size text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN 
    SELECT t.table_name::text as tname
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    RETURN QUERY
    EXECUTE format('
      SELECT %L::text, 
             COUNT(*)::bigint,
             pg_size_pretty(pg_total_relation_size(%L))::text
      FROM %I', 
      rec.tname, 
      rec.tname, 
      rec.tname
    );
  END LOOP;
END;
$$;

-- Política más flexible para desarrollo (solo para admins)
CREATE POLICY "Allow admin full access for development"
  ON products FOR ALL
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

-- Función para resetear demo data
CREATE OR REPLACE FUNCTION reset_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo permitir si el usuario es admin
  IF NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Solo los administradores pueden resetear datos de demostración';
  END IF;

  -- Limpiar datos transaccionales
  DELETE FROM sale_items;
  DELETE FROM sales;
  DELETE FROM cash_register;
  
  -- Resetear inventario
  UPDATE inventory SET quantity = 10, min_stock = 5, max_stock = 100;
  
  -- Insertar datos de demostración
  INSERT INTO sales (customer_id, subtotal, tax, total_amount, status, payment_method) 
  SELECT 
    (SELECT id FROM customers LIMIT 1),
    1000,
    190,
    1190,
    'completed',
    'cash'
  FROM generate_series(1, 5);

  RAISE NOTICE 'Datos de demostración reseteados exitosamente';
END;
$$;

-- Comentarios para documentación
COMMENT ON FUNCTION clean_test_data() IS 'Limpia datos de prueba del sistema (solo desarrollo)';
COMMENT ON FUNCTION check_data_integrity() IS 'Verifica la integridad de los datos del sistema';
COMMENT ON FUNCTION get_system_stats() IS 'Obtiene estadísticas generales del sistema';
COMMENT ON FUNCTION clean_orphaned_data() IS 'Limpia datos huérfanos y referencias rotas';
COMMENT ON FUNCTION backup_system_config() IS 'Crea backup de configuraciones del sistema';
COMMENT ON FUNCTION get_table_info() IS 'Obtiene información de tamaño y registros de tablas';
COMMENT ON FUNCTION reset_demo_data() IS 'Resetea datos de demostración (solo admins)';

-- Crear vista para dashboard de administrador
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

-- Otorgar permisos a la vista
GRANT SELECT ON admin_dashboard TO authenticated;

-- Función para obtener configuración del sistema
CREATE OR REPLACE FUNCTION get_system_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'database_version', version(),
    'total_tables', (
      SELECT COUNT(*) 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    ),
    'rls_enabled_tables', (
      SELECT COUNT(*) 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
    ),
    'system_functions', (
      SELECT COUNT(*) 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
    ),
    'last_migration', (
      SELECT MAX(version) 
      FROM supabase_migrations.schema_migrations
    )
  );
END;
$$;

COMMENT ON FUNCTION get_system_configuration() IS 'Obtiene configuración y estado del sistema';