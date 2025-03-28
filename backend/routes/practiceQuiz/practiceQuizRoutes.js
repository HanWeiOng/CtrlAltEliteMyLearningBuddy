require("dotenv").config();

const express = require('express');
const router = express.Router();
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

// Establish the database connection
client.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    } else {
        console.log('Connected to database');
    }
});

router.get('/getQuestions', async (req, res) => {
    const { subject, banding, level } = req.query;
    try {
        const result = await client.query(`
            SELECT * FROM questions
            WHERE subject = $1 AND banding = $2 AND level = $3
        `, [subject, banding, level]);
        console.log(result.rows);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});

router.post('/saveQuiz', async (req, res) => {
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

module.exports = router;