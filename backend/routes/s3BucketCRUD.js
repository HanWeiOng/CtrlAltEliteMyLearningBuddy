// 1. write an async function to upload images to S3 bucket


// 2. write a GET router function to retrieve images from S3 bucket, accepting params subject, banding, level (filter)

// 3. write GET router function to retrieve ALL images, grouped by folder names (no filter)
const express = require('express');
const router = express.Router();
const client = require('../databasepg');
const multer = require('multer');
const s3Controller = require('../s3Service');
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require('crypto');
const sharp = require('sharp');

// Load environment variables
const bucketName = process.env.S3_BUCKET_NAME;
const bucketRegion = process.env.S3_REGION;
const accessKey = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Initialize S3 client
const s3 = new S3Client({
    credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretAccessKey
    },
    region: bucketRegion
});

// Set up multer middleware to handle file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Random name generator for unique filenames
const randomImageName = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');

// Upload exam paper image to S3
router.post('/uploadExamImage', upload.single('image'), async (req, res) => {
    try {
        console.log('Received uploadExamImage request');
        
        if (!req.file) {
            console.log('No file in request');
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        console.log('File received:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
        console.log('Body params:', req.body);
        
        // Get metadata from the request
        const { examPaperName, subject, banding, level } = req.body;
        
        if (!examPaperName) {
            return res.status(400).json({ message: 'examPaperName is required' });
        }
        
        // Create folder structure: subject/level/banding/examPaperName/
        let folderStructure = 'exam_papers';
        if (subject) folderStructure += `/${subject}`;
        if (level) folderStructure += `/${level}`;
        if (banding) folderStructure += `/${banding}`;
        folderStructure += `/${examPaperName}`;
        
        // Generate unique filename
        const imageName = randomImageName();
        const originalName = req.file.originalname;
        const fileExtension = originalName.split('.').pop();
        
        // Resize image if needed (optional)
        let fileBuffer = req.file.buffer;
        if (req.body.resize === 'true') {
            fileBuffer = await sharp(req.file.buffer)
                .resize({ width: 1200, height: 1200, fit: 'inside' })
                .toBuffer();
        }
        
        // Upload to S3
        const params = {
            Bucket: bucketName,
            Key: `${folderStructure}/${imageName}.${fileExtension}`,
            Body: fileBuffer,
            ContentType: req.file.mimetype,
            Metadata: {
                'original-name': originalName,
                'exam-paper': examPaperName,
                'subject': subject || '',
                'level': level || '',
                'banding': banding || ''
            }
        };
        
        const command = new PutObjectCommand(params);
        await s3.send(command);
        
        // Return success with file information
        res.status(200).json({
            message: 'File uploaded successfully',
            fileInfo: {
                originalName: originalName,
                s3Key: `${folderStructure}/${imageName}.${fileExtension}`,
                examPaperName: examPaperName,
                subject: subject,
                level: level,
                banding: banding
            }
        });
        
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        res.status(500).json({ message: 'Error uploading file', error: error.message });
    }
});

// List all exam papers
router.get('/listExamPapers', async (req, res) => {
    try {
        const prefix = 'exam_papers/';
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            Delimiter: '/'
        });
        
        const response = await s3.send(command);
        
        // Process the common prefixes (folders)
        const folders = response.CommonPrefixes?.map(prefix => {
            // Extract the folder name from the prefix
            const folderPath = prefix.Prefix;
            return folderPath.substring(prefix.length, folderPath.length - 1);
        }) || [];
        
        res.status(200).json({
            folders: folders
        });
        
    } catch (error) {
        console.error('Error listing exam papers:', error);
        res.status(500).json({ message: 'Error listing exam papers', error: error.message });
    }
});

// List images within a specific exam paper
router.get('/listExamImages/:examPaperName', async (req, res) => {
    try {
        const { examPaperName } = req.params;
        const { subject, level, banding } = req.query;
        
        let prefix = 'exam_papers';
        if (subject) prefix += `/${subject}`;
        if (level) prefix += `/${level}`;
        if (banding) prefix += `/${banding}`;
        prefix += `/${examPaperName}/`;
        
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix
        });
        
        const response = await s3.send(command);
        
        // Generate signed URLs for each image
        const images = await Promise.all((response.Contents || []).map(async (item) => {
            const getObjectParams = {
                Bucket: bucketName,
                Key: item.Key
            };
            
            const command = new GetObjectCommand(getObjectParams);
            const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
            
            return {
                key: item.Key,
                lastModified: item.LastModified,
                size: item.Size,
                url: url
            };
        }));
        
        res.status(200).json({
            examPaperName: examPaperName,
            subject: subject,
            level: level,
            banding: banding,
            images: images
        });
        
    } catch (error) {
        console.error('Error listing exam images:', error);
        res.status(500).json({ message: 'Error listing exam images', error: error.message });
    }
});

// Upload user image route
router.post('/uploadUserImage/:userID', upload.single('image'), s3Controller.uploadImage);

// Get user image route
router.get('/getUserImage/:userID', s3Controller.displayImage);

// Upload pet image route
router.post('/uploadPetImage/:petID', upload.single('image'), s3Controller.uploadPetImage);

// Get pet image route
router.get('/getPetImage/:petID', s3Controller.displayPetImage);

// Upload training image route
router.post('/uploadTrainingImage/:trainID', upload.single('image'), s3Controller.uploadTrainingImage);

// Get training image route
router.get('/getTrainingImage/:trainID', s3Controller.displayTrainingImage);

// Simple test route for debugging
router.get('/ping', (req, res) => {
  console.log('Ping route accessed');
  res.status(200).json({ message: 'pong', time: new Date().toISOString() });
});

// Debug route to check AWS credentials
router.get('/check-aws', (req, res) => {
  console.log('Checking AWS credentials...');
  const credentials = {
    region: process.env.S3_REGION || 'Missing',
    bucketName: process.env.S3_BUCKET_NAME || 'Missing',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ? 'Present (hidden)' : 'Missing',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? 'Present (hidden)' : 'Missing'
  };
  
  res.status(200).json({ 
    message: 'AWS credentials check', 
    credentials,
    envVars: Object.keys(process.env).filter(key => key.includes('AWS') || key.includes('S3'))
  });
});

module.exports = router;
