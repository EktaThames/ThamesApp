// index.js
const express = require('express');
require('dotenv').config(); // Loads variables from .env file
const cors = require('cors');

const db = require('./db'); // Import the database query function
const authRoutes = require('./routes/auth'); // Import auth routes

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());
// Middleware to parse JSON bodies
app.use(express.json());

// Test database connection on server start
db.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database', err.stack);
  } else {
    console.log('Successfully connected to the database. Server time:', res.rows[0].now);
  }
});

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Use the auth routes with a prefix
app.use('/api/auth', authRoutes);

app.get('/products', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching products', err.stack);
    res.status(500).send('Error fetching products');
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
