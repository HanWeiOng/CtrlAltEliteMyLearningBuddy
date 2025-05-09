require("dotenv").config();

const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize middleware
router.use(cors());
router.use(express.json());

// Initialize Gemini model
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const modelName = "gemini-2.0-flash";
const model = genAI.getGenerativeModel({ model: modelName });

// Database configuration
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
        return;
    } else {
        console.log('Connected to database');
    }
});

// Validation middleware
const validateQuizInput = (req, res, next) => {
    const { username, folder_name, subject, banding, level, question_ids } = req.body;

    if (!username || !folder_name || !subject || !banding || !level || !question_ids) {
        return res.status(400).json({
            message: 'Missing required fields',
            required: ['username', 'folder_name', 'subject', 'banding', 'level', 'question_ids']
        });
    }

    if (!Array.isArray(question_ids) || question_ids.length === 0) {
        return res.status(400).json({
            message: 'question_ids must be a non-empty array'
        });
    }

    // Validate that all question_ids are numbers
    if (!question_ids.every(id => typeof id === 'number')) {
        return res.status(400).json({
            message: 'All question_ids must be numbers'
        });
    }

    next();
};

// Route to get questions by subject, banding, and level
router.get('/getQuestionsByFilters', async (req, res) => {
    const { subject, banding, level } = req.query;
    
    if (!subject || !banding || !level) {
        return res.status(400).json({
            message: 'Subject, banding, and level are required'
        });
    }

    try {
        const result = await client.query(`
            SELECT * FROM questions
            WHERE subject = $1 AND banding = $2 AND level = $3
        `, [subject, banding, level]);
        console.log('Found questions:', result.rows.length);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});

// Route to get questions by folder ID
router.get('/getQuestionsByFolderId', async (req, res) => {
    const { folderId } = req.query;
    console.log('Received request for folder ID:', folderId);

    if (!folderId) {
        return res.status(400).json({
            message: 'Folder ID is required'
        });
    }

    try {
        // Parse folderId as integer
        const folderIdInt = parseInt(folderId, 10);
        if (isNaN(folderIdInt)) {
            return res.status(400).json({
                message: 'Invalid folder ID format'
            });
        }

        // First, get the folder to access its question_ids
        const folderResult = await client.query(`
            SELECT question_ids
            FROM questions_folder 
            WHERE id = $1
        `, [folderIdInt]);

        console.log('Folder query result:', folderResult.rows);

        if (folderResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Folder not found'
            });
        }

        // Extract the question IDs from the JSONB array
        const questionIds = folderResult.rows[0].question_ids;
        console.log('Question IDs from folder:', questionIds);
        
        // Then, get all questions with these IDs
        const questionsResult = await client.query(`
            SELECT id, question_text, answer_key, answer_options, image_paths
            FROM questions 
            WHERE id = ANY(
                SELECT DISTINCT jsonb_array_elements_text(question_ids)::integer 
                FROM questions_folder 
                WHERE id = $1
            )
        `, [folderIdInt]);

        console.log('Found questions:', questionsResult.rows.length);
        res.status(200).json(questionsResult.rows);
    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
});

// Route to save a new quiz folder
router.post('/saveQuiz', validateQuizInput, async (req, res) => {
    console.log('Received saveQuiz request:', req.body);

    const { 
        username,
        folder_name,
        subject,
        banding,
        level,
        question_ids
    } = req.body;

    try {
        // Check if folder name already exists for this user
        const existingFolder = await client.query(`
            SELECT id FROM questions_folder 
            WHERE username = $1 AND folder_name = $2
        `, [username, folder_name]);

        if (existingFolder.rows.length > 0) {
            return res.status(409).json({
                message: 'A quiz folder with this name already exists'
            });
        }

        // Insert the new quiz into the questions_folder table
        const result = await client.query(`
            INSERT INTO questions_folder 
            (username, folder_name, subject, banding, level, question_ids, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `, [
            username,
            folder_name,
            subject,
            banding,
            level,
            JSON.stringify(question_ids) // Convert array to JSONB
        ]);

        console.log('Quiz folder created:', result.rows[0]);
        res.status(201).json({
            message: 'Quiz folder created successfully',
            quiz: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating quiz folder:', error);
        res.status(500).json({ 
            message: 'Internal server error: ' + error.message 
        });
    }
});

// Route to get all folders for a user 
router.get('/getFolders', async (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({
            message: 'Username is required'
        });
    }

    try {
        const result = await client.query(`
            SELECT 
                id,
                folder_name,
                subject,
                banding,
                level,
                question_ids,
                created_at
            FROM questions_folder 
            WHERE username = $1
            ORDER BY created_at DESC
        `, [username]);

        // For each folder, get the count of questions
        const foldersWithQuestionCount = result.rows.map(folder => ({
            ...folder,
            questionCount: folder.question_ids ? folder.question_ids.length : 0
        }));

        res.status(200).json(foldersWithQuestionCount);
    } catch (error) {
        console.error('Error retrieving folders:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
});

// Test route to check folder
router.get('/testFolder/:id', async (req, res) => {
    const folderId = req.params.id;
    try {
        const result = await client.query(`
            SELECT * FROM questions_folder WHERE id = $1
        `, [folderId]);
        
        console.log('Folder query result:', result.rows);
        res.json({
            folderExists: result.rows.length > 0,
            folder: result.rows[0] || null
        });
    } catch (error) {
        console.error('Test query error:', error);
        res.status(500).json({ error: error.message });
    }
});


// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: err.message
    });
});

/*

// Helper function for wrong answer explanations
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
2. Then explain "✅ Correct Answer: ${correctAnswer.option}"
3. If the diagram is important, explain its relevance
4. Keep explanations concise and focused
5. Use bullet points for clarity
6. Do not use markdown formatting
7. Use a new line after every point


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


Remember:
1. Each bullet point must be on its own line
2. Add a blank line after each bullet point
3. Keep explanations clear and concise
4. Maintain the exact formatting with line breaks`;


    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

// Route to handle wrong answer explanations
router.post("/postWrongAnswer", async (req, res) => {
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
*/


module.exports = router;