const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const { split_image } = require('./supplementOCRFunctions');


router.post('/split_pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }

        const paperName = req.file.originalname.replace('.pdf', '');
        const { subject, banding = '', level } = req.body;

        console.log("📄 Received:", paperName, subject, banding, level);

        const images_URLs = await split_image(req.file.buffer,req, paperName, subject, banding, level);

        console.log('📦 Final Response:', {
            message: 'Successfully processed PDF.',
            images_URLs,
            paper_name: paperName,
            subject,
            banding,
            level
        });

        res.status(200).json({
            message: 'Successfully processed PDF.',
            images_URLs,
            paper_name: paperName,
            subject,
            banding,
            level
        });

    } catch (error) {
        console.error('❌ Error processing PDF:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});

module.exports = router;
