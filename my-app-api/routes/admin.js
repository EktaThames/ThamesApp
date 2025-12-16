const express = require('express');
const router = express.Router();
const db = require('../db');

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

module.exports = router;
