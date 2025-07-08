/*
# Add Product Image Support

1. Changes
   - Add image_url column to products table for storing image data
   - Add image_alt column for accessibility text
   - Update existing products to have default null values

2. Security
   - Maintains existing RLS policies
   - No additional security changes needed

3. Notes
   - Images will be stored as base64 data URLs or external URLs
   - Frontend handles image compression before storing
*/

-- Add image_url column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'image_url'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url text;
  END IF;
END $$;

-- Add image_alt column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'image_alt'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE products ADD COLUMN image_alt text DEFAULT '';
  END IF;
END $$;

-- Update database types to reflect the new columns
COMMENT ON COLUMN products.image_url IS 'URL or base64 data for product image';
COMMENT ON COLUMN products.image_alt IS 'Alternative text for product image accessibility';