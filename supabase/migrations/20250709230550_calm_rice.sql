/*
  # Create Promotions System

  1. New Tables
    - `promotions`
      - `id` (uuid, primary key)
      - `name` (text, promotion name)
      - `description` (text, promotion description)
      - `type` (text, promotion type: percentage, fixed_amount, buy_x_get_y, bundle)
      - `value` (numeric, discount value or percentage)
      - `conditions` (jsonb, promotion conditions)
      - `start_date` (timestamptz, when promotion starts)
      - `end_date` (timestamptz, when promotion ends)
      - `is_active` (boolean, whether promotion is active)
      - `min_purchase_amount` (numeric, minimum purchase required)
      - `max_uses` (integer, maximum number of uses)
      - `current_uses` (integer, current number of uses)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, reference to employees)

    - `promotion_products`
      - `id` (uuid, primary key)
      - `promotion_id` (uuid, reference to promotions)
      - `product_id` (uuid, reference to products)
      - `created_at` (timestamptz)

    - `promotion_categories`
      - `id` (uuid, primary key)
      - `promotion_id` (uuid, reference to promotions)
      - `category_id` (uuid, reference to categories)
      - `created_at` (timestamptz)

    - `promotion_usage`
      - `id` (uuid, primary key)
      - `promotion_id` (uuid, reference to promotions)
      - `sale_id` (uuid, reference to sales)
      - `discount_amount` (numeric, actual discount applied)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for admin-only operations

  3. Functions
    - Function to check if promotion is valid
    - Function to calculate promotion discount
    - Function to apply promotion to sale
*/

-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  type text NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'bundle')),
  value numeric(10,2) NOT NULL DEFAULT 0,
  conditions jsonb DEFAULT '{}',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  min_purchase_amount numeric(10,2) DEFAULT 0,
  max_uses integer DEFAULT NULL,
  current_uses integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES employees(id)
);

-- Create promotion_products table
CREATE TABLE IF NOT EXISTS promotion_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(promotion_id, product_id)
);

-- Create promotion_categories table
CREATE TABLE IF NOT EXISTS promotion_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(promotion_id, category_id)
);

-- Create promotion_usage table
CREATE TABLE IF NOT EXISTS promotion_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotion_products_promotion ON promotion_products(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_products_product ON promotion_products(product_id);
CREATE INDEX IF NOT EXISTS idx_promotion_categories_promotion ON promotion_categories(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_categories_category ON promotion_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion ON promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_sale ON promotion_usage(sale_id);

-- Enable RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for promotions
CREATE POLICY "Allow authenticated users to read promotions"
  ON promotions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to manage promotions"
  ON promotions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role IN ('admin', 'manager')
      AND e.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role IN ('admin', 'manager')
      AND e.status = 'active'
    )
  );

-- RLS Policies for promotion_products
CREATE POLICY "Allow authenticated users to read promotion_products"
  ON promotion_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to manage promotion_products"
  ON promotion_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role IN ('admin', 'manager')
      AND e.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role IN ('admin', 'manager')
      AND e.status = 'active'
    )
  );

-- RLS Policies for promotion_categories
CREATE POLICY "Allow authenticated users to read promotion_categories"
  ON promotion_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to manage promotion_categories"
  ON promotion_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role IN ('admin', 'manager')
      AND e.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role IN ('admin', 'manager')
      AND e.status = 'active'
    )
  );

-- RLS Policies for promotion_usage
CREATE POLICY "Allow authenticated users to manage promotion_usage"
  ON promotion_usage FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promotions_updated_at_trigger
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotions_updated_at();

-- Function to check if promotion is valid
CREATE OR REPLACE FUNCTION is_promotion_valid(
  promotion_id uuid,
  purchase_amount numeric DEFAULT 0,
  check_date timestamptz DEFAULT now()
)
RETURNS boolean AS $$
DECLARE
  promo promotions;
BEGIN
  SELECT * INTO promo
  FROM promotions
  WHERE id = promotion_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if promotion is active
  IF NOT promo.is_active THEN
    RETURN false;
  END IF;
  
  -- Check date range
  IF check_date < promo.start_date OR check_date > promo.end_date THEN
    RETURN false;
  END IF;
  
  -- Check minimum purchase amount
  IF purchase_amount < promo.min_purchase_amount THEN
    RETURN false;
  END IF;
  
  -- Check usage limit
  IF promo.max_uses IS NOT NULL AND promo.current_uses >= promo.max_uses THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate promotion discount
CREATE OR REPLACE FUNCTION calculate_promotion_discount(
  promotion_id uuid,
  cart_items jsonb,
  subtotal numeric
)
RETURNS numeric AS $$
DECLARE
  promo promotions;
  discount_amount numeric := 0;
  conditions jsonb;
  buy_quantity integer;
  get_quantity integer;
  bundle_products jsonb;
  item jsonb;
  product_in_promotion boolean;
  category_in_promotion boolean;
BEGIN
  SELECT * INTO promo
  FROM promotions
  WHERE id = promotion_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  conditions := promo.conditions;
  
  CASE promo.type
    WHEN 'percentage' THEN
      discount_amount := subtotal * (promo.value / 100);
      
    WHEN 'fixed_amount' THEN
      discount_amount := promo.value;
      
    WHEN 'buy_x_get_y' THEN
      buy_quantity := (conditions->>'buy_quantity')::integer;
      get_quantity := (conditions->>'get_quantity')::integer;
      
      -- Calculate discount based on buy X get Y logic
      -- This is a simplified version - you might want to enhance this
      FOR item IN SELECT * FROM jsonb_array_elements(cart_items)
      LOOP
        -- Check if product is in promotion
        SELECT EXISTS(
          SELECT 1 FROM promotion_products pp
          WHERE pp.promotion_id = promotion_id
          AND pp.product_id = (item->>'product_id')::uuid
        ) INTO product_in_promotion;
        
        IF product_in_promotion THEN
          -- Calculate free items based on quantity
          discount_amount := discount_amount + 
            (((item->>'quantity')::integer / buy_quantity) * get_quantity * (item->>'unit_price')::numeric);
        END IF;
      END LOOP;
      
    WHEN 'bundle' THEN
      bundle_products := conditions->'bundle_products';
      -- Check if all bundle products are in cart and calculate discount
      -- This is a simplified version
      discount_amount := promo.value;
  END CASE;
  
  -- Ensure discount doesn't exceed subtotal
  IF discount_amount > subtotal THEN
    discount_amount := subtotal;
  END IF;
  
  RETURN discount_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to get active promotions for products
CREATE OR REPLACE FUNCTION get_active_promotions_for_products(product_ids uuid[])
RETURNS TABLE(
  promotion_id uuid,
  promotion_name text,
  promotion_type text,
  promotion_value numeric,
  discount_amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.name,
    p.type,
    p.value,
    CASE 
      WHEN p.type = 'percentage' THEN 0 -- Will be calculated based on actual price
      WHEN p.type = 'fixed_amount' THEN p.value
      ELSE 0
    END as discount_amount
  FROM promotions p
  LEFT JOIN promotion_products pp ON p.id = pp.promotion_id
  LEFT JOIN promotion_categories pc ON p.id = pc.promotion_id
  LEFT JOIN products prod ON pp.product_id = prod.id OR pc.category_id = prod.category_id
  WHERE p.is_active = true
    AND now() BETWEEN p.start_date AND p.end_date
    AND (pp.product_id = ANY(product_ids) OR prod.id = ANY(product_ids))
    AND (p.max_uses IS NULL OR p.current_uses < p.max_uses);
END;
$$ LANGUAGE plpgsql;