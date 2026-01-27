const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const bcrypt = require('bcrypt');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { 
    username, password, name, email, phone, address, 
    businessName, businessType, entity,
    tradingStreet, tradingLine2, tradingCity, tradingZip, tradingCountry,
    ownerFirstName, ownerLastName,
    ownerStreet, ownerLine2, ownerCity, ownerZip, ownerCountry,
    ownerEmail, ownerPhone,
    vatNumber, eoid, fid, companyRegNumber,
    regStreet, regLine2, regCity, regZip, regCountry,
    referredBy
  } = req.body;

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
      `INSERT INTO users (
        username, password, role, name, email, phone, address, is_approved,
        company_name, business_type, entity_type,
        trading_address_line1, trading_address_line2, trading_city, trading_zip, trading_country,
        owner_first_name, owner_last_name,
        owner_address_line1, owner_address_line2, owner_city, owner_zip, owner_country,
        owner_email, owner_phone,
        vat_number, eoid, fid, company_reg_number,
        reg_address_line1, reg_address_line2, reg_city, reg_zip, reg_country,
        referred_by
      )
       VALUES ($1, $2, 'customer', $3, $4, $5, $6, false,
               $7, $8, $9,
               $10, $11, $12, $13, $14,
               $15, $16,
               $17, $18, $19, $20, $21,
               $22, $23,
               $24, $25, $26, $27,
               $28, $29, $30, $31, $32,
               $33
       )
       RETURNING id, username`,
      [
        username, hashedPassword, name, email, phone, address,
        businessName, businessType, entity,
        tradingStreet, tradingLine2, tradingCity, tradingZip, tradingCountry,
        ownerFirstName, ownerLastName,
        ownerStreet, ownerLine2, ownerCity, ownerZip, ownerCountry,
        ownerEmail, ownerPhone,
        vatNumber, eoid, fid, companyRegNumber,
        regStreet, regLine2, regCity, regZip, regCountry,
        referredBy
      ]
    );

    res.status(201).json({
      message: 'Registration successful. Please wait for admin approval.',
      userId: result.rows[0].id
    });

  } catch (err) {
    console.error('🔥 Register Error:', err);
    // Send the actual error message to the app for debugging (e.g., "column company_name does not exist")
    res.status(500).json({ message: err.message || 'Internal Server Error' });
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
    if (user.role === 'customer' && user.is_approved === false) {
      return res.status(403).json({ message: 'Your account is pending admin approval.' });
    }

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