const express = require('express');
const router = express.Router();
const client = require('../databasepg');

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

// function to ask OCR image output to s3BucketCRUD.js


router.get('/', async (req, res) => {
    try{
        const result = await client.query(`
            SELECT * FROM xyz
        `);
        console.log(result.rows)
        res.status(200).json(result.rows)
    }catch(error){
        console.error('Error retreiving all activitylog:', error);
        res.status(500).json({ message: 'Internal server error. ' + error.message });
    }
});

module.exports = router;
