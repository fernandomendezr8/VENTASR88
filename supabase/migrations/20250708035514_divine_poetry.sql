/*
# Refresh Schema Cache

1. Purpose
   - Force Supabase PostgREST to refresh its schema cache
   - Resolve "Could not find the 'cedula' column" error
   - Ensure all recent schema changes are recognized

2. Changes
   - Add a temporary comment to trigger cache refresh
   - Remove the comment immediately after
   - This forces PostgREST to reload the schema

3. Notes
   - This is a safe operation that doesn't affect data
   - Resolves schema cache synchronization issues
*/

-- Force schema cache refresh by adding and removing a comment
COMMENT ON TABLE customers IS 'Customer information table - cache refresh';

-- Remove the comment to complete the refresh cycle
COMMENT ON TABLE customers IS NULL;

-- Ensure the cedula column is properly recognized
DO $$
BEGIN
  -- Verify cedula column exists and recreate index if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' 
    AND column_name = 'cedula'
    AND table_schema = 'public'
  ) THEN
    -- Drop and recreate index to ensure it's properly registered
    DROP INDEX IF EXISTS idx_customers_cedula;
    CREATE INDEX idx_customers_cedula ON customers(cedula);
    
    -- Add constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'customers' 
      AND constraint_name = 'customers_cedula_key'
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE customers ADD CONSTRAINT customers_cedula_key UNIQUE (cedula);
    END IF;
  END IF;
END $$;

-- Final comment to document the cedula field
COMMENT ON COLUMN customers.cedula IS 'Cedula de ciudadania del cliente (documento de identidad)';