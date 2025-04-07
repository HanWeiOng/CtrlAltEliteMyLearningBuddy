// 🔧 ocrExecutor.js
const fsPromises = require("fs/promises");
const axios = require("axios");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const safetySettings = [
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
];

// const boundingBoxInstructions = `
// Return a JSON array only. Do not include explanations, markdown, or text outside JSON.
// Extract all diagrams, graphs, questions, and answer keys** (not just diagrams).
// - Extract all questions, including plain text questions
// - If answer options are split from their question, ensure they are associated correctly.
// - Ensure table content, including borders and internal divisions, is fully captured.
// - Maintain logical order when extracting text interrupted by diagrams or spanning multiple lines.
// - Answer Options (A, B, C, D): Label as "box_label": "answer_options".
// - Do not mark them as "question".
// - Extract full answer options (not just the first word of each row/column).
// - If answer options are in a table, extract them row-wise while preserving structure.
// - Ensure answer options are extracted as separate bounding boxes.
// - If answer options belong to a previous question (in case of broken text), associate the answer option and question sentence with the correct question.
// - If the image contains a final answer key, use "box_label": "answer_key".
// - Ensure all rows of the answer key are captured, not just the top row.
// - If the answer key is structured in multiple columns, extract them **sequentially from left to right, top to bottom**.
// Ensure every question has a corresponding question number.
// Ensure response follows this structure:

// [
//   {"box_1": [x1, y1, x2, y2], "box_1_label": "diagram", "question_number": "1"},
//   {"box_2": [x1, y1, x2, y2], "box_2_label": "graph", "question_number": "2"}
// ]
// `;

const boundingBoxInstructions = `
Return a JSON array 
Example:

[
  {"box_1": [x1, y1, x2, y2], "box_1_label": "question", "question_number": "xx"},
  {"box_2": [x1, y1, x2, y2], "box_2_label": "answer_key", "question_number": "xx"}
]

- each bounding box encapsulates a SINGULAR question strictly
- use the question number as the upper bounding and the next question as the lower bounding
- so what ever is below the question number belongs to that question, and once you detect another question number below then cut it off
- If the image contains a final answer key (e.g., a table of answers at the bottom of the page), mark it separately with "box_label": "answer_key".
- Do not mark them as "question".

`;

// const textExtractionInstructions = `
//     Return a JSON array only. Do not include explanations, markdown, or text outside JSON.

//     Use the provided bounding box information to **extract structured question text**, **map diagrams/graphs**, and
//     detect if an image contains an **answer key** and extract the structured answer data.

//     **Ensure all answer keys are captured, including those in multiple columns or rows.**
//     - If the answer key is structured in **multiple columns**, extract them **sequentially from left to right, top to bottom**.
//     - Maintain consistency in answer key extraction to **ensure every question number is mapped correctly**.

//     Format:

//     [
//         {
//             "page_number": <int>,
//             "question_number": <int>,
//             "question_text": "<string>",
//             "answer_options": [
//                 { "option": "A", "text": "<string>" },
//                 { "option": "B", "text": "<string>" },
//                 { "option": "C", "text": "<string>" },
//                 { "option": "D", "text": "<string>" }
//             ],
//             "diagram_reference": "based on question number",
//             "bounding_box": {
//                 "top_left_x": <int>,
//                 "top_left_y": <int>,
//                 "width": <int>,
//                 "height": <int>
//             },
//             "image_path": "<string>",

//             "answer_key": { "question_number": <int>, "correct_answer": "<string>" }
//         }
//     ]
// `;
const textExtractionInstructions = `
    Return a JSON array only. Do not include explanations, markdown, or text outside JSON.
    Analyse the image and extract the relevant information as seen in the format below

    - If you are scanning through an answer sheet page, it is usually demarcated by a table of question numbers and answer letters (A, B, C, D)
    - The way you read the answer sheet is that question number is directly above its answer option
    - Maintain consistency in answer key extraction to **ensure every question number is mapped correctly**

    Format:

    [
        {
            "page_number": <int>,
            "question_number": <int>,
            "question_text": "<string>",
            "answer_options": [
                { "option": "A", "text": "<string>" },
                { "option": "B", "text": "<string>" },
                { "option": "C", "text": "<string>" },
                { "option": "D", "text": "<string>" }
            ],
            "bounding_box": {
                "top_left_x": <int>,
                "top_left_y": <int>,
                "width": <int>,
                "height": <int>
            },
            "image_path": "<string>",

            "answer_key": { "question_number": <int>, "correct_answer": "<string>" }
        }
    ]
`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const OcrExecutionMinor = async (data) => {
  try {
    const { subject, banding, level, paper_name: paperName, images } = data;
    const imageFiles = images.map((url) => ({ url, filename: path.basename(url) }));
    const allExtractedData = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const imageMeta = imageFiles[i];
      try {
        const response = await axios.get(imageMeta.url, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response.data, "binary");
        const base64 = buffer.toString("base64");
        const image = await loadImage(buffer);

        const { extractedData, boundingBoxes } = await extractBoundingBoxesAndCrop(image, base64, imageMeta.filename, paperName);
        console.log(boundingBoxes)
        const extractedQuestions = await extractTextFromImage(base64);
        const croppedMap = mapCroppedImages(extractedData);

        extractedQuestions.forEach((q) => {
          const qNum = String(q.question_number || "");
          q.image_filename = imageMeta.filename;
          q.image_path = croppedMap[qNum] || [];
        });

        allExtractedData.push(...extractedQuestions);
        console.log(`✅ Processed ${imageMeta.filename} (${i + 1}/${imageFiles.length})`);
      } catch (err) {
        console.warn(`⚠️ Skipped ${imageMeta.filename} due to error:`, err.message);
      }

      if ((i + 1) % 5 === 0 && i < imageFiles.length - 1) {
        console.log("⏳ Pausing 3 seconds to avoid Gemini overload...");
        await sleep(3000);
      }
    }

    allExtractedData.forEach((entry) => {
      if (entry.answer_key && !entry.question_number) {
        entry.question_number = entry.answer_key.question_number;
      }
    });

    const questions = consolidateQuestions(allExtractedData);
    console.log(questions)
    return {
      paper_name: paperName,
      subject,
      banding,
      level,
      questions,
    };
  } catch (err) {
    console.error("❌ Error in OcrExecutionMinor:", err);
    throw err;
  }
};

const extractBoundingBoxesAndCrop = async (image, base64, filename, paperName) => {
  const boundingBoxResponse = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: boundingBoxInstructions }] },
      { role: "user", parts: [{ inlineData: { mimeType: "image/png", data: base64 } }] },
    ],
    generationConfig: { temperature: 0.5 },
    safetySettings,
  });

  const rawBoxes = extractTextFromResponse(boundingBoxResponse);
  const cleanedBoxes = safeJsonParse(rawBoxes);

  if (!cleanedBoxes || !Array.isArray(cleanedBoxes) || cleanedBoxes.length === 0) {
    console.warn(`⚠️ No bounding boxes found in ${filename}. Skipping.`);
    return { extractedData: [], boundingBoxes: [] };
  }

  const boundingBoxes = extractBoundingBoxes(cleanedBoxes);
  const { extractedData } = await extractBoundingBoxDataFromImage(image, boundingBoxes, filename, paperName);

  return { extractedData, boundingBoxes };
};

const extractTextFromImage = async (base64) => {
  const textResponse = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: textExtractionInstructions }] },
      { role: "user", parts: [{ inlineData: { mimeType: "image/png", data: base64 } }] },
    ],
    generationConfig: { temperature: 0.5 },
    safetySettings,
  });

  const rawText = extractTextFromResponse(textResponse);
  return safeJsonParse(rawText);
};

const extractBoundingBoxDataFromImage = async (img, boundingBoxes, filename, paperName) => {
  const width = img.width;
  const height = img.height;
  // const canvas = createCanvas(width, height);
  // const ctx = canvas.getContext("2d");
  // ctx.drawImage(img, 0, 0, width, height);


  const extractedData = [];

  for (const box of boundingBoxes) {
    if (!["question"].includes(box.label)) continue;

    // const [x1, y1, x2, y2] = box.bounding_box;
    // const absY1 = Math.max(0, Math.round((y1 / 1000) * height));
    // const absY2 = Math.min(height, Math.round((y2 / 1000) * height));

    // const padding = 20;
    // let absX1 = Math.max(0, Math.round((x1 / 1000) * width) - padding);
    // let absX2 = Math.min(width, Math.round((x2 / 1000) * width) + padding);

    // if (box.label === "question") {
    //   absX1 = 0;
    //   absX2 = width;
    // }

    // const croppedCanvas = createCanvas(absX2 - absX1, absY2 - absY1);
    const absX1 = 0;
    const absY1 = 0;
    const absX2 = width;
    const absY2 = height;

    const croppedCanvas = createCanvas(absX2 - absX1, absY2 - absY1);

    const croppedBuffer = croppedCanvas.toBuffer("image/png");
    const s3Key = `${paperName}/${filename.replace(".png", "")}_${box.label}_${box.question_number}.png`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: croppedBuffer,
      ContentType: "image/png",
      ACL: "public-read",
    }));

    const encodedPaperName = encodeURIComponent(paperName).replace(/%20/g, '+'); // S3 URL-safe

    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${encodedPaperName}/${filename.replace(".png", "")}_${box.label}_${box.question_number}.png`;

    extractedData.push({
      label: box.label,
      bounding_box: box.bounding_box,
      question_number: box.question_number,
      s3_url: s3Url,
    });
  }

  return { extractedData };
};

const extractTextFromResponse = (response) => {
  return response?.response?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text
    ?.replace(/```json/g, "")
    ?.replace(/```/g, "")
    ?.trim() || null;
};

const tryFixBrokenJsonArray = (text) => {
  if (!text || !text.trim().startsWith("[")) return null;
  let fixed = text.trim();
  if (!fixed.endsWith("]")) fixed += "]";
  fixed = fixed.replace(/,(\s*[\]}])/g, "$1");
  try {
    return JSON.parse(fixed);
  } catch (e) {
    return null;
  }
};

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    const fixed = tryFixBrokenJsonArray(text);
    if (fixed) {
      console.warn("⚠️ JSON was malformed but successfully recovered.");
      return fixed;
    }
    console.error("❌ JSON parse failed:", err.message);
    throw new Error("Invalid JSON received from API.");
  }
};

const extractBoundingBoxes = (json) => {
  return json.map((box) => {
    const key = Object.keys(box).find(k => Array.isArray(box[k]));
    const coords = box[key];
    const labelKey = Object.keys(box).find((k) => k.endsWith("_label"));
    return {
      label: box[labelKey] || "Unknown",
      bounding_box: coords,
      question_number: box.question_number || null,
    };
  }).filter(b => b.label !== "answer_key" && b.bounding_box);
};

const consolidateQuestions = (questions) => {
  const map = new Map();
  for (const q of questions) {
    const key = q.question_number;
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, q);
    } else {
      const existing = map.get(key);
      if (q.answer_key && !existing.answer_key) {
        existing.answer_key = q.answer_key;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => parseInt(a.question_number) - parseInt(b.question_number));
};

const mapCroppedImages = (data) => {
  const map = {};
  data.forEach((item) => {
    const qNum = String(item.question_number || "");
    if (!map[qNum]) map[qNum] = [];
    map[qNum].push({
      label: item.label,
      bounding_box: item.bounding_box,
      image_url: item.s3_url,
    });
  });
  return map;
};

module.exports = { OcrExecutionMinor };