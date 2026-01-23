const https = require('https');
const db = require('../db');

// Odoo Configuration
const ODOO_URL = process.env.ODOO_URL ? process.env.ODOO_URL.trim() : null;
const ODOO_DB = process.env.ODOO_DB ? process.env.ODOO_DB.trim() : null;
const ODOO_USERNAME = process.env.ODOO_USERNAME ? process.env.ODOO_USERNAME.trim() : null;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD ? process.env.ODOO_PASSWORD.trim() : null;

// FIELD MAPPING
// Left side: Your App's concept (CSV columns)
// Right side: Odoo Technical Field Name
const FIELD_MAP = {
  item: 'pos_base_code',          // Base Internal Reference (used as SKU)
  description: 'name',            // Product Name
  variant_name: 'display_name',   // Variant Name (e.g. "Product (Size)")
  vat: 'tax_string',              // Tax String
  hierarchy1: 'categ_id',         // Product Category
  hierarchy2: 'pos_categ_ids',    // Subcategory (Point of Sale Category)
  pack_description: 'unit_size',  // Unit Size
  qty_in_stock: 'qty_available',  // Standard Odoo stock field
  pack_ratio: 'pack_ratio',       // Pack Ratio (used to calculate cases in stock)
  rrp: 'rrp_price',               // RRP Price
  por: 'por_percent',             // POR (%)
  pmp_plain: 'is_pmp',            // Is PMP (boolean)
  brand_id: 'brand_id',           // Brand (Many2One)
  template_id: 'product_tmpl_id', // Product Template (for grouping variants)
  type: 'type',                   // Product Type
  // max_order: 'x_max_order',       // ⚠️ Field not found in Odoo. Create 'x_max_order' (Integer) in Odoo first.

  // Promotions
  // prom_id: 'x_prom_id',           // ⚠️ Field not found. Create 'x_prom_id' (Char) in Odoo.
  // prom_start: 'x_prom_start',     // ⚠️ Field not found. Create 'x_prom_start' (Date) in Odoo.
  // prom_end: 'x_prom_end',         // ⚠️ Field not found. Create 'x_prom_end' (Date) in Odoo.
  // prom_price: 'x_prom_price',     // ⚠️ Field not found. Create 'x_prom_price' (Float) in Odoo.
  
  // Pricing
  sell1: 'list_price',            // Standard Sales Price
  
  // Barcodes
  ean1: 'barcode',                // Standard Barcode field
  internal_ean1: 'default_code',  // Map Internal Reference as an internal barcode
  // internal_ean2: 'x_internal_ean_2', // ⚠️ Field not found. Create in Odoo.
  // internal_ean3: 'x_internal_ean_3', // ⚠️ Field not found. Create in Odoo.
  // internal_ean4: 'x_internal_ean_4', // ⚠️ Field not found. Create in Odoo.
};

// Helper to clean Odoo values (handles Many2One arrays [id, "Name"] and false/null)
const cleanOdooValue = (val) => {
  if (val === false || val === null || val === undefined) return null;
  if (Array.isArray(val)) {
    return val.length > 0 ? val[0] : null; // Return just the ID from [id, "Name"] or first ID of many2many
  }
  return val;
};

// Helper to clean Odoo Date strings (YYYY-MM-DD)
const cleanOdooDate = (val) => {
  const v = cleanOdooValue(val);
  return v ? v : null; // Postgres handles 'YYYY-MM-DD' string fine for DATE columns
};

// Helper for JSON-RPC calls (Native HTTPS)
const callOdoo = (service, method, args, retries = 3) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: service,
        method: method,
        args: args
      },
      id: 1
    });

    const url = new URL(ODOO_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    const attemptRequest = (remainingRetries) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          // Handle 5xx Server Errors (502 Bad Gateway, 503 Service Unavailable, etc.)
          if (res.statusCode >= 500 && res.statusCode < 600) {
             if (remainingRetries > 0) {
                 console.log(`⚠️  Server returned ${res.statusCode}. Retrying in 5s... (${remainingRetries} left)`);
                 setTimeout(() => attemptRequest(remainingRetries - 1), 5000);
                 return;
             }
             return reject(new Error(`HTTP Status ${res.statusCode}: ${data}`));
          }

          try {
            if (res.statusCode !== 200) {
               return reject(new Error(`HTTP Status ${res.statusCode}: ${data}`));
            }
            const response = JSON.parse(data);
            if (response.error) {
              console.error('Odoo Error:', JSON.stringify(response.error, null, 2));
              if (response.error.data && response.error.data.message && response.error.data.message.includes('database')) {
                 console.log('\n⚠️  HINT: The database name seems incorrect. Please check your .env file or ask your developer for the exact DB name.\n');
              }
              reject(new Error(response.error.data?.message || response.error.message || 'Odoo Error'));
            } else {
              resolve(response.result);
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    };

    attemptRequest(retries);
  });
};

// Helper to Sync Categories from a batch of products
const syncCategories = async (client, products) => {
  const categories = new Map();
  
  products.forEach(p => {
    const cat = p[FIELD_MAP.hierarchy1]; // [id, "Name"]
    if (Array.isArray(cat) && cat.length === 2) {
      categories.set(cat[0], cat[1]);
    }
  });

  for (const [id, name] of categories) {
    await client.query(
      `INSERT INTO categories (id, name) VALUES ($1, $2) 
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [id, name]
    );
  }
};

// Helper to Sync Brands from a batch of products
const syncBrands = async (client, products) => {
  const brands = new Map(); // OdooID -> Name

  products.forEach(p => {
    const brand = p[FIELD_MAP.brand_id]; // [id, "Name"]
    if (Array.isArray(brand) && brand.length === 2) {
      brands.set(brand[0], brand[1]);
    }
  });

  const odooToPostgresBrandMap = new Map();

  for (const [odooId, name] of brands) {
    // Upsert by Name into Postgres brands table
    const res = await client.query(
      `INSERT INTO brands (name) VALUES ($1) 
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
       RETURNING id`,
      [name]
    );
    odooToPostgresBrandMap.set(odooId, res.rows[0].id);
  }
  return odooToPostgresBrandMap;
};

const importProductsOdoo = async () => {
  console.log('--- Starting Odoo Product Sync ---');

  if (!ODOO_URL || !ODOO_DB || !ODOO_USERNAME || !ODOO_PASSWORD) {
    console.error('❌ Missing Odoo credentials in .env file. Please configure ODOO_URL, ODOO_DB, ODOO_USERNAME, and ODOO_PASSWORD.');
    return;
  }

  try {
    // 1. Authenticate (JSON-RPC)
    console.log(`Connecting to ${ODOO_URL}...`);
    console.log(`Target Database: ${ODOO_DB}`);
    const uid = await callOdoo('common', 'authenticate', [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD, {}]);

    if (!uid) {
      console.error('❌ Odoo Auth Failed: No UID returned.');
      console.error(`   DB: ${ODOO_DB}`);
      console.error(`   User: ${ODOO_USERNAME}`);
      console.error(`   Password starts with: ${ODOO_PASSWORD ? ODOO_PASSWORD.substring(0, 4) : 'N/A'}...`);
      console.error('   👉 Check your .env file. It likely contains an old password.');
      return;
    }
    console.log(`Authenticated with UID: ${uid}`);

    // 2. Fetch Products (with Pagination)
    // Only fetch fields that are actually defined in FIELD_MAP
    const fieldsToFetch = [...new Set(Object.values(FIELD_MAP))]; 
    
    const domain = [['active', '=', true]]; // Fetch all active products (we filter by SKU later)
    
    const allVariants = [];
    let offset = 0;
    const limit = 200; // Batch size (Reduced from 1000 to prevent timeouts)
    let hasMore = true;

    const client = await db.pool.connect();
    
    try {
      // 1. Fetch ALL variants first
      while (hasMore) {
        console.log(`Fetching products offset ${offset}...`);
        
        const products = await callOdoo('object', 'execute_kw', [
          ODOO_DB, 
          uid, 
          ODOO_PASSWORD, 
          'product.product', 
          'search_read', 
          [domain, fieldsToFetch],
          { offset: offset, limit: limit }
        ]);

        if (products.length === 0) {
          hasMore = false;
          break;
        }

        allVariants.push(...products);
        offset += limit;
      }

      console.log(`Fetched total ${allVariants.length} variants. Grouping by SKU...`);

      // 2. Group Variants by Product Template ID (to combine pack sizes)
      const groupedProducts = {};
      for (const p of allVariants) {
        const tmpl = p[FIELD_MAP.template_id];
        // product_tmpl_id is [id, "Name"] or just id
        const tmplId = Array.isArray(tmpl) ? tmpl[0] : tmpl;
        
        if (!tmplId) continue;
        if (!groupedProducts[tmplId]) groupedProducts[tmplId] = [];
        groupedProducts[tmplId].push(p);
      }

      await client.query('BEGIN');

      // 3. Sync Categories & Brands (using all fetched data)
      await syncCategories(client, allVariants);
      const brandMap = await syncBrands(client, allVariants);

      // 4. Process Each Group (Template ID)
      for (const tmplId in groupedProducts) {
        const variants = groupedProducts[tmplId];
        
        // Sort variants by price (lowest price = Tier 1 usually)
        variants.sort((a, b) => (a.list_price || 0) - (b.list_price || 0));

        const mainVariant = variants[0]; // Use the first variant for main product details

        // Determine Main SKU (Item Code)
        // Prefer pos_base_code, fallback to default_code
        let sku = cleanOdooValue(mainVariant[FIELD_MAP.item]);
        if (!sku) sku = cleanOdooValue(mainVariant[FIELD_MAP.internal_ean1]); // default_code
        if (!sku) continue; // Skip if no SKU found

        // Resolve Brand ID
        let postgresBrandId = null;
        const odooBrand = mainVariant[FIELD_MAP.brand_id];
        if (Array.isArray(odooBrand) && odooBrand.length > 0) {
             postgresBrandId = brandMap.get(odooBrand[0]);
        }

        // Upsert Product
        let pmpValue = null;
        const pmpRaw = mainVariant[FIELD_MAP.pmp_plain];
        if (typeof pmpRaw === 'boolean') {
            pmpValue = pmpRaw ? 'PMP' : 'PLAIN';
        } else {
            const cleaned = cleanOdooValue(pmpRaw);
            if (cleaned && ['PMP', 'PLAIN'].includes(cleaned)) pmpValue = cleaned;
        }

        // Calculate Cases in Stock
        const qty = cleanOdooValue(mainVariant[FIELD_MAP.qty_in_stock]) || 0;
        const ratio = cleanOdooValue(mainVariant[FIELD_MAP.pack_ratio]);
        const casesInStock = (ratio && ratio > 0) ? Math.floor(qty / ratio) : 0;

        const productRes = await client.query(`
          INSERT INTO products (
            item, vat, brand_id, hierarchy1, hierarchy2, description, pack_description,
            qty_in_stock, cases_in_stock, max_order, rrp, por, pmp_plain, type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (item) DO UPDATE SET
            vat = EXCLUDED.vat, brand_id = EXCLUDED.brand_id, hierarchy1 = EXCLUDED.hierarchy1, hierarchy2 = EXCLUDED.hierarchy2,
            description = EXCLUDED.description, pack_description = EXCLUDED.pack_description,
            qty_in_stock = EXCLUDED.qty_in_stock, cases_in_stock = EXCLUDED.cases_in_stock,
            max_order = EXCLUDED.max_order, rrp = EXCLUDED.rrp, por = EXCLUDED.por,
            pmp_plain = EXCLUDED.pmp_plain, type = EXCLUDED.type
          RETURNING id
        `, [
          sku, cleanOdooValue(mainVariant[FIELD_MAP.vat]), postgresBrandId, cleanOdooValue(mainVariant[FIELD_MAP.hierarchy1]), cleanOdooValue(mainVariant[FIELD_MAP.hierarchy2]),
          cleanOdooValue(mainVariant[FIELD_MAP.description]), cleanOdooValue(mainVariant[FIELD_MAP.pack_description]),
          cleanOdooValue(mainVariant[FIELD_MAP.qty_in_stock]) || 0, casesInStock,
          cleanOdooValue(mainVariant[FIELD_MAP.max_order]), cleanOdooValue(mainVariant[FIELD_MAP.rrp]), cleanOdooValue(mainVariant[FIELD_MAP.por]),
          pmpValue, cleanOdooValue(mainVariant[FIELD_MAP.type])
        ]);

        const productId = productRes.rows[0].id;

        // Clear existing pricing and barcodes for this product (to rebuild from variants)
        await client.query('DELETE FROM product_pricing WHERE product_id = $1', [productId]);
        await client.query('DELETE FROM product_barcodes WHERE product_id = $1', [productId]);

        // Insert each variant as a Tier
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          const tier = i + 1;
          
          // Determine Pack Size Label
          let packSize = null;
          const displayName = cleanOdooValue(v[FIELD_MAP.variant_name]);
          
          // Strategy 1: Extract from parenthesis in display_name (e.g. "Coke (6 Pack)" -> "6 Pack")
          if (displayName && displayName.includes('(') && displayName.endsWith(')')) {
              const match = displayName.match(/\(([^)]+)\)$/);
              if (match) {
                  packSize = match[1];
              }
          }
          
          // Strategy 2: Use unit_size if Strategy 1 failed
          if (!packSize) {
             packSize = cleanOdooValue(v[FIELD_MAP.pack_description]);
          }
          
          // Strategy 3: Fallback
          if (!packSize) {
             packSize = `Pack ${tier}`;
          }

          const sellPrice = parseFloat(cleanOdooValue(v[FIELD_MAP.sell1])) || 0;
          const rawPromPrice = cleanOdooValue(v[FIELD_MAP.prom_price]);
          const promoPrice = rawPromPrice !== null ? parseFloat(rawPromPrice) : null;
          const promoId = cleanOdooValue(v[FIELD_MAP.prom_id]);
          const promoStart = cleanOdooDate(v[FIELD_MAP.prom_start]);
          const promoEnd = cleanOdooDate(v[FIELD_MAP.prom_end]);

          // Insert Pricing
          await client.query(`
            INSERT INTO product_pricing (product_id, tier, pack_size, sell_price, promo_price, promo_id, promo_start, promo_end) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            productId, 
            tier, 
            packSize, 
            sellPrice, 
            promoPrice,
            promoId, 
            promoStart, 
            promoEnd
          ]);

          // Insert Barcodes (Main + Extra)
          const barcodeFields = [
            { key: 'ean1', type: 'EAN' },
            { key: 'internal_ean1', type: 'INTERNAL' },
            { key: 'internal_ean2', type: 'INTERNAL' },
            { key: 'internal_ean3', type: 'INTERNAL' },
            { key: 'internal_ean4', type: 'INTERNAL' },
          ];

          for (const bf of barcodeFields) {
            // Only try to read if the field is mapped
            if (FIELD_MAP[bf.key]) {
                const bVal = cleanOdooValue(v[FIELD_MAP[bf.key]]);
                if (bVal) {
                    await client.query(`INSERT INTO product_barcodes (product_id, barcode, barcode_type, tier) VALUES ($1, $2, $3, $4)`, [productId, bVal, bf.type, tier]);
                }
            }
          }
        }
      }

      await client.query('COMMIT');
      console.log(`✔ Odoo Product Sync Complete. Processed ${Object.keys(groupedProducts).length} unique products.`);

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Odoo Product Sync Error:', error);
  }
};

module.exports = { importProductsOdoo };
