const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/my-customers', async (req, res) => {
  try {
    // req.userData is populated by the checkAuth middleware
    const salesRepId = req.user.id;
    
    const result = await db.query(
      'SELECT * FROM users WHERE sales_rep_id = $1',
      [salesRepId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
