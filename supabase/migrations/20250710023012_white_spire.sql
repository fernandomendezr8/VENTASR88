/*
# Force Schema Cache Refresh

1. Purpose
   - Force Supabase PostgREST to refresh its schema cache
   - Resolve PGRST200 error for promotions table relationships
   - Ensure all foreign key relationships are properly recognized

2. Changes
   - Add temporary comment to promotions table
   - Remove the comment immediately after
   - This forces PostgREST to reload the schema cache

3. Notes
   - This is a safe operation that doesn't affect data
   - Resolves schema cache synchronization issues
   - Ensures proper recognition of promotion table relationships
*/

-- Force schema cache refresh by adding and removing a comment
COMMENT ON TABLE promotions IS 'Force schema refresh - temporary comment';

-- Remove the comment to complete the refresh cycle
COMMENT ON TABLE promotions IS NULL;

-- Also refresh related tables to ensure all relationships are recognized
COMMENT ON TABLE promotion_products IS 'Force schema refresh - temporary comment';
COMMENT ON TABLE promotion_products IS NULL;

COMMENT ON TABLE promotion_categories IS 'Force schema refresh - temporary comment';
COMMENT ON TABLE promotion_categories IS NULL;

COMMENT ON TABLE promotion_usage IS 'Force schema refresh - temporary comment';
COMMENT ON TABLE promotion_usage IS NULL;

-- Verify foreign key constraints exist and are properly named
DO $$
BEGIN
  -- Check promotion_products foreign key to promotions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'promotion_products' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%promotion_id%'
  ) THEN
    RAISE NOTICE 'Foreign key constraint for promotion_products.promotion_id may need to be recreated';
  END IF;

  -- Check promotion_categories foreign key to promotions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'promotion_categories' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%promotion_id%'
  ) THEN
    RAISE NOTICE 'Foreign key constraint for promotion_categories.promotion_id may need to be recreated';
  END IF;

  -- Check promotion_usage foreign key to promotions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'promotion_usage' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%promotion_id%'
  ) THEN
    RAISE NOTICE 'Foreign key constraint for promotion_usage.promotion_id may need to be recreated';
  END IF;
END $$;

-- Final comment to document the refresh
COMMENT ON TABLE promotions IS 'Promotions table - schema cache refreshed';