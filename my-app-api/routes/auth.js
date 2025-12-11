const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const bcrypt = require('bcrypt');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password, and role are required.' });
  }

  try {
    // Query the database for the user
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 AND role = $2',
      [username, role]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials or role.' });
    }

    const user = result.rows[0];

    // Verify password (In production, use bcrypt.compare)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Create and sign the JWT
    const token = jwt.sign(
      { user: { id: user.id, username: user.username, role: user.role, name: user.name } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name },
    });

  } catch (err) {
    console.error('🔥 Login Error:', err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;