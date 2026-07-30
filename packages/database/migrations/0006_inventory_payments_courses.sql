-- Migration 0006: Add inventory, suppliers, order_payments, shift, courses and pos coordinates

DO $$ BEGIN
    CREATE TYPE unit_type_enum AS ENUM ('liter', 'piece', 'kg', 'unit');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE shift_enum AS ENUM ('midday', 'night');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('cash', 'card', 'mixed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE course_enum AS ENUM ('starter', 'first', 'second', 'dessert', 'coffee', 'drink');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Update tables table
ALTER TABLE tables ADD COLUMN IF NOT EXISTS pos_x integer DEFAULT 0 NOT NULL;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS pos_y integer DEFAULT 0 NOT NULL;

-- Update orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shift shift_enum DEFAULT 'midday' NOT NULL;

-- Update order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS course course_enum DEFAULT 'first' NOT NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false NOT NULL;

-- Update register_closings table
ALTER TABLE register_closings ADD COLUMN IF NOT EXISTS shift shift_enum DEFAULT 'midday' NOT NULL;
ALTER TABLE register_closings ADD COLUMN IF NOT EXISTS cash_amount numeric(10, 2) DEFAULT '0.00' NOT NULL;
ALTER TABLE register_closings ADD COLUMN IF NOT EXISTS card_amount numeric(10, 2) DEFAULT '0.00' NOT NULL;

-- Update categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_drink boolean DEFAULT false NOT NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS course course_enum DEFAULT 'first' NOT NULL;

-- Update menu_items table
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_drink boolean DEFAULT false NOT NULL;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS course course_enum DEFAULT 'first' NOT NULL;

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    contact_name varchar(255),
    phone varchar(50),
    email varchar(255),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
    name varchar(255) NOT NULL,
    quantity numeric(10, 2) DEFAULT '0.00' NOT NULL,
    min_stock numeric(10, 2) DEFAULT '0.00' NOT NULL,
    unit_type unit_type_enum DEFAULT 'unit' NOT NULL,
    cost_price numeric(10, 2) DEFAULT '0.00',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create order_payments table
CREATE TABLE IF NOT EXISTS order_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount numeric(10, 2) NOT NULL,
    payment_method payment_method_enum DEFAULT 'cash' NOT NULL,
    notes varchar(255),
    created_at timestamp with time zone DEFAULT now()
);
