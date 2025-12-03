// utils/importBrands.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const db = require("../db");

async function importBrands() {
  try {
    const filePath = path.join(__dirname, "..", "data", "brands.csv");
    console.log("Reading brands CSV...");

    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ headers: ['Brand Name'], skipLines: 1 }))
        .on("data", (row) => rows.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    for (const row of rows) {
      const brandName = row['Brand Name'];
      if (brandName && brandName.trim() !== '') {
        await db.query('INSERT INTO brands (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [brandName.trim()]);
      }
    }
    console.log("Imported/Updated brands.");
  } catch (error) {
    console.error("Error importing brands CSV:", error);
    throw error;
  }
}

module.exports = { importBrands };