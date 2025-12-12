// setupDatabase.js
require('dotenv').config();
const db = require('./db');

const setupTables = async () => {
  console.log('Starting database setup...');
  const client = await db.pool.connect();

  try {
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
        role user_role NOT NULL
      );
    `);
    console.log("Created 'users' table.");

    // CUSTOMERS TABLE
    await client.query(`
      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        user_id INTEGER REFERENCES users(id)
      );
    `);
    console.log("Created 'customers' table.");

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
        vat VARCHAR(10),
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
        total_amount NUMERIC(10, 2) NOT NULL,
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
    client.release();
  }
};

setupTables();
