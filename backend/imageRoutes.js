// routes/imageRoutes.js
const express = require('express');
const multer = require('multer');
const { uploadImage, listImages, deleteImage } = require('../s3Service');
const router = express.Router();

// Set up multer to store files in memory
const upload = multer();

// Create (Upload) an image with optional metadata.
// Expecting multipart/form-data with fields: examPaperName, image (file), and optionally metadata (as JSON string).
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { examPaperName, metadata } = req.body;
    if (!examPaperName) {
      return res.status(400).json({ message: 'examPaperName is required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    // If metadata is provided as a JSON string, parse it.
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (error) {
        return res.status(400).json({ message: 'Invalid metadata format. It should be valid JSON.' });
      }
    }

    const result = await uploadImage(examPaperName, req.file, parsedMetadata);
    res.status(201).json({ message: 'Image uploaded successfully', data: result });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Read (List) images for a specific exam paper.
router.get('/:examPaperName', async (req, res) => {
  try {
    const { examPaperName } = req.params;
    const data = await listImages(examPaperName);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching images', error: error.message });
  }
});

// Delete an image by examPaperName and imageName.
// Expecting a JSON body with examPaperName and imageName.
router.delete('/', async (req, res) => {
  try {
    const { examPaperName, imageName } = req.body;
    if (!examPaperName || !imageName) {
      return res.status(400).json({ message: 'examPaperName and imageName are required' });
    }
    const data = await deleteImage(examPaperName, imageName);
    res.status(200).json({ message: 'Image deleted successfully', data });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting image', error: error.message });
  }
});

module.exports = router;