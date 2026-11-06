-- ==============================================================================
-- SUSHI HOTEL POS - Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Location: Padalur – Oottathur Road
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'UtensilsCrossed',
    image TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    gst_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.0 CHECK (gst_percent >= 0),
    image_url TEXT,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. BILLS TABLE
CREATE TABLE IF NOT EXISTS public.bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT NOT NULL UNIQUE,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.0 CHECK (discount >= 0),
    discount_type TEXT DEFAULT 'FLAT' CHECK (discount_type IN ('FLAT', 'PERCENT')),
    discount_value NUMERIC(10, 2) DEFAULT 0.0,
    gst NUMERIC(10, 2) NOT NULL DEFAULT 0.0 CHECK (gst >= 0),
    gst_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.0,
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'UPI', 'CARD', 'SPLIT')),
    split_details JSONB,
    tendered_amount NUMERIC(10, 2),
    change_amount NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 5. BILL ITEMS (CRITICAL: Stores snapshot of product name & unit price to ensure past bills never change)
CREATE TABLE IF NOT EXISTS public.bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id TEXT NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name_snapshot TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    gst_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.0,
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0)
);

-- 6. RESTAURANT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'settings-1',
    restaurant_name TEXT NOT NULL DEFAULT 'SUSHI HOTEL',
    tagline TEXT DEFAULT 'Padalur – Oottathur Road',
    address TEXT NOT NULL DEFAULT 'Padalur – Oottathur Road, Perambalur Dist, Tamil Nadu',
    phone TEXT NOT NULL DEFAULT '+91 98765 43210',
    gstin TEXT DEFAULT '33AAAAA0000A1Z5',
    fssai TEXT DEFAULT '12423000000000',
    upi_id TEXT DEFAULT 'sushihotel@upi',
    logo_url TEXT DEFAULT '/logo.svg',
    receipt_width TEXT NOT NULL DEFAULT '80mm' CHECK (receipt_width IN ('80mm', '58mm')),
    currency TEXT NOT NULL DEFAULT 'INR',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    bill_prefix TEXT NOT NULL DEFAULT 'SH-',
    next_bill_number INTEGER NOT NULL DEFAULT 101,
    daily_reset BOOLEAN NOT NULL DEFAULT false,
    default_gst_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.0,
    enable_gst BOOLEAN NOT NULL DEFAULT true,
    footer_message TEXT DEFAULT 'THANK YOU! VISIT AGAIN'
);

-- 7. PRINTER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.printer_settings (
    id TEXT PRIMARY KEY DEFAULT 'printer-1',
    printer_type TEXT NOT NULL DEFAULT 'BROWSER' CHECK (printer_type IN ('BROWSER', 'NETWORK', 'LOCAL_BRIDGE')),
    printer_name TEXT NOT NULL DEFAULT 'Counter Thermal 80mm',
    ip_address TEXT DEFAULT '192.168.1.100',
    port INTEGER DEFAULT 9100,
    paper_width TEXT NOT NULL DEFAULT '80mm' CHECK (paper_width IN ('80mm', '58mm')),
    auto_print_on_save BOOLEAN NOT NULL DEFAULT true,
    local_bridge_url TEXT DEFAULT 'http://localhost:9100/print'
);

-- INDEXES FOR MAXIMUM POS QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON public.bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_payment_method ON public.bills(payment_method);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Only authenticated users (Staff / Admin) can read and write data.
-- ==============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform operations
CREATE POLICY "Authenticated users have full access to categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to products"
    ON public.products FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to bills"
    ON public.bills FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to bill_items"
    ON public.bill_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to settings"
    ON public.settings FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to printer_settings"
    ON public.printer_settings FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- STORAGE BUCKETS (Product images and restaurant logo)
-- Run via Supabase dashboard or API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pos-assets', 'pos-assets', true);
