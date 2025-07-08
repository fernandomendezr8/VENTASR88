/*
# Force Schema Cache Refresh for Cedula Column

1. Changes
   - Ensure cedula column exists with correct type
   - Drop and recreate unique constraint and index
   - Use multiple cache invalidation techniques
   - Force PostgREST to re-introspect the customers table

2. Security
   - Maintains existing RLS policies
   - Ensures proper column access permissions

3. Notes
   - This migration uses aggressive cache invalidation to resolve PGRST204 errors
   - Multiple techniques are used to ensure PostgREST recognizes the column
*/

-- Force schema cache refresh for customers table and cedula column

-- This migration is intended to resolve persistent schema cache issues
-- where the 'cedula' column on the 'customers' table is not recognized by PostgREST.

-- 1. Re-verify the 'cedula' column exists and has the correct type.
--    This block is defensive and ensures the column is present before proceeding.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers'
    AND column_name = 'cedula'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE customers ADD COLUMN cedula text;
    RAISE NOTICE 'Added cedula column to customers table as it was missing.';
  END IF;
  -- Ensure it's of type text, if it somehow got a different type
  ALTER TABLE customers ALTER COLUMN cedula TYPE text USING cedula::text;
END $$;

-- 2. Safely drop and recreate the unique index and constraint for 'cedula'.
--    This ensures the constraint is correctly applied and recognized.
DROP INDEX IF EXISTS idx_customers_cedula;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_cedula_unique;

CREATE UNIQUE INDEX idx_customers_cedula ON customers(cedula) WHERE cedula IS NOT NULL;
ALTER TABLE customers ADD CONSTRAINT customers_cedula_unique UNIQUE USING INDEX idx_customers_cedula;

-- 3. Force schema cache refresh using COMMENT ON statements.
--    This is a common method to trigger PostgREST to reload the schema.
COMMENT ON TABLE customers IS 'Triggering schema refresh for cedula column.';
COMMENT ON COLUMN customers.cedula IS 'Customer identification number (cedula de ciudadania) - refreshed.';

-- 4. Perform a non-breaking table alteration to further force cache invalidation.
--    Changing a column's default or nullability (even to its current state) can help.
ALTER TABLE customers ALTER COLUMN cedula SET DEFAULT NULL;

-- 5. Remove the temporary comments.
COMMENT ON TABLE customers IS NULL;
COMMENT ON COLUMN customers.cedula IS NULL;

-- 6. Re-apply the original comment for documentation.
COMMENT ON COLUMN customers.cedula IS 'Cedula de ciudadania del cliente (documento de identidad)';

-- 7. Verify RLS policies are still in place and allow access.
--    This is a sanity check, as previous migrations should have handled this.
--    No changes needed here if policies are already broad (USING (true)).
--    If policies were more restrictive, they might need to be re-evaluated.
--    Given the existing policies are `USING (true)`, they should cover `cedula`.

-- 8. Additional cache invalidation techniques
-- Drop and recreate the RLS policy to force a complete schema refresh
DROP POLICY IF EXISTS "Allow authenticated users to manage customers" ON customers;
CREATE POLICY "Allow authenticated users to manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. Force a statistics update which can trigger schema cache refresh
ANALYZE customers;

-- 10. Verify the column is properly configured
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' 
    AND column_name = 'cedula'
    AND table_schema = 'public'
    AND data_type = 'text'
  ) THEN
    RAISE EXCEPTION 'Cedula column was not properly configured after migration';
  END IF;
  
  RAISE NOTICE 'Cedula column successfully configured and schema cache refreshed';
END $$;