/*
# Agregar Unidades de Medida al Sistema

1. Nueva Tabla
   - `units_of_measure` - Unidades de medida (id, name, abbreviation, category, created_at)

2. Modificaciones
   - Agregar `unit_of_measure_id` a la tabla `products`
   - Agregar relación foreign key entre products y units_of_measure

3. Seguridad
   - Habilitar RLS en la nueva tabla
   - Agregar políticas para usuarios autenticados

4. Datos Iniciales
   - Insertar todas las unidades de medida requeridas
*/

-- Crear tabla de unidades de medida
CREATE TABLE IF NOT EXISTS units_of_measure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('weight', 'volume', 'length', 'area', 'unit')),
  created_at timestamptz DEFAULT now()
);

-- Agregar columna unit_of_measure_id a productos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'unit_of_measure_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE products ADD COLUMN unit_of_measure_id uuid REFERENCES units_of_measure(id);
  END IF;
END $$;

-- Habilitar RLS en la nueva tabla
ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;

-- Crear política RLS para unidades de medida
CREATE POLICY "Allow authenticated users to read units of measure"
  ON units_of_measure FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage units of measure"
  ON units_of_measure FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_products_unit_of_measure ON products(unit_of_measure_id);
CREATE INDEX IF NOT EXISTS idx_units_category ON units_of_measure(category);

-- Insertar unidades de medida predefinidas
INSERT INTO units_of_measure (name, abbreviation, category) VALUES
  -- Unidades
  ('Unidad', 'und', 'unit'),
  ('Pieza', 'pza', 'unit'),
  ('Docena', 'doc', 'unit'),
  ('Ciento', 'cto', 'unit'),
  
  -- Peso
  ('Kilogramo', 'kg', 'weight'),
  ('Gramo', 'g', 'weight'),
  ('Libra', 'lb', 'weight'),
  ('Onza', 'oz', 'weight'),
  ('Tonelada', 't', 'weight'),
  
  -- Volumen
  ('Litro', 'l', 'volume'),
  ('Mililitro', 'ml', 'volume'),
  ('Galón', 'gal', 'volume'),
  ('Centímetro cúbico', 'cm³', 'volume'),
  ('Metro cúbico', 'm³', 'volume'),
  
  -- Longitud
  ('Metro', 'm', 'length'),
  ('Centímetro', 'cm', 'length'),
  ('Milímetro', 'mm', 'length'),
  ('Kilómetro', 'km', 'length'),
  ('Pulgada', 'in', 'length'),
  ('Pie', 'ft', 'length'),
  ('Yarda', 'yd', 'length'),
  
  -- Área
  ('Metro cuadrado', 'm²', 'area'),
  ('Centímetro cuadrado', 'cm²', 'area'),
  ('Hectárea', 'ha', 'area'),
  ('Pie cuadrado', 'ft²', 'area')
ON CONFLICT (abbreviation) DO NOTHING;

-- Establecer unidad por defecto (unidad) para productos existentes
DO $$
DECLARE
  default_unit_id uuid;
BEGIN
  -- Obtener el ID de la unidad "Unidad"
  SELECT id INTO default_unit_id FROM units_of_measure WHERE abbreviation = 'und';
  
  -- Actualizar productos existentes que no tienen unidad asignada
  UPDATE products 
  SET unit_of_measure_id = default_unit_id 
  WHERE unit_of_measure_id IS NULL;
END $$;

-- Comentarios para documentación
COMMENT ON TABLE units_of_measure IS 'Unidades de medida para productos (peso, volumen, longitud, área, unidades)';
COMMENT ON COLUMN units_of_measure.name IS 'Nombre completo de la unidad de medida';
COMMENT ON COLUMN units_of_measure.abbreviation IS 'Abreviación de la unidad de medida';
COMMENT ON COLUMN units_of_measure.category IS 'Categoría de la unidad (weight, volume, length, area, unit)';
COMMENT ON COLUMN products.unit_of_measure_id IS 'Unidad de medida del producto';