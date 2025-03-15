const express = require('express');
const multer = require('multer');
const router = express.Router();
const client = require('../databasepg');
const fs = require('fs');
const path = require('path'); // ✅ Ensure this line is present
const { fromPath } = require("pdf2image");
const upload = multer({ dest: 'uploads/' });

router.get('/test', (req, res) => {
    res.status(200).json({ message: 'Backend is working!' });
});


async function split_image(uploadedPdfPath) {
    try {
        if (!uploadedPdfPath) {
            throw new Error("No PDF file provided.");
        }

        console.log("Processing PDF:", uploadedPdfPath);

        const paperName = path.basename(uploadedPdfPath, path.extname(uploadedPdfPath));
        const outputDir = path.join(__dirname, "images", paperName);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const options = {
            density: 300,
            saveFilename: paperName,
            savePath: outputDir,
            format: "jpeg",
            width: 1024,
            popplerPath: "/usr/local/opt/poppler/bin" // ✅ Ensure correct Poppler path
        };

        const images = await fromPath(uploadedPdfPath, options);

        console.log(`Images saved to ${outputDir}:`, images.map(img => img.page));
        return { success: true, outputDir, images };
    } catch (error) {
        console.error("Error processing PDF:", error);
        return { success: false, error: error.message };
    }
}




router.post('/split_pdf', upload.single('file'), async (req, res) => {
    console.log('Request body:', req.body); // Log the request body
    console.log('Uploaded file:', req.file); // Log the uploaded file details
    try {
        const uploaded_pdf = req.file.filename;
        const images = await split_image(uploaded_pdf);

        console.log('Extracted images:', images);
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
