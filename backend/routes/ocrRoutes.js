const express = require('express');
const axios = require("axios");
const FormData = require('form-data');
const multer = require('multer');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { exec } = require('child_process');
const upload = multer({ storage: multer.memoryStorage() });
const { OcrExecutionMinor } = require('../routes/ocrfunctions'); // Only import this
const { executeTopicLabel } = require('../routes/topic_label')
const client = require('../databasepg');
const processAllJSONFiles = require('./insertQuestions');
const processedDataStore = {}; // In-memory storage for processed PDF data


// OCR Scraping and Structuring of Data
router.post('/processImages', async (req, res) => {
    try {

        // create folder in s3 using the paper name + 
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

// Labeling of JSON file after OCR is completed.
router.post('/topiclabel', async (req, res) => {
    try {
        await executeTopicLabel();
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
async function split_image(pdfPath, req, paperName, subject, banding,level) {
    try {

        console.log("receiving PDF", pdfPath)
        console.log("I receive paperName @ split_image",paperName)
        console.log("I receive subject @ split_image",subject)
        console.log("I receive banding @ split_image",banding)
        console.log("I receive level @ split_image",level)
        
        const outputDir = path.join(__dirname, 'output_images3');
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
             /*
            const imageBasePath = `page_${i + 1}`;
            await new Promise((resolve, reject) => {
                exec(`pdftoppm -png "${singlePagePath}" "${imageBasePath}"`, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            */
        
            const imageFilename = `page_${i + 1}-1.png`;
            const imagePath = path.join(outputDir, imageFilename);


            const formDataImage = new FormData();
            formDataImage.append("image", fs.createReadStream(imagePath)); 
            formDataImage.append("paper_name", paperName); // Example: Set paper name
            formDataImage.append("subject", subject )
            formDataImage.append("banding", banding)
            formDataImage.append("level", level)
            const headers = formDataImage.getHeaders(); // Get correct multipart headers

    
            const uploadImageResponse = await axios.post(
                "http://localhost:5003/api/s3BucketCRUD/uploadProcessedImage", // ✅ Fixed URL
                formDataImage,
                { headers }
            );

            if (uploadImageResponse.data?.url) {
                imageUrls.push(uploadImageResponse.data.url);
              }
        

            /*
            if (fs.existsSync(imagePath)) {
                // ✅ FIXED: Correct API URL in response
                const imageUrl = `${req.protocol}://${req.get('host')}/api/ocr/images/${imageFilename}`;
                imageUrls.push(imageUrl);
            }
                */
        

            console.log(imageUrls)
            

            
            

            fs.unlinkSync(singlePagePath);
        }

        return imageUrls;
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw error;
    }
}


// Route to handle PDF upload and processing
router.post('/split_pdf', upload.single('file'), async (req, res) => {
    try {

        if (!req.file) {
            throw new Error('No file uploaded');
        }
        console.log("File received:", req.file);

        const paperName = req.file.originalname.replace('.pdf', '');
        
        const data = req.body
        const subject = data.subject;
        console.log("subject", subject)
        const banding = data.banding || "";;
        console.log("banding",banding)
        const level = data.level;
        console.log("level",level)
        
    
        // ✅ Save the buffer as a temporary file
        const tempFilePath = path.join(__dirname, `${paperName}.pdf`);
        fs.writeFileSync(tempFilePath, req.file.buffer);
        console.log("Saved PDF to temp file:", tempFilePath);
        const images = await split_image(tempFilePath, req ,paperName, subject, banding, level);
        fs.unlinkSync(tempFilePath);
        

        // ✅ Store processed data
        processedDataStore[paperName] = { paperName, images, subject, banding, level };

        console.log('📦 Final Response:', {
            message: 'Successfully processed PDF.',
            images,
            paper_name: paperName,
            subject,
            banding,
            level
        });

        res.status(200).json({
            message: 'Successfully processed PDF.',
            images,
            paper_name: paperName,
            subject,
            banding,
            level
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

router.post('/insertQuestions',(req,res)=>{
    processAllJSONFiles()
})


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
