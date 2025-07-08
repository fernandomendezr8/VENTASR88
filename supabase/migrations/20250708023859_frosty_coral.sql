/*
# Add Foreign Key Relationship Between Cash Register and Sales

1. Changes
   - Add foreign key constraint on cash_register.reference_id to reference sales.id
   - This allows Supabase to properly join cash_register with sales table

2. Security
   - No changes to existing RLS policies needed
   - Maintains existing security model

3. Notes
   - This enables the frontend to query cash_register with sales relationship
   - Resolves the PGRST200 error when joining these tables
*/

-- Add foreign key constraint to link cash_register.reference_id to sales.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cash_register_reference_id_fkey' 
    AND table_name = 'cash_register'
  ) THEN
    ALTER TABLE cash_register 
    ADD CONSTRAINT cash_register_reference_id_fkey 
    FOREIGN KEY (reference_id) REFERENCES sales(id);
  END IF;
END $$;