/*
# Add Product Images Support

1. Changes
   - Add image_url column to products table to store compressed image data
   - Add image_alt column for accessibility
   - Update existing products to have null image values

2. Security
   - Maintains existing RLS policies
   - No additional security changes needed

3. Notes
   - Images will be stored as base64 data URLs with compression
   - Frontend will handle image compression before storing
*/

-- Add image columns to products table
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