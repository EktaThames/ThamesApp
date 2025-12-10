
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');

async function seedUsers() {
  const client = await db.pool.connect();
  try {
    console.log('Seeding users...');

    // Hash passwords
    const customerPassword = await bcrypt.hash('test123', 10);
    const salesRepPassword = await bcrypt.hash('test123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    // Insert a test trade customer
    await client.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, 'customer') ON CONFLICT (username) DO NOTHING;`,
      ['customer@example.com', customerPassword]
    );

    // Insert a test sales representative
    await client.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, 'sales_rep') ON CONFLICT (username) DO NOTHING;`,
      ['sales@example.com', salesRepPassword]
    );

    // Insert a test admin
    await client.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, 'admin') ON CONFLICT (username) DO NOTHING;`,
      ['admin@example.com', adminPassword]
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
