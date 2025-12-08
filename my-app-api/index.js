// index.js
require('dotenv').config(); // This MUST be the first line
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');       // Auth routes
const productRoutes = require('./routes/products'); // Products routes
const categoryRoutes = require('./routes/categories'); // Category routes
const brandRoutes = require('./routes/brands'); // Brand routes
const db = require('./db');                 // Database connection

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());           // Enable CORS for all routes
app.use(express.json());   // Parse JSON request bodies

// Test database connection on server start
db.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error connecting to the database:', err.stack);
  } else {
    console.log('✅ Successfully connected to the database. Server time:', res.rows[0].now);
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Routes
app.use('/api/auth', authRoutes); // Auth endpoints: register/login
app.use('/api/products', productRoutes); // Products endpoints: list/get products
app.use('/api/categories', categoryRoutes); // Category endpoints
app.use('/api/brands', brandRoutes); // Brand endpoints

// Fallback route for 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
