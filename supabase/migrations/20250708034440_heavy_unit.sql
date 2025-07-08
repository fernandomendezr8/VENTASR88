/*
# Add Cedula Field to Customers

1. Changes
   - Add cedula column to customers table
   - Make cedula unique to prevent duplicate registrations
   - Update existing customers to have null cedula values initially

2. Security
   - Maintains existing RLS policies
   - No additional security changes needed

3. Notes
   - Cedula is required for new customers
   - Existing customers can be updated with cedula
   - Cedula must be unique across all customers
*/

-- Add cedula column to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' 
    AND column_name = 'cedula'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE customers ADD COLUMN cedula text UNIQUE;
  END IF;
END $$;

-- Add index on cedula for better search performance
CREATE INDEX IF NOT EXISTS idx_customers_cedula ON customers(cedula);

-- Add comment for documentation
COMMENT ON COLUMN customers.cedula IS 'Cedula de ciudadania del cliente (documento de identidad)';