// setupDatabase.js
const db = require('./db');

const setupTables = async () => {
  console.log('Starting database setup...');
  const client = await db.pool.connect();
  try {
    // Drop existing tables to start fresh (optional, good for development)
    await client.query('DROP TABLE IF EXISTS order_lines, orders, products, customers, users;');
    console.log('Dropped existing tables.');

    // Drop existing ENUM types
    await client.query('DROP TYPE IF EXISTS user_role, product_type, order_status;');
    console.log('Dropped existing ENUM types.');

    // Create ENUM types for roles and statuses
    await client.query(`
      CREATE TYPE user_role AS ENUM ('customer', 'sales_rep', 'picker', 'admin');
      CREATE TYPE product_type AS ENUM ('promo', 'pmp', 'clearance', 'standard');
      CREATE TYPE order_status AS ENUM ('placed', 'picked', 'completed');
    `);
    console.log('Created ENUM types.');

    // Create users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role user_role NOT NULL
      );
    `);
    console.log('Created "users" table.');

    // Create customers table
    await client.query(`
      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        user_id INTEGER REFERENCES users(id)
      );
    `);
    console.log('Created "customers" table.');

    // Create products table
    await client.query(`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        size VARCHAR(50),
        brand VARCHAR(100),
        type product_type DEFAULT 'standard'
      );
    `);
    console.log('Created "products" table.');

    // Create orders table
    await client.query(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        sales_rep_id INTEGER REFERENCES users(id),
        status order_status NOT NULL DEFAULT 'placed',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created "orders" table.');

    // Create order_lines table
    await client.query(`
      CREATE TABLE order_lines (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL
      );
    `);
    console.log('Created "order_lines" table.');

    console.log('Database setup complete!');
  } catch (err) {
    console.error('Error during database setup:', err);
  } finally {
    client.release();
  }
};

setupTables();
