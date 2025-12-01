// utils/importCategories.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const db = require("../db");

async function importCategories() {
  try {
    const filePath = path.join(__dirname, "..", "data", "categories.csv");
    console.log("Reading categories CSV...");

    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    // Separate categories and subcategories
    const categories = {};
    const subcategories = [];

    for (const row of rows) {
      // Add unique categories
      if (row.hierarchy1_id && row.hierarchy1_id.trim() !== '' && !categories[row.hierarchy1_id]) {
        categories[row.hierarchy1_id] = row.hierarchy1_name;
      }
      // Add subcategories
      if (row.hierarchy2_id && row.hierarchy2_id.trim() !== '') {
        subcategories.push(row);
      }
    }

    // Insert categories
    for (const id in categories) {
      await db.query('INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name', [id, categories[id]]);
    }
    console.log("Imported/Updated categories.");

    // Insert subcategories
    for (const sub of subcategories) {
      await db.query('INSERT INTO subcategories (id, category_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id', [sub.hierarchy2_id, sub.hierarchy1_id, sub.hierarchy2_name]);
    }
    console.log("Imported/Updated subcategories.");

  } catch (error) {
    console.error("Error importing categories CSV:", error);
    throw error; // Re-throw the error to stop the parent script
  }
}

module.exports = { importCategories };
