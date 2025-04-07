// 🔧 ocrRoutes.js 
const express = require('express');
const multer = require('multer');
const router = express.Router();
const axios = require('axios');
const upload = multer({ storage: multer.memoryStorage() });
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const { split_image } = require('./split_image');
const { OcrExecutionMinor } = require('./ocrExecutor');
const { topicLabelling } = require('./topicLabelling');
const insertJSONPayload = require('./insertPostgresql');
const { Client } = require('pg');

const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
});

client.connect();

const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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
      paper_name: `${paperName}_${subject}_${banding}_${level}`,
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

// router.get("/retrieve_all_uploaded_questions", async (req, res) => {
//   try {
//     let paperName = req.query.paper_name;
//     paperName = paperName.replace(/\s+/g, "_");

//     const result = await client.query(
//       "SELECT * FROM questions WHERE paper_name = $1",
//       [paperName]
//     );

//     const validQuestions = result.rows.filter((q) => {
//       // Top-level checks
//       const hasQuestionText = q.question_text?.trim() !== "";
//       const hasQuestionNumber = q.question_number?.toString().trim() !== "";
//       const hasAnswerKey = q.answer_key?.trim() !== "";
//       const hasTopicLabel = q.topic_label?.trim() !== "";
//       const hasSubject = q.subject?.trim() !== "";
//       const hasBanding = q.banding?.trim() !== "";
//       const hasLevel = q.level?.trim() !== "";

//       // Answer Options (parse if stringified)
//       let answerOptions = q.answer_options;
//       if (typeof answerOptions === "string") {
//         try {
//           answerOptions = JSON.parse(answerOptions);
//         } catch {
//           return false;
//         }
//       }

//       const hasValidOptions =
//         Array.isArray(answerOptions) &&
//         answerOptions.length > 0 &&
//         answerOptions.every(
//           (opt) =>
//             opt &&
//             typeof opt.option === "string" &&
//             opt.option.trim() !== "" &&
//             (typeof opt.text === "string"
//               ? opt.text.trim() !== ""
//               : opt.text !== null && typeof opt.text === "object")
//         );

//       // Image Paths (parse if stringified)
//       let imagePaths = q.image_paths;
//       if (typeof imagePaths === "string") {
//         try {
//           imagePaths = JSON.parse(imagePaths);
//         } catch {
//           return false;
//         }
//       }

//       const hasValidImages =
//         Array.isArray(imagePaths) &&
//         imagePaths.every(
//           (img) =>
//             img &&
//             typeof img.image_url === "string" &&
//             img.image_url.startsWith("http")
//         );

//       // You can also allow imagePaths to be optional:
//       // const imageOk = imagePaths.length === 0 || hasValidImages;
//       const imageOk = hasValidImages; // force image to be present and valid

//       return (
//         hasQuestionText &&
//         hasQuestionNumber &&
//         hasAnswerKey &&
//         hasTopicLabel &&
//         hasSubject &&
//         hasBanding &&
//         hasLevel &&
//         hasValidOptions &&
//         imageOk
//       );
//     });

//     console.log("✅ Valid Questions:", validQuestions);
//     console.log(`📤 Retrieved ${validQuestions.length} valid questions out of ${result.rows.length}`);
//     res.status(200).json(validQuestions);
//   } catch (error) {
//     console.error("❌ Error retrieving uploaded questions:", error);
//     res.status(500).json({ message: "Questions not in database: " + error.message });
//   }
// });

router.get("/retrieve_all_uploaded_questions", async (req, res) => {
  try {
    let paperName = req.query.paper_name;
    paperName = paperName.replace(/\s+/g, "_");

    const result = await client.query(
      "SELECT * FROM questions WHERE paper_name = $1",
      [paperName]
    );

    const validQuestions = [];
    const invalidQuestions = [];

    for (const q of result.rows) {
      const invalidFields = [];

      if (!q.question_text?.trim()) invalidFields.push("question_text");
      if (!q.question_number?.toString().trim()) invalidFields.push("question_number");
      if (!q.answer_key?.trim()) invalidFields.push("answer_key");
      if (!q.topic_label?.trim()) invalidFields.push("topic_label");
      if (!q.subject?.trim()) invalidFields.push("subject");
      if (!q.banding?.trim()) invalidFields.push("banding");
      if (!q.level?.trim()) invalidFields.push("level");

      // Answer options
      let answerOptions = JSON.parse(q.answer_options);
      // if (typeof answerOptions === "string") {
      //   try {
      //     answerOptions = JSON.parse(answerOptions);
      //   } catch {
      //     invalidFields.push("answer_options (invalid JSON)");
      //   }
      // }

      const hasValidOptions =
        Array.isArray(answerOptions) &&
        answerOptions.length > 0 &&
        answerOptions.every((opt) =>
          opt &&
          typeof opt.option === "string" &&
          opt.option.trim() !== "" &&
          (typeof opt.text === "string"
            ? opt.text.trim() !== ""
            : opt.text !== null && typeof opt.text === "object")
        );

      if (!hasValidOptions) invalidFields.push("answer_options");

      // Image paths
      let imagePaths = q.image_paths;
      if (typeof imagePaths === "string") {
        try {
          imagePaths = JSON.parse(imagePaths);
        } catch {
          invalidFields.push("image_paths (invalid JSON)");
        }
      }

      const hasValidImages =
        Array.isArray(imagePaths) &&
        imagePaths.every(
          (img) =>
            img &&
            typeof img.image_url === "string" &&
            img.image_url.startsWith("http")
        );

      if (!hasValidImages) invalidFields.push("image_paths");

      // Categorize the question
      if (invalidFields.length === 0) {
        validQuestions.push(q);
      } else {
        invalidQuestions.push({
          question_number: q.question_number,
          invalid_fields: invalidFields,
        });
      }
    }

    console.log("✅ Valid Questions:", validQuestions.length);
    console.log("❌ Invalid Questions:", invalidQuestions);

    res.status(200).json({
      valid_questions: validQuestions,
      invalid_questions: invalidQuestions,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("❌ Error retrieving uploaded questions:", error);
    res.status(500).json({ message: "Error retrieving questions: " + error.message });
  }
});

module.exports = router;
