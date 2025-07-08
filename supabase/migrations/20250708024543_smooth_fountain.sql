/*
# Fix Cash Register and Sales Relationship

1. Changes
   - Add proper foreign key constraint between cash_register.reference_id and sales.id
   - Update cash_register table to properly reference sales when type is 'sale'

2. Security
   - Maintains existing RLS policies
   - No security changes needed

3. Notes
   - This enables proper joining between cash_register and sales tables
   - Resolves PGRST200 error when querying with sales relationship
*/

-- First, ensure any existing constraint is dropped if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cash_register_reference_id_fkey' 
    AND table_name = 'cash_register'
  ) THEN
    ALTER TABLE cash_register DROP CONSTRAINT cash_register_reference_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint properly
ALTER TABLE cash_register 
ADD CONSTRAINT cash_register_reference_id_fkey 
FOREIGN KEY (reference_id) REFERENCES sales(id) ON DELETE SET NULL;

-- Update any existing cash_register entries that should reference sales
-- This ensures data consistency for existing records
UPDATE cash_register 
SET reference_id = NULL 
WHERE type = 'sale' AND reference_id IS NOT NULL 
AND reference_id NOT IN (SELECT id FROM sales);