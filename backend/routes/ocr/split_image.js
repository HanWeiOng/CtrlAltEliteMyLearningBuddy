const { convert } = require('pdf-poppler');
const sharp = require('sharp');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs/promises');
const fsSync = require('fs'); // for existsSync + stat
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

  // TEMP FILES
  const tempPdfPath = path.join(os.tmpdir(), `${crypto.randomUUID()}.pdf`);
  const tempOutputDir = path.join(os.tmpdir(), crypto.randomUUID());
  await fs.mkdir(tempOutputDir, { recursive: true });

  // Write buffer to temp file
  await fs.writeFile(tempPdfPath, pdfBuffer);

  // On Windows, wait a bit to let file system settle
  if (process.platform === 'win32') {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Check file existence and size
  if (!fsSync.existsSync(tempPdfPath)) {
    throw new Error('Temporary PDF file not found.');
  }
  const stats = await fs.stat(tempPdfPath);
  if (stats.size === 0) {
    throw new Error('Temporary PDF file is empty.');
  }

  // Convert PDF to PNG using pdf-poppler
  const options = {
    format: 'png',
    out_dir: tempOutputDir,
    out_prefix: 'page',
    page: null, // all pages
  };

  await convert(tempPdfPath, options);
  await fs.unlink(tempPdfPath); // Clean PDF file immediately

  const files = (await fs.readdir(tempOutputDir)).filter(f => f.endsWith('.png')).sort();
  const imageUrls = [];

  // Create S3 folder if doesn't exist
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

  for (const fileName of files) {
    const fullPath = path.join(tempOutputDir, fileName);
    const imageBuffer = await fs.readFile(fullPath);

    // Resize
    const resizedBuffer = await sharp(imageBuffer)
      .resize({ width: 500, height: 500, fit: 'contain' })
      .toBuffer();

    // Upload
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

  // Cleanup
  await fs.rm(tempOutputDir, { recursive: true, force: true });

  return imageUrls;
}

module.exports = { split_image };