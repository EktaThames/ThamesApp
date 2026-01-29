
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');

async function seedUsers() {
  const client = await db.pool.connect();
  try {
    console.log('Seeding users...');

    // Hash passwords
    const commonPassword = await bcrypt.hash('test123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    // 1. Insert Admin (No address, No sales_rep_id)
    await client.query(
      `INSERT INTO users (username, password, role, name, email, is_approved) 
       VALUES ('admin@thames.com', $1, 'admin', 'System Admin', 'admin@thames.com', true) 
       ON CONFLICT (username) DO UPDATE SET is_approved = true, password = $1;`,
      [adminPassword]
    );

    // 2. Insert Sales Reps (No address, No sales_rep_id)
    await client.query(
      `INSERT INTO users (username, password, role, name, email, is_approved) 
       VALUES ('sales1@thames.com', $1, 'sales_rep', 'Sales Rep 1', 'sales1@thames.com', true) 
       ON CONFLICT (username) DO UPDATE SET is_approved = true, password = $1;`,
      [commonPassword]
    );

    await client.query(
      `INSERT INTO users (username, password, role, name, email, is_approved) 
       VALUES ('sales2@thames.com', $1, 'sales_rep', 'Sales Rep 2', 'sales2@thames.com', true) 
       ON CONFLICT (username) DO UPDATE SET is_approved = true, password = $1;`,
      [commonPassword]
    );

    // Get Sales1 ID for assignment
    const salesRes = await client.query("SELECT id FROM users WHERE username = 'sales1@thames.com'");
    const salesId = salesRes.rows[0]?.id;

    // 3. Insert Customers (Address allowed)
    // Unassigned
    await client.query(`INSERT INTO users (username, password, role, name, email, phone, address, sales_rep_id, is_approved) VALUES ('customer1@thames.com', $1, 'customer', 'Customer One', 'customer1@thames.com', '07700900001', '123 High St, London', NULL, true) ON CONFLICT (username) DO UPDATE SET is_approved = true, password = $1;`, [commonPassword]);
    await client.query(`INSERT INTO users (username, password, role, name, email, phone, address, sales_rep_id, is_approved) VALUES ('customer2@thames.com', $1, 'customer', 'Customer Two', 'customer2@thames.com', '07700900002', '456 Market Rd, Manchester', NULL, true) ON CONFLICT (username) DO UPDATE SET is_approved = true, password = $1;`, [commonPassword]);

    // Assigned to Sales1
    if (salesId) {
      await client.query(`
        INSERT INTO users (username, password, role, name, email, phone, address, sales_rep_id, is_approved) 
        VALUES ('customer3@thames.com', $1, 'customer', 'Customer Three', 'customer3@thames.com', '07700900003', '789 Village Ln, Leeds', $2, true) 
        ON CONFLICT (username) DO UPDATE SET is_approved = true, password = $1;`, [commonPassword, salesId]);
    }

    // 4. Insert Picker
    await client.query(
      `INSERT INTO users (username, password, role, name, email, is_approved) 
       VALUES ('picker1', $1, 'picker', 'Warehouse Picker 1', 'picker1@thames.com', true) 
       ON CONFLICT (username) DO UPDATE SET is_approved = true, password = $1;`,
      [commonPassword]
    );

    console.log('✅ Users seeded successfully.');
  } catch (err) {
    console.error('❌ Error seeding users:', err);
  } finally {
    client.release();
    await db.pool.end();
  }
}

seedUsers();
