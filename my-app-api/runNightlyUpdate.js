// runNightlyUpdate.js
const { importProducts } = require('./import/importProducts');
const { importCategories } = require('./utils/importCategories');
const db = require('./db');

const runUpdate = async () => {
  try {
    console.log('--- Starting Nightly Update ---');
    await importCategories();
    await importProducts();
    // In the future, you could add other nightly tasks here.
    console.log('--- Nightly Update Finished ---');
  } catch (error) {
    console.error('--- Nightly Update FAILED ---', error);
  } finally {
    // Always close the database pool when the script is done
    await db.pool.end();
  }
};

runUpdate();
