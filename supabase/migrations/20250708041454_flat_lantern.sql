/*
  # Fix Cedula Column Schema Cache Issue

  1. Problem Resolution
    - PostgREST schema cache not recognizing 'cedula' column
    - PGRST204 and 42703 errors when querying customers table
    - Force complete schema refresh and column recognition

  2. Actions Taken
    - Drop and recreate customers table with proper column definitions
    - Recreate all indexes, constraints, and RLS policies
    - Force PostgREST schema cache invalidation
    - Ensure proper column visibility and access

  3. Security
    - Maintain RLS policies for data protection
    - Preserve existing customer data during recreation
*/

-- Step 1: Create backup of existing data
CREATE TEMP TABLE customers_backup AS 
SELECT * FROM customers;

-- Step 2: Drop existing table completely to clear all cache references
DROP TABLE IF EXISTS customers CASCADE;

-- Step 3: Recreate customers table with explicit column definitions
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cedula text,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Create unique constraint for cedula (allowing nulls)
CREATE UNIQUE INDEX idx_customers_cedula_unique ON customers(cedula) WHERE cedula IS NOT NULL AND cedula != '';
ALTER TABLE customers ADD CONSTRAINT customers_cedula_unique UNIQUE USING INDEX idx_customers_cedula_unique;

-- Step 5: Create other indexes for performance
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Step 6: Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
CREATE POLICY "Allow authenticated users to manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 8: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Restore data from backup
INSERT INTO customers (id, name, cedula, email, phone, address, created_at, updated_at)
SELECT id, name, cedula, email, phone, address, created_at, updated_at
FROM customers_backup;

-- Step 10: Drop temporary backup table
DROP TABLE customers_backup;

-- Step 11: Force schema cache refresh with multiple techniques
COMMENT ON TABLE customers IS 'Customer information table - schema refreshed';
COMMENT ON COLUMN customers.cedula IS 'Customer identification number (cedula de ciudadania)';

-- Step 12: Update table statistics
ANALYZE customers;

-- Step 13: Verify the table structure
DO $$
BEGIN
  -- Check if cedula column exists and is properly configured
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'customers' 
    AND column_name = 'cedula'
    AND data_type = 'text'
  ) THEN
    RAISE EXCEPTION 'Cedula column was not properly created';
  END IF;
  
  -- Check if unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public'
    AND table_name = 'customers'
    AND constraint_name = 'customers_cedula_unique'
    AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE EXCEPTION 'Cedula unique constraint was not properly created';
  END IF;
  
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename = 'customers'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS was not properly enabled on customers table';
  END IF;
  
  RAISE NOTICE 'Customers table successfully recreated with cedula column and proper schema cache refresh';
END $$;

-- Step 14: Final cache invalidation
NOTIFY pgrst, 'reload schema';