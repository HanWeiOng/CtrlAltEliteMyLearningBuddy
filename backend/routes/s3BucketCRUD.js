// 1. write an async function to upload images to S3 bucket


// 2. write a GET router function to retrieve images from S3 bucket, accepting params subject, banding, level (filter)

// 3. write GET router function to retrieve ALL images, grouped by folder names (no filter)
const express = require('express');
const router = express.Router();
const client = require('../databasepg');
require('dotenv').config()
const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require('multer');
const crypto = require('crypto');
const sharp = require('sharp');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const bucketName = process.env.S3_BUCKET_NAME;
const bucketRegion = process.env.S3_REGION;
const accessKey = process.env.AWS_ACCESS_KEY_ID; 
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;


const s3 = new S3Client({
    credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretAccessKey 
    },
    region: bucketRegion
});


router.post('/uploadProcessedImage', upload.single('image'), async (req, res) => {
    try {
        //resize image
        console.log("Uploaded file object:", req.file);
        if (!req.file) {
            return res.status(400).json({ error: "No file received." });
        }

        const data = req.body 
        const subject =  data.subject
        const banding = data.banding
        const level = data.level
        //const paperName = "AES_2019" //data.paper_name //
        const folderName =  data.paper_name+"_"+subject+"_"+banding+"_"+level  //"AES_2019" //paper_name+"_"+subject+"_"+banding+"_"+level
        //const paperName = inputPaperName + "_" + subject + "_" + banding +  "_"  + level
        //console.log (paperName)
        const imageName = req.file ? req.file.originalname : "undefined-file"; // ✅ Extract from uploaded file

        console.log("This is the folderName" ,folderName)
        console.log("This is the image", imageName)

        console.log("🔍 Checking if folder exists:", folderName);

        // ✅ Check if folder (prefix) exists in S3
        const listParams = {
            Bucket: bucketName,
            Prefix: `${folderName}/`, // S3 treats this as a "folder"
            MaxKeys: 1 // Only need one key to verify existence
        };

        const listCommand = new ListObjectsV2Command(listParams);
        const listResponse = await s3.send(listCommand);

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            console.log(`📂 Folder ${folderName}/ does not exist. Creating it...`);

            // ✅ Create an empty "folder" in S3 by uploading a dummy file
            const folderParams = {
                Bucket: bucketName,
                Key: `${folderName}/`, // S3 treats this as a folder
                Body: "",
                ContentType: "application/x-directory"
            };

            const folderCommand = new PutObjectCommand(folderParams);
            await s3.send(folderCommand);
            console.log(`✅ Folder ${folderName}/ created successfully.`);
        } else {
            console.log(`✅ Folder ${folderName}/ already exists. Proceeding with upload.`);
        }

        const fileBuffer = await sharp(req.file.buffer).resize({
            height : 500, 
            width : 500, 
            fit: 'contain',
        }).toBuffer()
    
        const params = {
            Bucket: bucketName,
            Key: `${folderName}/${imageName}`,
            Body: fileBuffer,
            ContentType: req.file.mimetype,
            ACL: 'public-read' // 👈 Add this
            
        };

        const command = new PutObjectCommand(params);
        const response = await s3.send(command);
        console.log('S3 Response:', response);
        console.log("✅ Upload successful! S3 Response:", response);
        //res.status(200).json({ message: "Upload successful", data: response });

        const imageUrl = `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${folderName}/${imageName}`;
        res.status(200).json({
            message: "Upload successful",
            url: imageUrl,
            data: response
          });

    } catch (error) {
        console.error('Error uploading file to S3:', error);
        res.status(500).send('Error uploading file');
    }
})




router.post('/retrieveProcessedImage', async (req, res) => {
    try {
        //resize image

        const data = req.body 
        const subject =  data.subject
        const banding = data.banding
        const level = data.level
        //const paperName = "AES_2019" //data.paper_name //
        const folderName = "AES_2019" //paper_name+"_"+subject+"_"+banding+"_"+level
        const imageName = data.imageName // ✅ Extract from uploaded file
       

        console.log("This is the folderName" ,folderName)
        console.log("This is the image", imageName)

        const getObjectParams = {
            Bucket: bucketName,
            Key: `${folderName}/${imageName}`
        }
        const command = new GetObjectCommand(getObjectParams);

        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

        return res.status(200).json({
            message: "✅ Image retrieved successfully.",
            signedUrl: url,
            imageName: imageName,
            folder: folderName,
            expiresIn: 3600 // Inform frontend of expiration time
        });
    } catch (error) {
        console.error('Error fetching or processing photo:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

module.exports = router;