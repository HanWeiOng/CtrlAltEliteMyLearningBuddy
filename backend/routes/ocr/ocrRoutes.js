// ocrRoutes.js

const express = require('express');
const multer = require('multer');
const router = express.Router();
const axios = require('axios');
const upload = multer({ storage: multer.memoryStorage() });
const { split_image } = require('./split_image');
const { OcrExecutionMinor } = require('./ocrExecutor');
const { topicLabelling } = require('./topicLabelling');
const processAllJSONFiles = require('./insertPostgresql');

router.post('/split_pdf', upload.single('file'), async (req, res) => {
  try {
    const paperName = req.file.originalname.replace('.pdf', '');
    const { subject, banding = '', level } = req.body;

    const imageUrls = await split_image(req.file.buffer, paperName, subject, banding, level);

    const resultPayload = {
      paper_name: paperName,
      subject,
      banding,
      level,
      images: imageUrls,
    };

    // Forward to OCR endpoint
    const ocrResponse = await axios.post('http://localhost:5003/api/ocr/run_ocr', resultPayload);

    return res.status(200).json({
      message: 'PDF processed and OCR triggered successfully.',
      image_urls: imageUrls,
      ocr_response: ocrResponse.data,
    });
  } catch (error) {
    console.error('❌ Error in /split_pdf:', error);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
});

router.post('/run_ocr', async (req, res) => {
  try {
    const data = req.body;

    console.log('🟢 OCR Trigger Received Data:', data);

    const resultPayload = await OcrExecutionMinor(data);

    const topicLabellingResponse = await axios.post('http://localhost:5003/api/ocr/topicLabelling', resultPayload);

    res.status(200).json({
      message: 'OCR processing initiated successfully.',
      paper_name: resultPayload.paper_name,
      image_count: resultPayload.images?.length || 0,
    });
  } catch (error) {
    console.error('❌ Error in /run_ocr:', error);
    res.status(500).json({ message: 'OCR execution failed: ' + error.message });
  }
});

router.post('/topicLabelling', async (req, res) => {
  try {
    const data = req.body;
    await topicLabelling(data);

    const loadingResponse = await axios.post('http://localhost:5003/api/ocr/insertIntoPostgresql', {});

    res.status(200).json({
      message: 'Topic labelling initiated successfully.',
    });
  } catch (error) {
    console.error('❌ Error in /topicLabelling:', error);
    res.status(500).json({ message: 'Topic labelling failed: ' + error.message });
  }
});

router.post('/insertIntoPostgresql', async (req, res) => {
  try {
    await processAllJSONFiles();
    res.status(200).json({
      message: 'Data successfully inserted into Postgresql.',
    });
  } catch (error) {
    console.error('❌ Error in /insertIntoPostgresql:', error);
    res.status(500).json({ message: 'Insertion failed: ' + error.message });
  }
});

module.exports = router;
