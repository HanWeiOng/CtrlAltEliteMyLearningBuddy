// 🔧 ocrRoutes.js 
const express = require('express');
const multer = require('multer');
const router = express.Router();
const axios = require('axios');
const upload = multer({ storage: multer.memoryStorage() });
const fs = require('fs');
const { Pool } = require("pg");
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const { split_image } = require('./split_image');
const { OcrExecutionMinor } = require('./ocrExecutor');
const { topicLabelling } = require('./topicLabelling');
const insertJSONPayload = require('./insertPostgresql');

const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
});


let clients = [];
router.get('/progress-stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

function sendProgressUpdate(step, message) {
  const data = JSON.stringify({ step, message });
  clients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}


router.post('/split_pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.body.subject || !req.body.level) {
      return res.status(400).json({ message: "Missing required fields (file, subject, or level)." });
    }

    // ✅ 1. Validate MIME type and extension
    if (!req.file.mimetype.includes("pdf") || !req.file.originalname.endsWith(".pdf")) {
      return res.status(400).json({ message: "Invalid file type. Only PDFs allowed." });
    }

    // ✅ 2. Limit file size (max 10MB)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "PDF too large. Max 10MB allowed." });
    }

    // ✅ 3. Scan PDF with ClamAV
    // const tempPath = path.join(os.tmpdir(), `${Date.now()}_upload.pdf`);
    // fs.writeFileSync(tempPath, req.file.buffer);

    // const clamScanOutput = await new Promise((resolve, reject) => {
    //   exec(`clamscan ${tempPath}`, (err, stdout, stderr) => {
    //     if (err) return reject(stderr);
    //     resolve(stdout);
    //   });
    // });

    // if (clamScanOutput.includes("FOUND")) {
    //   fs.unlinkSync(tempPath);
    //   return res.status(400).json({ message: "Malicious PDF detected. Upload rejected." });
    // }

    const paperName = req.file.originalname.replace('.pdf', '');
    const { subject, banding = '', level } = req.body;
    const folderName = `${paperName}_${subject}_${banding}_${level}`.replace(/\s+/g, '_');

    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: `${folderName}/`,
      MaxKeys: 1,
    });

    // checks if pdf have been processed before
    const listResponse = await s3.send(listCommand);
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      return res.status(409).json({ message: "Paper already exists in our database." });
    }

    sendProgressUpdate(1, 'File submitted');
    const imageUrls = await split_image(req.file.buffer, paperName, subject, banding, level);
    sendProgressUpdate(2, 'PDF split into images, proceeding with OCR');    
    const resultPayload = { paper_name: paperName, subject, banding, level, images: imageUrls };


    const ocrData = await OcrExecutionMinor(resultPayload);
    sendProgressUpdate(3, 'OCR completed');

    const labelledData = await topicLabelling(ocrData);
    sendProgressUpdate(4, 'Topics labelled');

    await insertJSONPayload(labelledData);
    sendProgressUpdate(5, 'Inserted into PostgreSQL');

    if (typeof tempPath !== "undefined" && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }    

    res.status(200).json({
      message: 'OCR processing, topic labelling, and DB insertion completed successfully.',
      paper_name: labelledData.paper_name,
      questions_count: labelledData.questions.length
    });
  } catch (error) {
    console.error('❌ Error in /split_pdf:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
});

router.post('/run_ocr', async (req, res) => {
  try {
    const ocrData = await OcrExecutionMinor(req.body);
    res.status(200).json(ocrData);
  } catch (error) {
    console.error('❌ Error in /run_ocr:', error?.response?.data || error.message);
    res.status(500).json({ message: 'OCR execution failed: ' + error.message });
  }
});

router.post('/topicLabelling', async (req, res) => {
  try {
    const labelled = await topicLabelling(req.body);
    res.status(200).json(labelled);
  } catch (error) {
    console.error('❌ Error in /topicLabelling:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Topic labelling failed: ' + error.message });
  }
});

router.post('/insertIntoPostgresql', async (req, res) => {
  try {
    await insertJSONPayload(req.body);
    res.status(200).json({ message: 'Data successfully inserted into PostgreSQL.' });
  } catch (error) {
    console.error('❌ Error in /insertIntoPostgresql:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Insertion failed: ' + error.message });
  }
});

const insertJSONData = async (jsonData, subject, banding, level) => {
  const client = await pool.connect(); // Acquire a client from the pool
  try {
    const parsedJSON = JSON.parse(jsonData);

    await client.query("BEGIN"); // Start a transaction

    for (const [topicName, topicData] of Object.entries(parsedJSON)) {
      if (!topicData.learning_outcomes) continue;

      for (const outcome of topicData.learning_outcomes) {
        const subTopic = outcome.sub_topic || "Unknown";
        const description = outcome.description || "No description available";

        await client.query(
          `INSERT INTO topic_labelling (subject, topic_name, sub_topic, description, banding, level) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT DO NOTHING;`,
          [subject, topicName, subTopic, description, banding, level]
        );
      }
    }

    await client.query("COMMIT"); // Commit the transaction
    console.log(`✅ JSON data inserted for subject: ${subject}`);
  } catch (err) {
    await client.query("ROLLBACK"); // Rollback the transaction on error
    console.error("❌ Error inserting JSON data:", err);
    throw err; // Re-throw the error to be handled by Express.js
  } finally {
    client.release(); // Release the client back to the pool
  }
};


// Define the POST route
router.post('/uploadSyllabus', async (req, res) => {
  try {
      const { jsonData, subject, banding, level } = req.body;
      if (!jsonData || !subject || !banding || !level) {
          return res.status(400).json({ error: 'Missing required fields' });
      }
      await insertJSONData(jsonData, subject, banding, level);
      res.status(200).json({ message: 'Syllabus uploaded successfully!' });
  } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ error: 'Failed to upload syllabus' });
  }
});

module.exports = router;
