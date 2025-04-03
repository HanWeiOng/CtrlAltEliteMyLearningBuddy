const { fromBuffer } = require('pdf2pic');
const sharp = require('sharp');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
require('dotenv').config();

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.S3_BUCKET_NAME;
const bucketRegion = process.env.S3_REGION;

async function split_image(pdfBuffer, paperName, subject, banding, level) {
  const folderName = `${paperName}_${subject}_${banding}_${level}`.replace(/\s+/g, '_');
  const tempOutputDir = path.join(os.tmpdir(), crypto.randomUUID());
  await fs.mkdir(tempOutputDir, { recursive: true });

  // Convert PDF to PNG using pdf2pic
  const convert = fromBuffer(pdfBuffer, {
    density: 150,
    saveFilename: 'page',
    savePath: tempOutputDir,
    format: 'png',
    width: 1200,
    height: 1600,
  });

  const totalPages = await convert.bulk(-1); // convert all pages
  const imageUrls = [];

  // Check if folder exists in S3
  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: `${folderName}/`,
    MaxKeys: 1,
  });
  const listResponse = await s3.send(listCommand);

  if (!listResponse.Contents || listResponse.Contents.length === 0) {
    const createFolderUpload = new Upload({
      client: s3,
      params: {
        Bucket: bucketName,
        Key: `${folderName}/`,
        Body: "",
        ContentType: "application/x-directory",
      },
    });
    await createFolderUpload.done();
    console.log(`📁 Created folder in S3: ${folderName}/`);
  }

  const files = (await fs.readdir(tempOutputDir)).filter(f => f.endsWith('.png')).sort();

  for (const fileName of files) {
    const fullPath = path.join(tempOutputDir, fileName);
    const imageBuffer = await fs.readFile(fullPath);

    const resizedBuffer = await sharp(imageBuffer)
      .resize({ width: 500, height: 500, fit: 'contain' })
      .toBuffer();

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: bucketName,
        Key: `${folderName}/${fileName}`,
        Body: resizedBuffer,
        ContentType: 'image/png',
        ACL: 'public-read',
      },
    });

    await upload.done();

    const imageUrl = `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${folderName}/${fileName}`;
    imageUrls.push(imageUrl);
    console.log(`✅ Uploaded: ${imageUrl}`);
  }

  await fs.rm(tempOutputDir, { recursive: true, force: true });

  return imageUrls;
}

module.exports = { split_image };
