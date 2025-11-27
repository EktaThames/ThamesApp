// runNightlyUpdate.js
const { importProducts } = require('./utils/importProducts');
const db = require('./db');

const runUpdate = async () => {
  console.log('--- Starting Nightly Update ---');
  await importProducts();
  // In the future, you could add other nightly tasks here.
  console.log('--- Nightly Update Finished ---');
};

runUpdate();
