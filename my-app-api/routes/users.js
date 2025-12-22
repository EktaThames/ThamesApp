const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/users/me - Get current user's profile
router.get('/me', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const userId = req.user.id;
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching current user:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/me - Update current user's profile
router.put('/me', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const userId = req.user.id;
    const { address, phone } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (address !== undefined) {
      updates.push(`address = $${idx++}`);
      values.push(address);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

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
