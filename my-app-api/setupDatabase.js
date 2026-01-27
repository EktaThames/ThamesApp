// setupDatabase.js
require('dotenv').config();
const db = require('./db');

const setupTables = async () => {
  console.log('Starting database setup...');
  let client;

  try {
    client = await db.pool.connect();

    // Drop tables
    await client.query(`
      DROP TABLE IF EXISTS product_pricing, product_barcodes, products, order_items, orders, customers, users, subcategories, categories, brands CASCADE;
    `);
    console.log("Dropped old tables.");

    // Drop ENUMs
    await client.query(`
      DROP TYPE IF EXISTS user_role, order_status, pmp_type;
    `);
    console.log("Dropped old ENUMs.");

    // Create ENUMs
    await client.query(`
      CREATE TYPE user_role AS ENUM ('customer', 'sales_rep', 'picker', 'admin');
      CREATE TYPE order_status AS ENUM ('placed', 'picked', 'completed');
      CREATE TYPE pmp_type AS ENUM ('PMP', 'PLAIN');
    `);
    console.log("Created ENUMs.");

    // USERS TABLE
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role user_role NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        
        -- Business Details
        company_name VARCHAR(255),
        business_type VARCHAR(100),
        entity_type VARCHAR(100),
        
        -- Trading Address (Split fields)
        trading_address_line1 TEXT,
        trading_address_line2 TEXT,
        trading_city VARCHAR(100),
        trading_zip VARCHAR(20),
        trading_country VARCHAR(100),
        
        -- Owner Details
        owner_first_name VARCHAR(100),
        owner_last_name VARCHAR(100),
        owner_address_line1 TEXT,
        owner_address_line2 TEXT,
        owner_city VARCHAR(100),
        owner_zip VARCHAR(20),
        owner_country VARCHAR(100),
        owner_email VARCHAR(255),
        owner_phone VARCHAR(50),
        
        -- Tax & Registration
        vat_number VARCHAR(50),
        eoid VARCHAR(50),
        fid VARCHAR(50),
        company_reg_number VARCHAR(50),
        
        -- Registered Address
        reg_address_line1 TEXT,
        reg_address_line2 TEXT,
        reg_city VARCHAR(100),
        reg_zip VARCHAR(20),
        reg_country VARCHAR(100),
        
        -- Referral
        referred_by VARCHAR(100),

        is_approved BOOLEAN DEFAULT FALSE,
        sales_rep_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT check_address_role CHECK (role = 'customer' OR address IS NULL),
        CONSTRAINT check_sales_rep_role CHECK (role = 'customer' OR sales_rep_id IS NULL)
      );
    `);
    console.log("Created 'users' table.");

    // CATEGORIES TABLE
    await client.query(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      );
    `);
    console.log("Created 'categories' table.");

    // SUBCATEGORIES TABLE
    await client.query(`
      CREATE TABLE subcategories (
        id INTEGER PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        name VARCHAR(255) UNIQUE NOT NULL
      );
    `);
    console.log("Created 'subcategories' table.");

    // BRANDS TABLE
    await client.query(`
      CREATE TABLE brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      );
    `);
    console.log("Created 'brands' table.");

    // PRODUCTS TABLE (based on CSV)
    await client.query(`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        item VARCHAR(50) UNIQUE NOT NULL,
        vat VARCHAR(50),
        brand_id INTEGER REFERENCES brands(id),
        hierarchy1 INTEGER,
        hierarchy2 INTEGER,
        description TEXT,
        pack_description TEXT,
        qty_in_stock INTEGER,
        cases_in_stock INTEGER,
        max_order INTEGER,
        rrp NUMERIC(10,2),
        por NUMERIC(10,2),
        pmp_plain pmp_type,
        type VARCHAR(50)
      );
    `);
    console.log("Created 'products' table.");

    // BARCODE TABLE (supports unlimited EANs)
    await client.query(`
      CREATE TABLE product_barcodes (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        tier INTEGER,
        barcode VARCHAR(50),
        barcode_type VARCHAR(50)
      );
    `);
    console.log("Created 'product_barcodes' table.");

    // PRICING TABLE (3 tiers + promo)
    await client.query(`
      CREATE TABLE product_pricing (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        tier INTEGER NOT NULL,      
        pack_size TEXT,
        sell_price NUMERIC(10,2),
        promo_price NUMERIC(10,2),
        promo_id VARCHAR(50),
        promo_start DATE,
        promo_end DATE,
                CONSTRAINT product_tier_unique UNIQUE (product_id, tier)

      );
    `);
    console.log("Created 'product_pricing' table.");

    // ORDERS TABLE
    await client.query(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        total_amount NUMERIC(10, 2) NOT NULL,
        net_amount NUMERIC(10, 2),
        tax_amount NUMERIC(10, 2),
        delivery_date DATE,
        delivery_address TEXT,
        customer_phone VARCHAR(50),
        notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'Placed',
        order_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Created 'orders' table.");

    // ORDER ITEMS TABLE
    await client.query(`
      CREATE TABLE order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL,
        tier INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price NUMERIC(10, 2) NOT NULL
      );
    `);
    console.log("Created 'order_items' table.");

    // INDEXES
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;

      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_sales_rep ON users(sales_rep_id);

      CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
      CREATE INDEX IF NOT EXISTS idx_products_cat ON products(hierarchy1);
      CREATE INDEX IF NOT EXISTS idx_products_subcat ON products(hierarchy2);
      
      CREATE INDEX IF NOT EXISTS idx_pricing_product ON product_pricing(product_id);
      CREATE INDEX IF NOT EXISTS idx_barcodes_product ON product_barcodes(product_id);

      CREATE INDEX IF NOT EXISTS idx_products_desc_trgm ON products USING gin (description gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_products_item_trgm ON products USING gin (item gin_trgm_ops);
    `);
    console.log("Created Indexes.");

    console.log("✅ Database setup complete!");
  } catch (err) {
    console.error("❌ Error during setup:", err);
  } finally {
    if (client) client.release();
    await db.pool.end();
  }
};

setupTables();
