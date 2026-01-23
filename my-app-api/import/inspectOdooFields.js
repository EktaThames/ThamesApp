require('dotenv').config();
const https = require('https');

// Odoo Configuration
const ODOO_URL = process.env.ODOO_URL ? process.env.ODOO_URL.trim() : null;
const ODOO_DB = process.env.ODOO_DB ? process.env.ODOO_DB.trim() : null;
const ODOO_USERNAME = process.env.ODOO_USERNAME ? process.env.ODOO_USERNAME.trim() : null;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD ? process.env.ODOO_PASSWORD.trim() : null;

// Helper for JSON-RPC calls
const callOdoo = (service, method, args) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service, method, args },
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
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) reject(response.error);
          else resolve(response.result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
};

const inspectFields = async () => {
  if (!ODOO_URL) { console.log("❌ .env variables missing"); return; }

  try {
    console.log(`Connecting to ${ODOO_URL}...`);
    const uid = await callOdoo('common', 'authenticate', [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD, {}]);
    
    if (!uid) { console.log("❌ Auth failed"); return; }
    console.log(`Authenticated. UID: ${uid}`);

    // Fetch Field Definitions instead of Record Data
    // This avoids "Access Error" on computed fields like stock.valuation.layer
    const fields = await callOdoo('object', 'execute_kw', [
      ODOO_DB, uid, ODOO_PASSWORD, 
      'product.product', 
      'fields_get', 
      [], 
      { attributes: ['string', 'type'] } 
    ]);

    if (fields) {
      console.log("\n✅ Field Names Found on 'product.product':");
      console.log("----------------------------------------");
      
      const keys = Object.keys(fields).sort();
      
      // 1. Print Custom Fields (x_...)
      keys.forEach(key => {
        if (key.startsWith('x_')) console.log(`⭐ ${key} (Type: ${fields[key].type}, Label: "${fields[key].string}")`);
      });

      // 2. Print Potential Promotion Fields (containing 'prom')
      console.log("\n--- Potential Promotion Fields ---");
      keys.forEach(key => {
        if (key.toLowerCase().includes('prom') && !key.startsWith('x_')) console.log(`❓ ${key} (Type: ${fields[key].type}, Label: "${fields[key].string}")`);
      });

      console.log("\n--- Other Standard Fields ---");
      keys.forEach(key => {
        if (!key.startsWith('x_') && !key.toLowerCase().includes('prom')) console.log(`   ${key} (${fields[key].string})`);
      });

    } else {
      console.log("No fields found.");
    }

  } catch (e) {
    console.error("Error:", e);
  }
};

inspectFields();
