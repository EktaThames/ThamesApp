const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const bcrypt = require('bcrypt');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, name, email, phone, address, company_name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ message: 'Username, password, and name are required.' });
  }

  try {
    // Check if user exists
    const userCheck = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Username/Email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user (Default role: customer, is_approved: FALSE)
    // We map 'username' to email usually, but keeping your schema structure
    const result = await db.query(
      `INSERT INTO users (username, password, role, name, email, phone, address, is_approved)
       VALUES ($1, $2, 'customer', $3, $4, $5, $6, false)
       RETURNING id, username`,
      [username, hashedPassword, name, email, phone, address]
    );

    res.status(201).json({
      message: 'Registration successful. Please wait for admin approval.',
      userId: result.rows[0].id
    });

  } catch (err) {
    console.error('🔥 Register Error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

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

    // Check Approval Status
    // if (user.role !== 'admin' && user.is_approved === false) {
    //   return res.status(403).json({ message: 'Your account is pending admin approval.' });
    // }

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