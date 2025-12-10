const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password, and role are required.' });
  }

  try {
    // Handle admin login with hardcoded credentials as requested
    if (role === 'admin') {
      if (username === 'admin@example.com' && password === 'admin123') {
        const adminUser = {
          id: 'admin01', // Static ID for example
          username: 'admin@example.com',
          role: 'admin',
          name: 'Admin User'
        };

        // Check if JWT_SECRET is defined to prevent 500 crashes
        if (!process.env.JWT_SECRET) {
          console.error('❌ FATAL ERROR: JWT_SECRET is missing in .env file');
          return res.status(500).json({ message: 'Server configuration error: Missing JWT_SECRET' });
        }

        // Create and sign the JWT
        const token = jwt.sign(
          { user: adminUser },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        return res.json({
          message: 'Admin login successful',
          token,
          user: adminUser,
        });
      } else {
        return res.status(401).json({ message: 'Invalid admin credentials' });
      }
    }

    // Placeholder for other user roles (customer, sales_rep).
    // You would query your database here to find the user and verify their password.
    return res.status(404).json({ message: `Login for role '${role}' is not yet implemented.` });

  } catch (err) {
    console.error('🔥 Login Error:', err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;