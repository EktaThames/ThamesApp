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
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim() // Trim whitespace from headers
        }))
        .on("data", (row) => rows.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    if (rows.length === 0) {
      console.log("Category CSV is empty. Nothing to import.");
      return;
    }

    const categories = new Map();
    const subcategories = new Map();
    let currentCategoryId = null; // This will hold the state of the last seen category

    for (const row of rows) {
      const categoryIdStr = row['Cat Number'];
      const categoryName = row['Category Name'];
      const subcategoryIdStr = row['Sub cat number'];
      const subcategoryName = row['Sub-Category name'];

      // If the row defines a new category, update our state.
      if (categoryIdStr && categoryIdStr.trim() !== '') {
        const parsedCatId = parseInt(categoryIdStr, 10);
        if (!isNaN(parsedCatId)) {
          currentCategoryId = parsedCatId; // Remember this category for the next rows
          if (categoryName && !categories.has(currentCategoryId)) {
            categories.set(currentCategoryId, { id: currentCategoryId, name: categoryName });
          }
        }
      }

      // If the row has subcategory info, add it using the remembered category ID.
      const subcategoryId = parseInt(subcategoryIdStr, 10);
      if (!isNaN(subcategoryId) && subcategoryName && currentCategoryId) {
        subcategories.set(subcategoryId, { id: subcategoryId, category_id: currentCategoryId, name: subcategoryName });
      }
    }

    if (categories.size > 0) {
      for (const category of categories.values()) {
        await db.query('INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name', [category.id, category.name]);
      }
      console.log("Imported/Updated categories.");
    }

    if (subcategories.size > 0) {
      for (const sub of subcategories.values()) {
        await db.query('INSERT INTO subcategories (id, category_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $3, category_id = $2', [sub.id, sub.category_id, sub.name]);
      }
      console.log("Imported/Updated subcategories.");
    }

  } catch (error) {
    console.error("Error importing categories CSV:", error);
    throw error; // Re-throw the error to stop the parent script
  }
}

module.exports = { importCategories };
