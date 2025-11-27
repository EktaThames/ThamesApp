// importProducts.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('./db');

const importProducts = async () => {
  const results = [];
  const filePath = path.join(__dirname, 'data', 'products.csv');

  return new Promise((resolve, reject) => {
    console.log('Starting product import...');

    // 1. Read the CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('error', (error) => reject(error)) // Handle stream errors
      .on('end', async () => {
        console.log(`Finished reading CSV file. Found ${results.length} products.`);

        try {
          // 2. Clear the existing products table
          await db.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE;');
          console.log('Cleared the "products" table.');

          // 3. Insert new products into the database
          for (const product of results) {
            // Map CSV columns to database columns
            const name = product.description;
            const price = parseFloat(product['Sell 1']); // 'Sell 1' is the case price
            const brand = product.hierarchy2; // Using hierarchy2 as brand
            const size = product.pack_description;

            // Determine product type from 'PMP/Plain' column
            let type = 'standard'; // Default type
            if (product['PMP/Plain'] === 'PMP') {
              type = 'pmp';
            }
            // You can add more logic here for 'promo' or 'clearance' if needed

            // Skip rows that don't have a valid name or price
            if (!name || isNaN(price)) {
              console.warn('Skipping invalid product row:', product);
              continue;
            }

            const queryText = `
              INSERT INTO products (name, price, brand, size, type)
              VALUES ($1, $2, $3, $4, $5)
            `;
            await db.query(queryText, [name, price, brand, size, type]);
          }

          console.log('Successfully imported all products into the database.');
          resolve(); // Resolve the promise on success
        } catch (err) {
          console.error('Error during product import:', err);
          reject(err); // Reject the promise on error
        }
      });
  });
};

// We will call this function from another script, so we export it.
module.exports = { importProducts };
