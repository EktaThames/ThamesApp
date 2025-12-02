require('dotenv').config();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const db = require("../db");

// Helpers
const cleanInt = (v) =>
  v && v.toString().trim() !== "" ? parseInt(v) : null;
const cleanFloat = (v) =>
  v && v.toString().trim() !== "" ? parseFloat(v) : null;
const cleanDate = (v) =>
  v && v.toString().trim() !== "" ? v : null;

async function importProducts() {
  try {
    const filePath = path.join(__dirname, "..", "data", "products.csv");
    console.log("Reading CSV...");

    const rows = [];
    let rowCount = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => {
          rowCount++;
          rows.push(row);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    console.log(`Total rows found: ${rowCount}`);

    // Pre-fetch all valid category and subcategory IDs for quick lookups
    const categoryResult = await db.query('SELECT id FROM categories');
    const validCategoryIds = new Set(categoryResult.rows.map(r => r.id));

    const subcategoryResult = await db.query('SELECT id FROM subcategories');
    const validSubcategoryIds = new Set(subcategoryResult.rows.map(r => r.id));

    console.log(`Found ${validCategoryIds.size} valid categories and ${validSubcategoryIds.size} valid subcategories.`);

    for (const row of rows) {
      const {
        item,
        VAT,
        hierarchy1,
        hierarchy2,
        description,
        pack_description,
        qty_in_stock,
        cases_in_stock,
        "Max. Order": maxOrder,
        RRP,
        "POR %": por,
        "PMP/Plain": pmpPlain,
        Type,

        // barcodes
        EAN1,
        EAN2,
        EAN3,
        "Internal EAN 1": int1,
        "Internal EAN 2": int2,
        "Internal EAN 3": int3,
        "Internal EAN 4": int4,

        // pricing fields
        "Pack 1": pack1,
        "Sell 1": sell1,
        "Pack 2": pack2,
        "Sell 2": sell2,
        "Pack 3": pack3,
        "Sell 3": sell3,

        promID,
        promStart,
        promEnd,
        "promSell Pack 1": promPack1,
        "promSell for Sell 1": promSell1,
        "promSell Pack 2": promPack2,
        "promSell for Sell 2": promSell2,
        "promSell Pack 3": promPack3,
        "promSell for Sell 3": promSell3
      } = row;

      if (!item) continue;

      // Validate category and subcategory IDs before insertion
      const categoryId = cleanInt(hierarchy1);
      const subcategoryId = cleanInt(hierarchy2);
      const finalCategoryId = validCategoryIds.has(categoryId) ? categoryId : null;
      const finalSubcategoryId = validSubcategoryIds.has(subcategoryId) ? subcategoryId : null;

      // ---------------------------------------------
      // UPSERT PRODUCT
      // ---------------------------------------------
      const productResult = await db.query(
        `
          INSERT INTO products
          (item, vat, hierarchy1, hierarchy2, description, pack_description,
           qty_in_stock, cases_in_stock, max_order, rrp, por, pmp_plain, type)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          ON CONFLICT (item)
          DO UPDATE SET
            vat = EXCLUDED.vat,
            hierarchy1 = EXCLUDED.hierarchy1,
            hierarchy2 = EXCLUDED.hierarchy2,
            description = EXCLUDED.description,
            pack_description = EXCLUDED.pack_description,
            qty_in_stock = EXCLUDED.qty_in_stock,
            cases_in_stock = EXCLUDED.cases_in_stock,
            max_order = EXCLUDED.max_order,
            rrp = EXCLUDED.rrp,
            por = EXCLUDED.por,
            pmp_plain = EXCLUDED.pmp_plain,
            type = EXCLUDED.type
          RETURNING id
        `,
        [
          cleanInt(item),
          VAT,
          finalCategoryId,
          finalSubcategoryId,
          description,
          pack_description,
          cleanInt(qty_in_stock),
          cleanInt(cases_in_stock),
          cleanInt(maxOrder),
          cleanFloat(RRP),
          cleanFloat(por),
          pmpPlain,
          Type,
        ]
      );

      const productId = productResult.rows[0].id;

      // ---------------------------------------------
      // INSERT BARCODES
      // ---------------------------------------------
      const barcodes = [
        { code: EAN1, type: "EAN" },
        { code: EAN2, type: "EAN" },
        { code: EAN3, type: "EAN" },
        { code: int1, type: "Internal" },
        { code: int2, type: "Internal" },
        { code: int3, type: "Internal" },
        { code: int4, type: "Internal" },
      ];

      for (const b of barcodes) {
        if (b.code && b.code.trim() !== "") {
          await db.query(
            `INSERT INTO product_barcodes (product_id, barcode, barcode_type)
             VALUES ($1,$2,$3)
             ON CONFLICT DO NOTHING`,
            [productId, b.code, b.type]
          );
        }
      }

      // ---------------------------------------------
      // INSERT PRICING (tiers 1–3)
      // ---------------------------------------------
      const prices = [
        { t: 1, pack: pack1, sell: sell1, promo: promSell1, promoPack: promPack1 },
        { t: 2, pack: pack2, sell: sell2, promo: promSell2, promoPack: promPack2 },
        { t: 3, pack: pack3, sell: sell3, promo: promSell3, promoPack: promPack3 }
      ];

      for (const p of prices) {
        if (p.sell && p.sell !== "") {
          await db.query(
            `
              INSERT INTO product_pricing
              (product_id, tier, pack_size, sell_price, promo_price, promo_id, promo_start, promo_end)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
              ON CONFLICT (product_id, tier)
              DO UPDATE SET
                pack_size = EXCLUDED.pack_size,
                sell_price = EXCLUDED.sell_price,
                promo_price = EXCLUDED.promo_price,
                promo_id = EXCLUDED.promo_id,
                promo_start = EXCLUDED.promo_start,
                promo_end = EXCLUDED.promo_end
            `,
            [
              productId,
              p.t,
              p.pack,
              cleanFloat(p.sell),
              cleanFloat(p.promo),
              promID,
              cleanDate(promStart),
              cleanDate(promEnd)
            ]
          );
        }
      }

      console.log(`Imported/Updated product: ${item}`);
    }

    console.log("CSV import completed successfully.");
  } catch (error) {
    console.error("Error importing CSV:", error);
  }
}

module.exports = { importProducts };
