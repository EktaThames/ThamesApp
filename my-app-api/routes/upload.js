const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { runUpdate } = require('../runNightlyUpdate');

const router = express.Router();

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Configure Multer to save file with a timestamp to avoid locking issues
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dataDir);
  },
  filename: (req, file, cb) => {
    // Save as products_TIMESTAMP.csv
    cb(null, `products_${Date.now()}.csv`);
  }
});

const upload = multer({ storage: storage });

// POST endpoint to upload CSV
router.post('/products', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    
    console.log(`✅ New product file uploaded: ${req.file.filename}`);
    console.log('Triggering immediate database update...');
    
    // Run the update logic immediately (false = keep DB connection open)
    // The import script will automatically pick up this new latest file
    await runUpdate(false);
    
    res.status(200).json({ 
      message: 'Product CSV uploaded and database updated successfully.' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'File upload failed.' });
  }
});

module.exports = router;
