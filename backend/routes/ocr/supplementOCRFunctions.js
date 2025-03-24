// const { PDFDocument } = require('pdf-lib');
// const { fromBuffer } = require('pdf2pic');
// const sharp = require('sharp');
// const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
// const { Upload } = require('@aws-sdk/lib-storage');
// require('dotenv').config();

// // S3 Client Setup
// const s3 = new S3Client({
//     region: process.env.S3_REGION,
//     credentials: {
//         accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
//     }
// });

// const bucketName = process.env.S3_BUCKET_NAME;
// const bucketRegion = process.env.S3_REGION;

// async function split_image(buffer, req, paperName, subject, banding, level) {
//     const pdfDoc = await PDFDocument.load(req.file.buffer);
//     const totalPages = pdfDoc.getPageCount();
//     const imageUrls = [];

//     // Sanitize folder name
//     const folderName = `${paperName}_${subject}_${banding}_${level}`.replace(/\s+/g, '_');

//     // Check/create folder in S3
//     const listParams = {
//         Bucket: bucketName,
//         Prefix: `${folderName}/`,
//         MaxKeys: 1
//     };
//     const listCommand = new ListObjectsV2Command(listParams);
//     const listResponse = await s3.send(listCommand);

//     if (!listResponse.Contents || listResponse.Contents.length === 0) {
//         const createFolderUpload = new Upload({
//             client: s3,
//             params: {
//                 Bucket: bucketName,
//                 Key: `${folderName}/`,
//                 Body: "",
//                 ContentType: "application/x-directory"
//             }
//         });
//         await createFolderUpload.done();
//         console.log(`📁 Created folder in S3: ${folderName}/`);
//     }

//     // Init converter
//     const convert = fromBuffer(buffer, {
//         density: 150,
//         format: "png",
//         width: 1240,
//         height: 1754
//     });

//     for (let i = 1; i <= totalPages; i++) {
//         console.log(`🔄 Processing page ${i} of ${totalPages}`);

//         const pageImage = await convert(i);

//         if (!pageImage?.buffer || !Buffer.isBuffer(pageImage.buffer)) {
//             throw new Error(`Page ${i} did not return a valid image buffer`);
//         }

//         const resizedBuffer = await sharp(pageImage.buffer)
//             .resize({ height: 500, width: 500, fit: "contain" })
//             .toBuffer();

//         const imageName = `page_${i}.png`;
//         const imageKey = `${folderName}/${imageName}`;

//         const upload = new Upload({
//             client: s3,
//             params: {
//                 Bucket: bucketName,
//                 Key: imageKey,
//                 Body: resizedBuffer,
//                 ContentType: 'image/png',
//                 ACL: 'public-read'
//             }
//         });

//         try {
//             await upload.done();
//             const imageUrl = `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${imageKey}`;
//             imageUrls.push(imageUrl);
//             console.log(`✅ Uploaded: ${imageUrl}`);
//         } catch (uploadErr) {
//             console.error(`❌ Upload failed for page ${i}:`, uploadErr);
//             throw uploadErr;
//         }

//         // Optional throttle (if too many pages cause pressure)
//         await new Promise(resolve => setTimeout(resolve, 50));
//     }

//     return imageUrls;
// }

// module.exports = { split_image };

const { PDFDocument } = require('pdf-lib');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
require('dotenv').config();

const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const bucketName = process.env.S3_BUCKET_NAME;
const bucketRegion = process.env.S3_REGION;

async function split_image(buffer, paperName, subject, banding, level) {
    const imageUrls = [];

    const folderName = `${paperName}_${subject}_${banding}_${level}`.replace(/\s+/g, '_');

    // Check/create folder in S3
    const listParams = {
        Bucket: bucketName,
        Prefix: `${folderName}/`,
        MaxKeys: 1
    };
    const listCommand = new ListObjectsV2Command(listParams);
    const listResponse = await s3.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
        const createFolderUpload = new Upload({
            client: s3,
            params: {
                Bucket: bucketName,
                Key: `${folderName}/`,
                Body: "",
                ContentType: "application/x-directory"
            }
        });
        await createFolderUpload.done();
        console.log(`📁 Created folder in S3: ${folderName}/`);
    }

    const pdfDoc = await PDFDocument.load(buffer);
    const totalPages = pdfDoc.getPageCount();

    const browser = await puppeteer.launch({
        headless: 'new', // if you're on Puppeteer >=20
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    for (let i = 0; i < totalPages; i++) {
        const subDoc = await PDFDocument.create();
        const [copiedPage] = await subDoc.copyPages(pdfDoc, [i]);
        subDoc.addPage(copiedPage);
        const pageBytes = await subDoc.save();
        const base64PDF = Buffer.from(pageBytes).toString('base64');

        await page.setContent(`
            <html>
            <body style="margin: 0; padding: 0;">
                <embed src="data:application/pdf;base64,${base64PDF}" type="application/pdf" width="100%" height="100%"/>
            </body>
            </html>
        `, { waitUntil: 'networkidle0' });

        const imageBuffer = await page.screenshot({ type: 'png', fullPage: true });

        const resizedBuffer = await sharp(imageBuffer)
            .resize({ height: 500, width: 500, fit: 'contain' })
            .toBuffer();

        const imageName = `page_${i + 1}.png`;
        const upload = new Upload({
            client: s3,
            params: {
                Bucket: bucketName,
                Key: `${folderName}/${imageName}`,
                Body: resizedBuffer,
                ContentType: 'image/png',
                ACL: 'public-read'
            }
        });

        await upload.done();

        const imageUrl = `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${folderName}/${imageName}`;
        imageUrls.push(imageUrl);
        console.log(`✅ Uploaded: ${imageUrl}`);
    }

    await browser.close();

    return imageUrls;
}

module.exports = { split_image };
