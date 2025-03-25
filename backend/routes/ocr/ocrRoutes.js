const express = require('express');
const multer = require('multer');
const router = express.Router();
const axios = require('axios')
const upload = multer({ storage: multer.memoryStorage() });
const { split_image } = require('./split_image');
const { OcrExecutionMinor } = require('./ocrExecutor')

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

    console.log("🟢 OCR Trigger Received Data:", data);

    await OcrExecutionMinor(data); // this expects `paper_name`, `images`, etc.

    res.status(200).json({
      message: 'OCR processing initiated successfully.',
      paper_name: data.paper_name,
      image_count: data.images.length,
    });
  } catch (error) {
    console.error('❌ Error in /run_ocr:', error);
    res.status(500).json({ message: 'OCR execution failed: ' + error.message });
  }
});

module.exports = router
