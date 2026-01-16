// runNightlyUpdate.js
const { importProducts } = require('./import/importProducts');
const { importCategories } = require('./utils/importCategories');
const { importBrands } = require('./utils/importBrands');
const db = require('./db');

async function runUpdate(closeConnection = true) {
  try {
    console.log('--- Starting Nightly Update ---');
    await importBrands();
    await importCategories();
    await importProducts();
    console.log('--- Nightly Update Finished ---');
  } catch (error) {
    console.error('--- Nightly Update FAILED ---', error);
  } finally {
    if (closeConnection) {
      console.log('Closing database connection pool...');
      await db.pool.end();
      console.log('Connection pool closed.');
    }
  }
}

if (require.main === module) {
  runUpdate(true);
}

module.exports = { runUpdate };
