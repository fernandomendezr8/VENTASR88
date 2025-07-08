/*
# Fix Cash Register and Sales Foreign Key Relationship

1. Changes
   - Drop existing problematic foreign key constraint if it exists
   - Add proper foreign key constraint between cash_register.reference_id and sales.id
   - Ensure the relationship is properly recognized by PostgREST

2. Security
   - Maintains existing RLS policies
   - No security changes needed

3. Notes
   - This enables proper joining between cash_register and sales tables
   - Resolves PGRST200 error when querying with sales relationship
   - Uses a more reliable approach to establish the foreign key
*/

-- First, clean up any existing constraints that might be causing issues
DO $$
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cash_register_reference_id_fkey' 
    AND table_name = 'cash_register'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE cash_register DROP CONSTRAINT cash_register_reference_id_fkey;
  END IF;
END $$;

-- Ensure reference_id column exists and has the correct type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cash_register' 
    AND column_name = 'reference_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE cash_register ADD COLUMN reference_id uuid;
  END IF;
END $$;

-- Clean up any invalid reference_id values that don't match existing sales
UPDATE cash_register 
SET reference_id = NULL 
WHERE reference_id IS NOT NULL 
AND reference_id NOT IN (SELECT id FROM sales);

-- Add the foreign key constraint with proper naming
ALTER TABLE cash_register 
ADD CONSTRAINT fk_cash_register_sales 
FOREIGN KEY (reference_id) REFERENCES sales(id) ON DELETE SET NULL;

-- Create an index on the foreign key for better performance
CREATE INDEX IF NOT EXISTS idx_cash_register_reference_id ON cash_register(reference_id);

-- Verify the constraint was created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_cash_register_sales' 
    AND table_name = 'cash_register'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Foreign key constraint was not created successfully';
  END IF;
END $$;