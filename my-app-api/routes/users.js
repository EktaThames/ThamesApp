const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    
    if (role === 'customer') {
      // Join to get sales rep name for the admin view
      const query = `
        SELECT u.*, s.name as sales_rep_name 
        FROM users u 
        LEFT JOIN users s ON u.sales_rep_id = s.id 
        WHERE u.role = 'customer'
      `;
      const result = await db.query(query);
      return res.json(result.rows);
    } 
    
    if (role) {
      const result = await db.query('SELECT * FROM users WHERE role = $1', [role]);
      return res.json(result.rows);
    }

    const result = await db.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
