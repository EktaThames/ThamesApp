// routes/categories.js
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET all categories
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err.message);
    res.status(500).json({ message: 'Server error fetching categories.' });
  }
});

// GET all subcategories
router.get('/sub', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM subcategories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching subcategories:', err.message);
    res.status(500).json({ message: 'Server error fetching subcategories.' });
  }
});

module.exports = router;
