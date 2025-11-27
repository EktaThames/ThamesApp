// routes/products.js
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET all products with barcodes and pricing
router.get('/', async (req, res) => {
  try {
    // Fetch products
    const productsResult = await db.query('SELECT * FROM products ORDER BY item ASC');
    const products = productsResult.rows;

    // Fetch all barcodes
    const barcodeResult = await db.query('SELECT * FROM product_barcodes');
    const barcodes = barcodeResult.rows;

    // Fetch all pricing
    const pricingResult = await db.query('SELECT * FROM product_pricing');
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

      return {
        ...product,
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

module.exports = router;
