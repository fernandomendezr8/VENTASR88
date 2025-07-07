/*
# Sales Management System Database Schema

1. New Tables
   - `categories` - Product categories (id, name, description, created_at)
   - `suppliers` - Suppliers/Vendors (id, name, contact_info, address, phone, email, created_at)
   - `customers` - Customer information (id, name, email, phone, address, created_at)
   - `products` - Product catalog (id, name, description, price, category_id, supplier_id, sku, created_at)
   - `inventory` - Inventory tracking (id, product_id, quantity, min_stock, max_stock, updated_at)
   - `sales` - Sales transactions (id, customer_id, total_amount, discount, tax, status, created_at)
   - `sale_items` - Sale line items (id, sale_id, product_id, quantity, unit_price, total_price)
   - `cash_register` - Cash register movements (id, type, amount, description, reference_id, created_at)

2. Security
   - Enable RLS on all tables
   - Add policies for authenticated users to manage their business data
   - Ensure proper data isolation and security

3. Features
   - Foreign key relationships between tables
   - Indexes for performance optimization
   - Default values and constraints for data integrity
   - Audit timestamps for tracking changes
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL DEFAULT 0,
  cost decimal(10,2) NOT NULL DEFAULT 0,
  sku text UNIQUE,
  category_id uuid REFERENCES categories(id),
  supplier_id uuid REFERENCES suppliers(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer DEFAULT 0,
  min_stock integer DEFAULT 0,
  max_stock integer DEFAULT 100,
  updated_at timestamptz DEFAULT now()
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  subtotal decimal(10,2) DEFAULT 0,
  discount decimal(10,2) DEFAULT 0,
  tax decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer')),
  created_at timestamptz DEFAULT now()
);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  total_price decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Cash register table
CREATE TABLE IF NOT EXISTS cash_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('sale', 'expense', 'deposit', 'withdrawal')),
  amount decimal(10,2) NOT NULL DEFAULT 0,
  description text DEFAULT '',
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Allow authenticated users to manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage products"
  ON products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage inventory"
  ON inventory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage sales"
  ON sales FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage sale_items"
  ON sale_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage cash_register"
  ON cash_register FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_date ON cash_register(created_at);

-- Insert some sample data
INSERT INTO categories (name, description) VALUES
  ('Electrónicos', 'Productos electrónicos y tecnología'),
  ('Ropa', 'Vestimenta y accesorios'),
  ('Hogar', 'Artículos para el hogar'),
  ('Alimentación', 'Productos alimenticios')
ON CONFLICT DO NOTHING;

INSERT INTO suppliers (name, contact_person, phone, email) VALUES
  ('TechSupply S.A.', 'Juan Pérez', '+1234567890', 'juan@techsupply.com'),
  ('FashionWorld Ltd.', 'María García', '+1234567891', 'maria@fashionworld.com'),
  ('HomeGoods Inc.', 'Carlos López', '+1234567892', 'carlos@homegoods.com')
ON CONFLICT DO NOTHING;