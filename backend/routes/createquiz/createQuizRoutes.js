//reset to last working version
require("dotenv").config();

const express = require('express');
const router = express.Router();
const { Client } = require('pg');

const { GoogleGenerativeAI } = require("@google/generative-ai");
// Google Gemini Model Setup
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const modelName = "gemini-2.0-flash";
const model = genAI.getGenerativeModel({ model: modelName });

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

// Establish the database connection
client.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        // Handle the error appropriately here. You might want to:
        // 1.  Exit the application (if the connection is essential).
        // 2.  Retry the connection after a delay.
        // 3.  Inform the administrator.
        return; // Important: Stop further execution if connection fails
    } else {
        console.log('Connected to database');
    }
});

router.get('/getQuestions', async (req, res) => {
    const { subject, banding, level } = req.query;
    try {
        console.log(subject)
        console.log(banding)
        console.log(level)
        const result = await client.query(`
            SELECT * FROM questions
            WHERE subject = $1 AND banding = $2 AND level = $3
        `, [subject, banding, level]);
        // console.log(result.rows);

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

          let answerOptions = q.answer_options;
          const hasValidOptions =
            Array.isArray(answerOptions) &&
            answerOptions.length > 0 &&
            answerOptions.every(
              (opt) =>
                opt &&
                typeof opt.option === "string" &&
                opt.option.trim() !== "" &&
                (typeof opt.text === "string"
                  ? opt.text.trim() !== ""
                  : opt.text !== null && typeof opt.text === "object")
            );

          if (!hasValidOptions) invalidFields.push("answer_options");

          let imagePaths = q.image_paths;
          if (typeof imagePaths === "string") {
            try {
              const parsed = JSON.parse(imagePaths);
              imagePaths = parsed;
            } catch {
              if (imagePaths.startsWith("http")) {
                imagePaths = [{ image_url: imagePaths }];
              } else {
                invalidFields.push("image_paths (invalid JSON or malformed URL)");
              }
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


        // Or if using Express:
        res.json(validQuestions);


        // res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});

router.post('/saveFolder', async (req, res) => {
    try {
        const { folder_name, question_ids, subject, banding, level } = req.body;

        if (!folder_name || !question_ids || question_ids.length === 0) {
            return res.status(400).json({ error: "Folder name and question IDs are required." });
        }
 
        // Select a random username (modify as needed)
        const usernames = ["alice123", "bob456", "charlie789", "david001", "emma999, sharon001"];
        const username = usernames[Math.floor(Math.random() * usernames.length)];

        // Convert question IDs array to JSONB format for PostgreSQL
        const questionIdsJson = JSON.stringify(question_ids);

        // Insert into database
        const query = `
            INSERT INTO questions_folder (username, folder_name, subject, banding, level, question_ids)
            VALUES ($1, $2, $3, $4, $5, $6::JSONB)
        `;
        await client.query(query, [username, folder_name, subject, banding, level, questionIdsJson]);

        res.status(200).json({ message: "Folder saved successfully!", username });
    } catch (error) {
        console.error("Error saving folder:", error);
        res.status(500).json({ error: "Internal server error: " + error.message });
    }
});


/**
 * Explain why a user's answer to a question is wrong using Gemini
 * @param {string} question - The original question
 * @param {string} userAnswer - The user's (wrong) answer
 * @returns {Promise<string>} - Gemini's explanation
 */
  router.post('/postWrongAnswer', async (req, res) => {
    const { question, userAnswer, correctAnswer, options, imageUrl } = req.body;
  
    if (!question || !userAnswer || !correctAnswer || !options) {
      return res.status(400).json({ message: 'Missing fields in request body' });
    }
  
    try {
      const explanation = await explainWrongAnswer({
        question,
        userAnswer,
        correctAnswer,
        options,
        imageUrl,
        model,
      });
  
      return res.status(200).json({ explanation });
    } catch (error) {
      console.error('Gemini error:', error);
      return res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
  });
  

  
  async function explainWrongAnswer({ question, userAnswer, correctAnswer, options, imageUrl, model }) {
    let formattedOptions = options
      .map((opt) => {
        const text = typeof opt.text === 'string' ? opt.text : JSON.stringify(opt.text);
        return `${opt.option}: ${text}`;
      })
      .join('\n');
  

const prompt = `
You are a helpful tutor explaining why an answer is incorrect. Please provide a clear and concise explanation following this format:

  Here is the full context:
  - Question: ${question}
  - Image (if available): ${imageUrl ? imageUrl : "No diagram provided"}
  - Answer: ${userAnswer.option}: ${userAnswer.text}
  - Correct answer : ${correctAnswer.option}: ${correctAnswer.text}
  - Options: ${formattedOptions}

Please provide your explanation following these guidelines:
1. Start with "❌ ${userAnswer.option} is incorrect because:"
2. Then explain "✅ Correct Answer: ${correctAnswer.option}"\
3. If the diagram is important, explain its relevance
4. Keep explanations concise and focused
5. Use bullet points for clarity
6. Do not use markdown formatting

Format your response like this:
${imageUrl ? `
    • [Explain diagram's relevance]` : ''}

❌ ${userAnswer.option} is incorrect because:
• [First reason]
• [Second reason]

✅ Correct Answer: ${correctAnswer.option}
• [First reason]
• [Second reason]
• [More reasons if neccesary]
`;
  
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
  


  

module.exports = router;

