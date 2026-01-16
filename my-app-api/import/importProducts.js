require("dotenv").config();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const db = require("../db");

// Helpers
const cleanInt = (v) => (v && v.toString().trim() !== "" ? parseInt(v) : null);
const cleanFloat = (v) => (v && v.toString().trim() !== "" ? parseFloat(v) : null);
const cleanDate = (v) => {
  if (!v || v.toString().trim() === "") return null;
  const str = v.toString().trim();
  // Convert DD-MM-YYYY to YYYY-MM-DD
  const parts = str.replace(/\//g, '-').split('-');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return str;
};
const cleanBarcode = (v) => {
  if (!v) return null;
  let str = v.toString().trim();
  if (/e[+-]/i.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) str = num.toFixed(0);
  }
  return str.replace(/[^0-9]/g, '');
};

async function importProducts() {
  try {
    const dataDir = path.join(__dirname, "..", "data");
    
    // Find the latest products CSV file (products.csv or products_TIMESTAMP.csv)
    const files = fs.readdirSync(dataDir)
      .filter(file => file.startsWith('products') && file.endsWith('.csv'))
      .map(file => ({
        name: file,
        time: fs.statSync(path.join(dataDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort descending by time (newest first)

    if (files.length === 0) { console.log("No product CSV files found."); return; }
    const filePath = path.join(dataDir, files[0].name);
    console.log(`Reading CSV from: ${files[0].name}`);

    // Normalize headers
    const normalizeHeader = (h) =>
      h
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    // Preload categories / subcategories / brands
    const categoryIds = new Set(
      (await db.query("SELECT id FROM categories")).rows.map((r) => r.id)
    );
    const subcategoryIds = new Set(
      (await db.query("SELECT id FROM subcategories")).rows.map((r) => r.id)
    );
    const brandMap = new Map(
      (await db.query("SELECT id, name FROM brands")).rows.map((b) => [
        b.name.toLowerCase(),
        b.id,
      ])
    );

    const processPromises = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(
          csv({
            mapHeaders: ({ header }) => normalizeHeader(header),
          })
        )

        .on("data", (row) => {
          const p = (async () => {
            try {
              const {
                item,
                vat,
                hierarchy1,
                hierarchy2,
                description,
                pack_description,
                qty_in_stock,
                cases_in_stock,
                "max. order": maxOrder,
                rrp,
                "por %": por,
                "pmp/plain": pmpPlain,
                type,

                brand, // The brand column from the CSV
                // BARCODE fields (normalized)
                ean1,
                ean2,
                ean3,
                "internal ean 1": int1,
                "internal ean 2": int2,
                "internal ean 3": int3,
                "internal ean 4": int4,

                // Pricing
                "pack 1": pack1,
                "sell 1": sell1,
                "pack 2": pack2,
                "sell 2": sell2,
                "pack 3": pack3,
                "sell 3": sell3,

                promid,
                promstart,
                promend,

                "promsell pack 1": promPack1,
                "promsell for sell 1": promSell1,
                "promsell pack 2": promPack2,
                "promsell for sell 2": promSell2,
                "promsell pack 3": promPack3,
                "promsell for sell 3": promSell3,
              } = row;

              if (!item) return;

              const categoryId = cleanInt(hierarchy1);
              const subcategoryId = cleanInt(hierarchy2);

              const finalCategory = categoryIds.has(categoryId)
                ? categoryId
                : null;
              const finalSubCategory = subcategoryIds.has(subcategoryId)
                ? subcategoryId
                : null;

              const brandId =
                brandMap.get((row.brand || "").toString().toLowerCase()) || null;

              // Insert/update product
              const productRes = await db.query(
                `
                INSERT INTO products
                (item, vat, brand_id, hierarchy1, hierarchy2, description,
                 pack_description, qty_in_stock, cases_in_stock, max_order,
                 rrp, por, pmp_plain, type)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                ON CONFLICT (item) DO UPDATE SET
                  vat = EXCLUDED.vat,
                  brand_id = EXCLUDED.brand_id,
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
                  item,
                  vat,
                  brandId,
                  finalCategory,
                  finalSubCategory,
                  description,
                  pack_description,
                  cleanInt(qty_in_stock),
                  cleanInt(cases_in_stock),
                  cleanInt(maxOrder),
                  cleanFloat(rrp),
                  cleanFloat(por),
                  pmpPlain,
                  type,
                ]
              );

              const productId = productRes.rows[0].id;

              // Clear existing barcodes for the product to ensure a clean import
              await db.query('DELETE FROM product_barcodes WHERE product_id = $1', [productId]);

              // --------------------------------------------
              // PRICING & BARCODES
              // --------------------------------------------

              const tierPrices = [
                { t: 1, pack: pack1, sell: sell1, promo: promSell1, promoPack: promPack1, ean: ean1, intEan: int1 },
                { t: 2, pack: pack2, sell: sell2, promo: promSell2, promoPack: promPack2, ean: ean2, intEan: int2 },
                { t: 3, pack: pack3, sell: sell3, promo: promSell3, promoPack: promPack3, ean: ean3, intEan: int3 },
              ];

              for (const p of tierPrices) {
                // Insert pricing if a sell price exists for the tier
                if (p.sell) {
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
                    p.promoPack || p.pack,
                    cleanFloat(p.sell),
                    cleanFloat(p.promo),
                    promid,
                    cleanDate(promstart),
                    cleanDate(promend),
                  ]
                );
              }

                // Insert EAN barcode if it exists for the tier
                const eanBarcode = cleanBarcode(p.ean);
                if (eanBarcode) {
                  await db.query(
                    `INSERT INTO product_barcodes (product_id, tier, barcode, barcode_type) VALUES ($1, $2, $3, 'EAN') ON CONFLICT DO NOTHING`,
                    [productId, p.t, eanBarcode]
                  );
                }

                // Insert Internal EAN barcode if it exists for the tier
                const intEanBarcode = cleanBarcode(p.intEan);
                if (intEanBarcode) {
                  await db.query(
                    `INSERT INTO product_barcodes (product_id, tier, barcode, barcode_type) VALUES ($1, $2, $3, 'Internal') ON CONFLICT DO NOTHING`,
                    [productId, p.t, intEanBarcode]
                  );
                }
              }

              // Handle the 4th internal EAN if it exists
              const int4Barcode = cleanBarcode(int4);
              if (int4Barcode) {
                await db.query(
                  `INSERT INTO product_barcodes (product_id, tier, barcode, barcode_type) VALUES ($1, 4, $2, 'Internal') ON CONFLICT DO NOTHING`,
                  [productId, int4Barcode, 'Internal']
                );
              }

              console.log(`✔ Imported/Updated product ${item}`);
            } catch (e) {
              console.error("❌ Error processing row:", e);
            }
          })();

          processPromises.push(p);
        })

        .on("end", async () => {
          await Promise.all(processPromises);
          console.log("✓ CSV import completed.");
          resolve();
        })

        .on("error", reject);
    });
  } catch (error) {
    console.error("Error importing CSV:", error);
  }
}

module.exports = { importProducts };
