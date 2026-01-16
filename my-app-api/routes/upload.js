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

// Configure Multer to save file as 'products.csv' in 'data' folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dataDir);
  },
  filename: (req, file, cb) => {
    // Use a temp name to avoid EBUSY errors during upload if products.csv is locked
    cb(null, `products_upload_${Date.now()}.csv`);
  }
});

const upload = multer({ storage: storage });

// POST endpoint to upload CSV
router.post('/products', upload.single('file'), async (req, res) => {
  let tempPath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    
    tempPath = req.file.path;
    const targetPath = path.join(dataDir, 'products.csv');

    // Attempt to replace the existing products.csv
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath); // Delete old file
      }
      fs.renameSync(tempPath, targetPath); // Move new file to products.csv
    } catch (fsError) {
      console.error("File System Error (EBUSY?):", fsError);
      // If we can't write to products.csv, it means an import is likely already running
      return res.status(503).json({ 
        message: 'System is currently processing a file. Please try again in a few minutes.' 
      });
    }
    
    console.log('✅ New products.csv uploaded. Triggering immediate database update...');
    
    // Run the update logic immediately (false = keep DB connection open)
    await runUpdate(false);
    
    res.status(200).json({ 
      message: 'Product CSV uploaded and database updated successfully.' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    // Clean up temp file if it still exists
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch(e) {}
    }
    res.status(500).json({ message: 'File upload failed.' });
  }
});

module.exports = router;
