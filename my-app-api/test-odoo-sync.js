require('dotenv').config();
const { importProductsOdoo } = require('./import/importProductsOdoo');
const db = require('./db');

async function test() {
  console.log('🧪 Starting Odoo Sync Test...');
  try {
    await importProductsOdoo();
    console.log('✅ Test finished successfully.');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close DB connection so the script exits
    await db.pool.end();
  }
}

test();
