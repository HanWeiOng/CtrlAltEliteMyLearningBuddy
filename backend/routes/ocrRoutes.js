const express = require('express');
const multer = require('multer');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { exec } = require('child_process');
const FormData = require('form-data');
const upload = multer({ storage: multer.memoryStorage() });
const { OcrExecutionMinor } = require('../routes/ocrfunctions'); // Only import this
const client = require('../databasepg');
const processedDataStore = {}; // In-memory storage for processed PDF data


router.post('/processImages', async (req, res) => {
    try {
        console.log('Request received at /processImages');
        // Handle logic here
        const { data } = req.body; 
        const images = data.images
        console.log("This is the backend",images )
        console.log("Executing OCRExecutorMajor with images:", images);
        await OcrExecutionMinor(data);
        /*

        //req.body contains your images + exam paper name 
        //check wether exam paper name is already present in db or not
        // to upload to s3 bucket with name of exam paper 
        console.log('req.body:', req.body);
        console.log('req.files:', req.files);
        res.status(200).json({ message: 'Successfully uploaded images. Hello YZ' });
        // call a function to process the uploaded images - with parameter as the exam paper images
        // toRetrieveFromS3 exam papers images 
        */
    } catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({ message: 'Internal server error. ' + error.message });
    }
})


// Serve images via an API endpoint
router.use('/images', express.static(path.join(__dirname, 'output_images')));

// Test route
router.get('/test', (req, res) => {
    res.status(200).json({ message: 'Backend is working!' });a
});

// Function to split PDF and convert pages to images
async function split_image(pdfPath, req) {
    try {
        const outputDir = path.join(__dirname, 'output_images');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const totalPages = pdfDoc.getPageCount();
        let imageUrls = [];

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

            const imageFilename = `page_${i + 1}-1.png`;
            const imagePath = path.join(outputDir, imageFilename);
            if (fs.existsSync(imagePath)) {
                // ✅ FIXED: Correct API URL in response
                const imageUrl = `${req.protocol}://${req.get('host')}/api/ocr/images/${imageFilename}`;
                imageUrls.push(imageUrl);
            }

            fs.unlinkSync(singlePagePath);
        }

        return imageUrls;
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw error;
    }
}


// Route to handle PDF upload and processing
router.post('/split_pdf', upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'subject', maxCount: 1 },
    { name: 'banding', maxCount: 1 },
    { name: 'level', maxCount: 1 }
]), async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            throw new Error('No file uploaded');
        }

        const tempFilePath = path.join(__dirname, 'temp.pdf');
        fs.writeFileSync(tempFilePath, req.files.file[0].buffer);
        const images = await split_image(tempFilePath, req);
        fs.unlinkSync(tempFilePath);

        const paperName = req.files.file[0].originalname.replace('.pdf', '');
        const subject = req.body.subject;
        const banding = req.body.banding;
        const level = req.body.level;

        // Store processed data
        processedDataStore[paperName] = { paperName, images, subject, banding, level };
        
        // New: Upload generated images to S3
        const s3UploadResults = [];
        
        try {
            // For each generated image, upload to S3
            for (const imageUrl of images) {
                // Extract the image filename from the URL
                const imageName = imageUrl.split('/').pop();
                const imagePath = path.join(__dirname, 'output_images', imageName);
                
                if (fs.existsSync(imagePath)) {
                    // Create form data for S3 upload
                    const formData = new FormData();
                    formData.append('image', fs.createReadStream(imagePath));
                    formData.append('examPaperName', paperName);
                    formData.append('subject', subject || '');
                    formData.append('level', level || '');
                    formData.append('banding', banding || '');
                    
                    // Upload to S3 via the new endpoint
                    const uploadResponse = await fetch(`${req.protocol}://${req.get('host')}/api/s3BucketCRUD/uploadExamImage`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (uploadResponse.ok) {
                        const result = await uploadResponse.json();
                        s3UploadResults.push({
                            originalImage: imageUrl,
                            s3Result: result
                        });
                    } else {
                        console.error(`Failed to upload ${imageName} to S3`);
                    }
                }
            }
        } catch (uploadError) {
            console.error('Error during S3 upload:', uploadError);
            // Continue with response even if S3 upload fails
        }

        res.status(200).json({
            message: 'Successfully processed PDF.',
            images,
            paper_name: paperName,
            subject,
            banding,
            level,
            s3Uploads: s3UploadResults.length > 0 ? s3UploadResults : undefined
        });
    } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});

router.get('/get_processed_data/:paperName', (req, res) => {
    const paperName = req.params.paperName;
    const data = processedDataStore[paperName];

    if (!data) {
        return res.status(404).json({ message: "No data found for this paper." });
    }

    res.status(200).json(data);
});



async function toRetrieveFromS3(examPaperName) {
    try {
        //include OCR code here
    } catch (error) {
        console.error('Error retrieving images from s3:', error);
        return [];
    }
}




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
