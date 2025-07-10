/*
# Optimización de Rendimiento del Sistema

1. Nuevas Funciones
   - Función optimizada para estadísticas del dashboard
   - Función para limpiar cache de consultas
   - Índices adicionales para mejorar velocidad

2. Optimizaciones
   - Índices compuestos para consultas frecuentes
   - Vistas materializadas para reportes
   - Funciones optimizadas para dashboard

3. Cache y Rendimiento
   - Configuración de cache para consultas frecuentes
   - Optimización de consultas complejas
   - Reducción de carga en la base de datos
*/

-- Crear índices compuestos para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_status_date ON sales(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_today ON sales(created_at) WHERE created_at >= CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock_active ON inventory(quantity, min_stock) 
  WHERE quantity <= min_stock;
CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(is_active, category_id) 
  WHERE is_active = true;

-- Función optimizada para estadísticas del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  today_start timestamptz;
  sales_data record;
  product_count integer;
  customer_count integer;
  category_count integer;
  supplier_count integer;
  low_stock_count integer;
  pending_sales_count integer;
BEGIN
  today_start := CURRENT_DATE::timestamptz;
  
  -- Obtener estadísticas de ventas en una sola consulta
  SELECT 
    COALESCE(SUM(total_amount), 0) as total_sales,
    COALESCE(SUM(CASE WHEN created_at >= today_start THEN total_amount ELSE 0 END), 0) as today_sales,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
  INTO sales_data
  FROM sales;
  
  -- Obtener conteos en paralelo
  SELECT COUNT(*) INTO product_count FROM products WHERE is_active = true;
  SELECT COUNT(*) INTO customer_count FROM customers;
  SELECT COUNT(*) INTO category_count FROM categories;
  SELECT COUNT(*) INTO supplier_count FROM suppliers;
  
  -- Contar productos con stock bajo
  SELECT COUNT(*) INTO low_stock_count 
  FROM inventory 
  WHERE quantity <= min_stock;
  
  -- Construir resultado JSON
  result := jsonb_build_object(
    'totalSales', sales_data.total_sales,
    'todaySales', sales_data.today_sales,
    'totalProducts', product_count,
    'totalCustomers', customer_count,
    'totalCategories', category_count,
    'totalSuppliers', supplier_count,
    'lowStockItems', low_stock_count,
    'pendingSales', sales_data.pending_count,
    'lastUpdated', now()
  );
  
  RETURN result;
END;
$$;

-- Función para obtener ventas recientes optimizada
CREATE OR REPLACE FUNCTION get_recent_sales(limit_count integer DEFAULT 5)
RETURNS TABLE(
  id uuid,
  total_amount numeric,
  created_at timestamptz,
  customer_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.total_amount,
    s.created_at,
    COALESCE(c.name, 'Cliente general') as customer_name
  FROM sales s
  LEFT JOIN customers c ON s.customer_id = c.id
  ORDER BY s.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Función para obtener productos con stock bajo optimizada
CREATE OR REPLACE FUNCTION get_low_stock_products(limit_count integer DEFAULT 10)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  quantity integer,
  min_stock integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    i.quantity,
    i.min_stock
  FROM inventory i
  JOIN products p ON i.product_id = p.id
  WHERE i.quantity <= i.min_stock
    AND p.is_active = true
  ORDER BY (i.quantity::float / NULLIF(i.min_stock, 0)) ASC
  LIMIT limit_count;
END;
$$;

-- Vista materializada para reportes rápidos (se actualiza cada hora)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_sales_summary AS
SELECT 
  DATE(created_at) as sale_date,
  COUNT(*) as total_sales,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_sale_amount,
  COUNT(DISTINCT customer_id) as unique_customers
FROM sales 
WHERE status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- Índice para la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_sales_summary_date 
ON daily_sales_summary(sale_date);

-- Función para refrescar la vista materializada
CREATE OR REPLACE FUNCTION refresh_daily_sales_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
END;
$$;

-- Función para limpiar datos antiguos y optimizar rendimiento
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Limpiar registros de caja muy antiguos (más de 1 año)
  DELETE FROM cash_register 
  WHERE created_at < CURRENT_DATE - INTERVAL '1 year'
    AND type != 'sale';
  
  -- Limpiar logs de uso de promociones muy antiguos
  DELETE FROM promotion_usage 
  WHERE created_at < CURRENT_DATE - INTERVAL '6 months';
  
  -- Actualizar estadísticas de tablas
  ANALYZE sales;
  ANALYZE products;
  ANALYZE inventory;
  ANALYZE customers;
  
  RAISE NOTICE 'Limpieza de datos completada';
END;
$$;

-- Función para obtener estadísticas de rendimiento
CREATE OR REPLACE FUNCTION get_performance_stats()
RETURNS TABLE(
  table_name text,
  row_count bigint,
  table_size text,
  index_size text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    n_tup_ins + n_tup_upd + n_tup_del as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$;

-- Configurar auto-vacuum más agresivo para tablas frecuentemente actualizadas
ALTER TABLE sales SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE inventory SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE cash_register SET (
  autovacuum_vacuum_scale_factor = 0.2,
  autovacuum_analyze_scale_factor = 0.1
);

-- Crear trigger para actualizar automáticamente la vista materializada
CREATE OR REPLACE FUNCTION trigger_refresh_daily_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo refrescar si es una venta completada
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'completed' THEN
    -- Programar refresh en background (no bloquear la transacción)
    PERFORM pg_notify('refresh_sales_summary', '');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a la tabla sales
DROP TRIGGER IF EXISTS trigger_refresh_sales_summary ON sales;
CREATE TRIGGER trigger_refresh_sales_summary
  AFTER INSERT OR UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_daily_sales();

-- Función para optimizar consultas frecuentes
CREATE OR REPLACE FUNCTION optimize_frequent_queries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Actualizar estadísticas de todas las tablas principales
  ANALYZE sales;
  ANALYZE sale_items;
  ANALYZE products;
  ANALYZE inventory;
  ANALYZE customers;
  ANALYZE categories;
  ANALYZE suppliers;
  ANALYZE cash_register;
  ANALYZE employees;
  
  -- Refrescar vista materializada
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
  
  RAISE NOTICE 'Optimización de consultas completada';
END;
$$;

-- Programar limpieza automática (esto se ejecutaría con un cron job)
-- Por ahora solo creamos la función, la programación se haría externamente

-- Comentarios para documentación
COMMENT ON FUNCTION get_dashboard_stats() IS 'Función optimizada para obtener estadísticas del dashboard';
COMMENT ON FUNCTION get_recent_sales(integer) IS 'Obtiene las ventas más recientes de forma optimizada';
COMMENT ON FUNCTION get_low_stock_products(integer) IS 'Obtiene productos con stock bajo de forma optimizada';
COMMENT ON FUNCTION cleanup_old_data() IS 'Limpia datos antiguos para mantener rendimiento';
COMMENT ON FUNCTION optimize_frequent_queries() IS 'Optimiza consultas frecuentes del sistema';
COMMENT ON MATERIALIZED VIEW daily_sales_summary IS 'Vista materializada para reportes rápidos de ventas diarias';

-- Otorgar permisos necesarios
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_sales(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_products(integer) TO authenticated;
GRANT SELECT ON daily_sales_summary TO authenticated;