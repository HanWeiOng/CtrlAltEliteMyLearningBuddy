const axios = require("axios");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");

// Temporary writing of JSON to local directory
const fs = require("fs");
require("dotenv").config();

// Google Gemini Model Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = "gemini-2.0-flash";
const model = genAI.getGenerativeModel({ model: modelName });

// AWS S3 Setup (v3 SDK)
const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Constants
const safetySettings = [
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
];

const boundingBoxInstructions = `
Return a JSON array only. Do not include explanations, markdown, or text outside JSON.
Extract all diagrams, graphs, questions, and answer keys** (not just diagrams).
- Extract all questions, including plain text questions
- If answer options are split from their question, ensure they are associated correctly.
- Ensure table content, including borders and internal divisions, is fully captured.
- Maintain logical order when extracting text interrupted by diagrams or spanning multiple lines.
- Answer Options (A, B, C, D): Label as "box_label": "answer_options".
- Do not mark them as "question".
- Extract full answer options (not just the first word of each row/column).
- If answer options are in a table, extract them row-wise while preserving structure.
- Ensure answer options are extracted as separate bounding boxes.
- If answer options belong to a previous question (in case of broken text), associate the answer option and question sentence with the correct question.
- If the image contains a final answer key, use "box_label": "answer_key".
- Ensure all rows of the answer key are captured, not just the top row.
- If the answer key is structured in multiple columns, extract them **sequentially from left to right, top to bottom**.
Ensure every question has a corresponding question number.
Ensure response follows this structure:

[
  {"box_1": [x1, y1, x2, y2], "box_1_label": "diagram", "question_number": "1"},
  {"box_2": [x1, y1, x2, y2], "box_2_label": "graph", "question_number": "2"}
]
`;

const textExtractionInstructions = `
    Return a JSON array only. Do not include explanations, markdown, or text outside JSON.

    Use the provided bounding box information to **extract structured question text**, **map diagrams/graphs**, and
    detect if an image contains an **answer key** and extract the structured answer data.

    **Ensure all answer keys are captured, including those in multiple columns or rows.**
    - If the answer key is structured in **multiple columns**, extract them **sequentially from left to right, top to bottom**.
    - Maintain consistency in answer key extraction to **ensure every question number is mapped correctly**.

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
            "diagram_reference": "based on question number",
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

const OcrExecutionMinor = async (data) => {
  try {
    const { paper_name: paperName, images } = data;
    const imageFiles = images.map((url) => ({ url, filename: path.basename(url) }));
    const allExtractedData = [];

    for (const image of imageFiles) {
      const response = await axios.get(image.url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data, "binary");
      const data = await processImageFromBuffer(buffer, image.filename, model, paperName);
      allExtractedData.push(...data);
    }

    const consolidated = consolidateQuestions(allExtractedData);
    console.log("✅ Final structured output:", JSON.stringify(consolidated, null, 2));

    const outputPath = path.join(__dirname, "output", `${paperName}_structured_output.json`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(consolidated, null, 2), "utf-8");
    console.log(`✅ Structured output saved to: ${outputPath}`);
  } catch (err) {
    console.error("❌ Error in OcrExecutionMinor:", err);
    throw err;
  }
};

const processImageFromBuffer = async (buffer, filename, model, paperName) => {
  const base64 = buffer.toString("base64");
  const image = await loadImage(buffer);

  const boundingBoxResponse = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: "Identify and extract bounding boxes." }] },
      { role: "user", parts: [{ text: boundingBoxInstructions }] },
      { role: "user", parts: [{ inlineData: { mimeType: "image/png", data: base64 } }] },
    ],
    generationConfig: { temperature: 0.5 },
    safetySettings,
  });

  const rawBoxes = extractTextFromResponse(boundingBoxResponse);
  const cleanedBoxes = safeJsonParse(rawBoxes);
  const boundingBoxes = extractBoundingBoxes(cleanedBoxes);

  const { extractedData } = await extractBoundingBoxDataFromImage(image, boundingBoxes, filename, paperName);

  const textResponse = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: `Use the bounding box data: ${JSON.stringify(boundingBoxes)}` }] },
      { role: "user", parts: [{ text: textExtractionInstructions }] },
      { role: "user", parts: [{ inlineData: { mimeType: "image/png", data: base64 } }] },
    ],
    generationConfig: { temperature: 0.5 },
    safetySettings,
  });

  const rawText = extractTextFromResponse(textResponse);
  const extractedQuestions = safeJsonParse(rawText);
  const croppedMap = mapCroppedImages(extractedData);

  extractedQuestions.forEach((q) => {
    const qNum = String(q.question_number || "");
    q.image_filename = filename;
    q.image_path = croppedMap[qNum] || [];
    q.original_image_base64 = base64;
  });

  return extractedQuestions;
};

const extractBoundingBoxDataFromImage = async (img, boundingBoxes, filename, paperName) => {
  const width = img.width;
  const height = img.height;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  const extractedData = [];

  for (const box of boundingBoxes) {
    if (!["diagram", "graph"].includes(box.label)) continue;

    const [y1, x1, y2, x2] = box.bounding_box;
    const absX1 = Math.max(0, Math.round((x1 / 1000) * width));
    const absY1 = Math.max(0, Math.round((y1 / 1000) * height));
    const absX2 = Math.min(width, Math.round((x2 / 1000) * width));
    const absY2 = Math.min(height, Math.round((y2 / 1000) * height));

    const croppedCanvas = createCanvas(absX2 - absX1, absY2 - absY1);
    const croppedCtx = croppedCanvas.getContext("2d");
    croppedCtx.drawImage(img, absX1, absY1, absX2 - absX1, absY2 - absY1, 0, 0, absX2 - absX1, absY2 - absY1);

    const croppedBuffer = croppedCanvas.toBuffer("image/png");
    const s3Key = `${paperName}/${filename.replace(".png", "")}_${box.label}_${box.question_number}.png`;

    const uploadParams = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: croppedBuffer,
      ContentType: "image/png",
      ACL: "public-read",
    });

    await s3.send(uploadParams);
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

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

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("❌ JSON parse failed:", err);
    throw new Error("Invalid JSON received from API.");
  }
};

const extractBoundingBoxes = (json) => {
  const boxes = [];
  json.forEach((box) => {
    const key = Object.keys(box).find((k) => k.startsWith("box_"));
    const coords = box[key] || [];
    const labelKey = Object.keys(box).find((k) => k.endsWith("_label"));
    const label = box[labelKey] || "Unknown";
    if (["question", "answer_key", "answer_options", "box_label"].includes(label)) return;
    boxes.push({ label, bounding_box: coords, question_number: box.question_number || null });
  });
  return boxes;
};

const consolidateQuestions = (questions) => {
  const map = new Map();
  questions.forEach((q) => {
    const key = q.question_number;
    if (!map.has(key)) {
      map.set(key, q);
    } else if (q.answer_key) {
      map.get(key).answer_key = q.answer_key;
    }
  });
  return Array.from(map.values()).sort((a, b) => a.question_number - b.question_number);
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