/*
# Create Units of Measure System

1. New Tables
   - `units_of_measure` - Units of measure for products (id, name, abbreviation, category, created_at)

2. Table Modifications
   - Add `unit_of_measure_id` column to `products` table
   - Add foreign key constraint between products and units_of_measure

3. Security
   - Enable RLS on `units_of_measure` table
   - Add policies for authenticated users to read and manage units

4. Initial Data
   - Insert common units of measure (weight, volume, length, area, unit)
   - Set default unit for existing products
*/

-- Create units_of_measure table
CREATE TABLE IF NOT EXISTS units_of_measure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('weight', 'volume', 'length', 'area', 'unit')),
  created_at timestamptz DEFAULT now()
);

-- Add unit_of_measure_id column to products table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'unit_of_measure_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE products ADD COLUMN unit_of_measure_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_unit_of_measure_id_fkey'
    AND table_name = 'products'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_unit_of_measure_id_fkey 
    FOREIGN KEY (unit_of_measure_id) REFERENCES units_of_measure(id);
  END IF;
END $$;

-- Enable RLS on units_of_measure table
ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for units_of_measure
CREATE POLICY "Allow authenticated users to read units of measure"
  ON units_of_measure FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage units of measure"
  ON units_of_measure FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_unit_of_measure ON products(unit_of_measure_id);
CREATE INDEX IF NOT EXISTS idx_units_category ON units_of_measure(category);
CREATE INDEX IF NOT EXISTS idx_units_abbreviation ON units_of_measure(abbreviation);

-- Insert predefined units of measure
INSERT INTO units_of_measure (name, abbreviation, category) VALUES
  -- Units
  ('Unidad', 'und', 'unit'),
  ('Pieza', 'pza', 'unit'),
  ('Docena', 'doc', 'unit'),
  ('Ciento', 'cto', 'unit'),
  ('Par', 'par', 'unit'),
  
  -- Weight
  ('Kilogramo', 'kg', 'weight'),
  ('Gramo', 'g', 'weight'),
  ('Libra', 'lb', 'weight'),
  ('Onza', 'oz', 'weight'),
  ('Tonelada', 't', 'weight'),
  
  -- Volume
  ('Litro', 'l', 'volume'),
  ('Mililitro', 'ml', 'volume'),
  ('Galón', 'gal', 'volume'),
  ('Centímetro cúbico', 'cm³', 'volume'),
  ('Metro cúbico', 'm³', 'volume'),
  
  -- Length
  ('Metro', 'm', 'length'),
  ('Centímetro', 'cm', 'length'),
  ('Milímetro', 'mm', 'length'),
  ('Kilómetro', 'km', 'length'),
  ('Pulgada', 'in', 'length'),
  ('Pie', 'ft', 'length'),
  ('Yarda', 'yd', 'length'),
  
  -- Area
  ('Metro cuadrado', 'm²', 'area'),
  ('Centímetro cuadrado', 'cm²', 'area'),
  ('Hectárea', 'ha', 'area'),
  ('Pie cuadrado', 'ft²', 'area')
ON CONFLICT (abbreviation) DO NOTHING;

-- Set default unit for existing products that don't have one
DO $$
DECLARE
  default_unit_id uuid;
BEGIN
  -- Get the ID of the default unit (Unidad)
  SELECT id INTO default_unit_id FROM units_of_measure WHERE abbreviation = 'und';
  
  -- Update existing products without a unit
  IF default_unit_id IS NOT NULL THEN
    UPDATE products 
    SET unit_of_measure_id = default_unit_id 
    WHERE unit_of_measure_id IS NULL;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE units_of_measure IS 'Units of measure for products (weight, volume, length, area, units)';
COMMENT ON COLUMN units_of_measure.name IS 'Full name of the unit of measure';
COMMENT ON COLUMN units_of_measure.abbreviation IS 'Abbreviation of the unit of measure';
COMMENT ON COLUMN units_of_measure.category IS 'Category of the unit (weight, volume, length, area, unit)';
COMMENT ON COLUMN products.unit_of_measure_id IS 'Unit of measure for the product';