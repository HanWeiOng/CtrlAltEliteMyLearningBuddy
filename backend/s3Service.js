'use client' 

require('dotenv').config()
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require('multer');
const crypto = require('crypto');
const sharp = require('sharp');


const storage = multer.memoryStorage();

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

//Random Name Generator
const randomImageName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex') //rename the photo



const s3Controller = {
    uploadImage : async (req, res) => {
        const folderName = 'userimage';
        try{    
            const {userID} = req.params

            if (!req.file) {
                console.error('No file uploaded');
                return res.status(400).send('No file uploaded');
            }
            console.log("req.body", req.body);
            console.log("req.file", req.file);
            /* Logging of req.file
                Display :             
                field name : image
                original name : "_____.png"
                buffer - most important to send into S3
            */

            //Generating a Unique Name for a Photo
            const imageName = randomImageName()

            //resize image
            const fileBuffer = await sharp(req.file.buffer).resize({
                height : 500, 
                width : 500,
                fit: 'contain',
            }).toBuffer()
                            
            const params = {
                Bucket: bucketName,
                Key: `${folderName}/${imageName}`,
                Body: fileBuffer,
                ContentType: req.file.mimetype
            };

            const command = new PutObjectCommand(params);
            const response = await s3.send(command);
            console.log('S3 Response:', response);
            console.log('Photo ID', imageName )

            const updateResponse = await fetch(`http://localhost:3001/api/users/uploadUserImageID/${userID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    photoID: imageName
                })
            })
    
            if (updateResponse.ok) {
                res.status(200).json({
                    message: 'File Uploaded Successfully and Photo ID Updated in Database',
                    imageName : imageName
                });
            } else {
                throw new Error('Failed to update photo ID in database');
            }

        } catch (error) {
            console.error('Error uploading file to S3:', error);
            res.status(500).send('Error uploading file');
        }
        
    },

    displayImage : async (req, res) => {
        const folderName = 'userimage';
        try {
            const {userID} = req.params

            const responsePhoto = await fetch(`http://localhost:3001/api/users/retrieveUserImageID/${userID}`, {
                method: 'GET',
            });

            if (!responsePhoto.ok) {
                throw new Error(`Failed to fetch user photo for userID ${userID}`);
            }

            const responseData = await responsePhoto.json();

            const user_photo = responseData.userImage[0].user_image_id

            const getObjectParams = {
                Bucket: bucketName,
                Key: `${folderName}/${user_photo}`
            }
            const command = new GetObjectCommand(getObjectParams);

            const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

            responseData.userImage[0].photo_url = url;

                 // Send updated responseData back in response
                res.json(responseData);
        } catch (error) {
            console.error('Error fetching or processing photo:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    uploadPetImage : async (req, res) => {
        const folderName = 'petimage';
        try{    
            const {petID} = req.params

            if (!req.file) {
                console.error('No file uploaded');
                return res.status(400).send('No file uploaded');
            }
            console.log("req.body", req.body);
            console.log("req.file", req.file);
            /* Logging of req.file
                Display :             
                field name : image
                original name : "_____.png"
                buffer - most important to send into S3
            */

            //Generating a Unique Name for a Photo
            const imageName = randomImageName()

            //resize image
            const fileBuffer = await sharp(req.file.buffer).resize({
                height : 500, 
                width : 500,
                fit: 'fill',
            }).toBuffer()
                            
            const params = {
                Bucket: bucketName,
                Key: `${folderName}/${imageName}`,
                Body: fileBuffer,
                ContentType: req.file.mimetype
            };

            const command = new PutObjectCommand(params);
            const response = await s3.send(command);
            console.log('S3 Response:', response);
            console.log('Photo ID', imageName )

            const updateResponse = await fetch(`http://localhost:3001/api/pets/uploadPetImageID/${petID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    photoID: imageName
                })
            })
    
            if (updateResponse.ok) {
                res.status(200).json({
                    message: 'File Uploaded Successfully and Photo ID Updated in Database',
                    imageName : imageName
                });
            } else {
                throw new Error('Failed to update photo ID in database');
            }

        } catch (error) {
            console.error('Error uploading file to S3:', error);
            res.status(500).send('Error uploading file');
        }
        
    },

    displayPetImage : async (req, res) => {
        const folderName = 'petimage';
        try {
            const {petID} = req.params

            const responsePhoto = await fetch(`http://localhost:3001/api/pets/retrievePetImageID/${petID}`, {
                method: 'GET',
            });

            if (!responsePhoto.ok) {
                throw new Error(`Failed to fetch user photo for userID ${petID}`);
            }

            const responseData = await responsePhoto.json();

            const pet_photo = responseData.petImage[0].pet_image_id

            const getObjectParams = {
                Bucket: bucketName,
                Key: `${folderName}/${pet_photo}`
            }
            const command = new GetObjectCommand(getObjectParams);

            const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

            responseData.petImage[0].photo_url = url;

            // Send updated responseData back in response
            res.json(responseData);

        } catch (error) {
            console.error('Error fetching or processing photo:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    uploadTrainingImage : async (req, res) => {
        const folderName = 'trainimage';
        try{    
            const {trainID} = req.params

            if (!req.file) {
                console.error('No file uploaded');
                return res.status(400).send('No file uploaded');
            }
            console.log("req.body", req.body);
            console.log("req.file", req.file);
            /* Logging of req.file
                Display :             
                field name : image
                original name : "_____.png"
                buffer - most important to send into S3
            */

            //Generating a Unique Name for a Photo
            const imageName = randomImageName()

            //resize image
            const fileBuffer = await sharp(req.file.buffer).resize({
                height : 500, 
                width : 500,
                fit: 'fill',
            }).toBuffer()
                            
            const params = {
                Bucket: bucketName,
                Key: `${folderName}/${imageName}`,
                Body: fileBuffer,
                ContentType: req.file.mimetype
            };

            const command = new PutObjectCommand(params);
            const response = await s3.send(command);
            console.log('S3 Response:', response);
            console.log('Photo ID', imageName )

            const updateResponse = await fetch(`http://localhost:3001/api/trainPack/uploadTrainingImageID/${trainID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    photoID: imageName
                })
            })
    
            if (updateResponse.ok) {
                res.status(200).json({
                    message: 'File Uploaded Successfully and Photo ID Updated in Database',
                    imageName : imageName
                });
            } else {
                throw new Error('Failed to update photo ID in database');
            }

        } catch (error) {
            console.error('Error uploading file to S3:', error);
            res.status(500).send('Error uploading file');
        }
        
    },

    displayTrainingImage : async (req, res) => {
        const folderName = 'trainimage';
        try {
            const {trainID} = req.params

            const responsePhoto = await fetch(`http://localhost:3001/api/trainPack/retrieveTrainingImageID/${trainID}`, {
                method: 'GET',
            });

            if (!responsePhoto.ok) {
                throw new Error(`Failed to fetch user photo for userID ${petID}`);
            }

            const responseData = await responsePhoto.json();

            const train_photo = responseData.trainImage[0].train_image_id

            const getObjectParams = {
                Bucket: bucketName,
                Key: `${folderName}/${train_photo}`
            }
            const command = new GetObjectCommand(getObjectParams);

            const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

            responseData.trainImage[0].photo_url = url;

            // Send updated responseData back in response
            res.json(responseData);
            /* Below is the output
            {
                "message": "Photo for Training ID 1 has been retrieved successfully",
                "trainImage": [
                    {
                        "train_image_id": "d8d6b851e470d70d55f4cb4489eedd9f47d5ac873a39e01f04a50edc8e0ce4d1",
                        "photo_url": "https://pawfectmatch.s3.ap-southeast-1.amazonaws.com/trainimage/d8d6b851e470d70d55f4cb4489eedd9f47d5ac873a39e01f04a50edc8e0ce4d1?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAXYKJP7JRFNJAN4EQ%2F20240715%2Fap-southeast-1%2Fs3%2Faws4_request&X-Amz-Date=20240715T165420Z&X-Amz-Expires=3600&X-Amz-Signature=dfbad4b7500108a7c91dfc676e25f355758dfc1345e9198904891cb308b864f1&X-Amz-SignedHeaders=host&x-id=GetObject"
                    }
                ]
            }

            */

        } catch (error) {
            console.error('Error fetching or processing photo:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
 }

module.exports = s3Controller;