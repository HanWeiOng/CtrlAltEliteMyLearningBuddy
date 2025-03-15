const express = require('express');
const client = require('../databasepg');
const multer = require('multer');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { exec } = require('child_process');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/test', (req, res) => {
    res.status(200).json({ message: 'Backend is working!' });
});

async function split_image(pdfPath) {
    try {
        const outputDir = path.join(__dirname, 'output_images');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const totalPages = pdfDoc.getPageCount();
        let imagePaths = [];

        for (let i = 0; i < totalPages; i++) {
            const newPdfDoc = await PDFDocument.create();
            const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
            newPdfDoc.addPage(copiedPage);

            const singlePageBytes = await newPdfDoc.save();
            const singlePagePath = path.join(outputDir, `page_${i + 1}.pdf`);
            fs.writeFileSync(singlePagePath, singlePageBytes);

            const imageBasePath = path.join(outputDir, `page_${i + 1}`);
            await new Promise((resolve, reject) => {
                exec(`pdftoppm -png "${singlePagePath}" "${imageBasePath}"`, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });

            const imagePath = `${imageBasePath}-1.png`;
            if (fs.existsSync(imagePath)) {
                imagePaths.push(imagePath);
            }

            fs.unlinkSync(singlePagePath);
        }

        return imagePaths;
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw error;
    }
}

router.post('/split_pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }

        // Convert buffer to a temporary file
        const tempFilePath = path.join(__dirname, 'temp.pdf');
        fs.writeFileSync(tempFilePath, req.file.buffer);

        const images = await split_image(tempFilePath);

        // Delete temp file after processing
        fs.unlinkSync(tempFilePath);

        res.status(200).json({ message: 'Successfully processed PDF.', images });
    } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});



async function toRetrieveFromS3(examPaperName) {
    try {
        //include OCR code here
    } catch (error) {
        console.error('Error retrieving images from s3:', error);
        return [];
    }
}

// router.push('/upload_images', async (req, res) => {
//     try {
//         //req.body contains your images + exam paper name 
//         //check wether exam paper name is already present in db or not
//         // to upload to s3 bucket with name of exam paper 
//         console.log('req.body:', req.body);
//         console.log('req.files:', req.files);
//         res.status(200).json({ message: 'Successfully uploaded images.' });
//         // call a function to process the uploaded images - with parameter as the exam paper images
//         // toRetrieveFromS3 exam papers images 
//     } catch (error) {
//         console.error('Error uploading images:', error);
//         res.status(500).json({ message: 'Internal server error. ' + error.message });

//     }
// }),


router.get('/', async (req, res) => {
    try{
        const result = await client.query(`
            SELECT * FROM questions
        `);
        console.log(result.rows)
        res.status(200).json(result.rows)
    }catch(error){
        console.error('Error retreiving all activitylog:', error);
        res.status(500).json({ message: 'Internal server error. ' + error.message });
    }
});

module.exports = router;
