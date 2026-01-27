require('dotenv').config();
const db = require('./db');

const migrateUsers = async () => {
  console.log('Starting user table migration...');
  let client;

  try {
    client = await db.pool.connect();

    // List of columns to add with their data types
    const columns = [
      "is_approved BOOLEAN DEFAULT FALSE",
      "sales_rep_id INTEGER",
      "company_name VARCHAR(255)",
      "business_type VARCHAR(100)",
      "entity_type VARCHAR(100)",
      "trading_address_line1 TEXT",
      "trading_address_line2 TEXT",
      "trading_city VARCHAR(100)",
      "trading_zip VARCHAR(20)",
      "trading_country VARCHAR(100)",
      "owner_first_name VARCHAR(100)",
      "owner_last_name VARCHAR(100)",
      "owner_address_line1 TEXT",
      "owner_address_line2 TEXT",
      "owner_city VARCHAR(100)",
      "owner_zip VARCHAR(20)",
      "owner_country VARCHAR(100)",
      "owner_email VARCHAR(255)",
      "owner_phone VARCHAR(50)",
      "vat_number VARCHAR(50)",
      "eoid VARCHAR(50)",
      "fid VARCHAR(50)",
      "company_reg_number VARCHAR(50)",
      "reg_address_line1 TEXT",
      "reg_address_line2 TEXT",
      "reg_city VARCHAR(100)",
      "reg_zip VARCHAR(20)",
      "reg_country VARCHAR(100)",
      "referred_by VARCHAR(100)"
    ];

    // Loop through and add columns if they don't exist
    for (const colDef of columns) {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${colDef};`);
      console.log(`Processed column: ${colDef.split(' ')[0]}`);
    }

    console.log("✅ Migration complete. No data was lost.");
  } catch (err) {
    console.error("❌ Error during migration:", err);
  } finally {
    if (client) client.release();
    await db.pool.end();
  }
};

migrateUsers();
