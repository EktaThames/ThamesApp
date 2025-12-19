// routes/products.js
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET all products with barcodes and pricing
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { search, categories, subcategories, brands, pmp, promotion, clearance } = req.query;

    console.log('Fetching products with filters:', { search, pmp, promotion, clearance });

    let queryText = 'SELECT p.* FROM products p';
    const queryParams = [];
    let whereClauses = [];
    let paramIndex = 1;

    // Join for promotion filtering if needed
    if (promotion === 'true') {
      queryText += ' JOIN product_pricing pp ON p.id = pp.product_id';
    }

    // Search Filter
    if (search) {
      whereClauses.push(`(p.description ILIKE $${paramIndex} OR p.item ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Category Filter (expects comma-separated IDs: "1,2,3")
    if (categories) {
      const catIds = categories.split(',').map(Number);
      whereClauses.push(`p.hierarchy1 = ANY($${paramIndex}::int[])`);
      queryParams.push(catIds);
      paramIndex++;
    }

    // Subcategory Filter
    if (subcategories) {
      const subIds = subcategories.split(',').map(Number);
      whereClauses.push(`p.hierarchy2 = ANY($${paramIndex}::int[])`);
      queryParams.push(subIds);
      paramIndex++;
    }

    // Brand Filter
    if (brands) {
      const brandIds = brands.split(',').map(Number);
      whereClauses.push(`p.brand_id = ANY($${paramIndex}::int[])`);
      queryParams.push(brandIds);
      paramIndex++;
    }

    // PMP Filter
    if (pmp === 'true') {
      whereClauses.push(`p.pmp_plain = 'PMP'`);
    }

    // Handle Promotion and Clearance filters
    const promoClause = `pp.promo_price IS NOT NULL AND pp.promo_price > 0`;
    const clearanceClause = `TRIM(p.item) ILIKE '%/R'`;

    if (promotion === 'true' && clearance === 'true') {
        whereClauses.push(`(${promoClause} OR ${clearanceClause})`);
    } else if (promotion === 'true') {
        whereClauses.push(promoClause);
    } else if (clearance === 'true') {
        whereClauses.push(clearanceClause);
    }

    if (whereClauses.length > 0) {
      queryText += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Handle duplicates from Joins
    if (promotion === 'true') {
      queryText += ' GROUP BY p.id';
    }

    // Pagination
    queryText += ` ORDER BY p.item ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const productsResult = await db.query(queryText, queryParams);
    const products = productsResult.rows;

    if (products.length === 0) {
      return res.json([]);
    }

    // Fetch details ONLY for the products on this page
    const productIds = products.map(p => p.id);
    
    const barcodeResult = await db.query(
      'SELECT * FROM product_barcodes WHERE product_id = ANY($1::int[])',
      [productIds]
    );
    const barcodes = barcodeResult.rows;

    const pricingResult = await db.query(
      'SELECT * FROM product_pricing WHERE product_id = ANY($1::int[])',
      [productIds]
    );
    const pricing = pricingResult.rows;

    // Attach barcodes and pricing to products
    const productsWithDetails = products.map((product) => {
      const productBarcodes = barcodes.filter((b) => b.product_id === product.id);
      const productPricing = pricing
        .filter((p) => p.product_id === product.id)
        .map((p) => ({
          tier: p.tier,
          pack_size: p.pack_size,
          sell_price: p.sell_price,
          promo_price: p.promo_price,
          promo_id: p.promo_id,
          promo_start: p.promo_start,
          promo_end: p.promo_end,
        }));
      const imageUrl = `https://thames-product-images.s3.us-east-1.amazonaws.com/produc_images/bagistoimagesprivatewebp/${product.item}.webp`;

      return {
        ...product,
        image_url: imageUrl,
        barcodes: productBarcodes,
        pricing: productPricing,
      };
    });

    res.json(productsWithDetails);
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ message: 'Server error fetching products.' });
  }
});

// GET single product by ID
router.get('/:id', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (!productId) return res.status(400).json({ message: 'Invalid product ID.' });

  try {
    const productResult = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    const product = productResult.rows[0];
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const barcodesResult = await db.query(
      'SELECT * FROM product_barcodes WHERE product_id = $1',
      [productId]
    );

    const pricingResult = await db.query(
      'SELECT * FROM product_pricing WHERE product_id = $1 ORDER BY tier ASC',
      [productId]
    );

    res.json({
      ...product,
      barcodes: barcodesResult.rows,
      pricing: pricingResult.rows,
    });
  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ message: 'Server error fetching product.' });
  }
});

// GET product by barcode
router.get('/by-barcode/:barcode', async (req, res) => {
    const { barcode } = req.params;
    if (!barcode) {
        return res.status(400).json({ message: 'Barcode is required.' });
    }

    try {
        // 1. Find the product_id from the product_barcodes table
        const barcodeResult = await db.query('SELECT product_id FROM product_barcodes WHERE barcode = $1', [barcode]);
        const barcodeEntry = barcodeResult.rows[0];

        if (!barcodeEntry) {
            return res.status(404).json({ message: 'Product not found for this barcode.' });
        }

        const productId = barcodeEntry.product_id;

        // 2. Fetch the full product details using the found product_id
        const productResult = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
        const product = productResult.rows[0];

        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        // 3. Fetch associated barcodes and pricing (same logic as the main GET / route)
        const allBarcodesResult = await db.query('SELECT * FROM product_barcodes WHERE product_id = $1', [productId]);
        const allPricingResult = await db.query('SELECT * FROM product_pricing WHERE product_id = $1 ORDER BY tier ASC', [productId]);

        const imageUrl = `https://thames-product-images.s3.us-east-1.amazonaws.com/produc_images/bagistoimagesprivatewebp/${product.item}.webp`;

        res.json({ ...product, image_url: imageUrl, barcodes: allBarcodesResult.rows, pricing: allPricingResult.rows });
    } catch (err) {
        console.error('Error fetching product by barcode:', err.message);
        res.status(500).json({ message: 'Server error fetching product by barcode.' });
    }
});

module.exports = router;
