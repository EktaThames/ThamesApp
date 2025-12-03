// routes/brands.js
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET all brands
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM brands ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching brands:', err.message);
    res.status(500).json({ message: 'Server error fetching brands.' });
  }
});

module.exports = router;