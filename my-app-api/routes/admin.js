const express = require('express');
const router = express.Router();
const db = require('../db');
  // const { importCustomersOdoo } = require('../import/importCustomersOdoo');
  // const { importProductsOdoo } = require('../import/importProductsOdoo');

router.post('/assign-customer', async (req, res) => {
  try {
    const { customer_id, sales_rep_id } = req.body;
    
    await db.query(
      'UPDATE users SET sales_rep_id = $1 WHERE id = $2 AND role = \'customer\'',
      [sales_rep_id, customer_id]
    );
    
    res.json({ message: 'Sales representative assigned successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/pending-users
router.get('/pending-users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * 
       FROM users 
       WHERE is_approved = false AND role = 'customer'
       ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/approve-user
router.post('/approve-user', async (req, res) => {
  try {
    const { user_id } = req.body;
    
    await db.query(
      'UPDATE users SET is_approved = true WHERE id = $1',
      [user_id]
    );
    
    res.json({ message: 'User approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/sync-odoo
router.post('/sync-odoo', async (req, res) => {
  try {
    // Run sync in background (don't await if you want immediate response)
    // await importCustomersOdoo();
    res.json({ message: 'Odoo customer sync is currently disabled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sync failed.' });
  }
});

// POST /api/admin/sync-products-odoo
router.post('/sync-products-odoo', async (req, res) => {
  try {
    // Run sync in background
    importProductsOdoo();
    res.json({ message: 'Odoo Product sync started in background.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sync failed.' });
  }
});

module.exports = router;
