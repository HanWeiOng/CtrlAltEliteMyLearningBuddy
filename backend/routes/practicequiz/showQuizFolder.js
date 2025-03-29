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
        // Handle the error appropriately here. You might want to:
        // 1.  Exit the application (if the connection is essential).
        // 2.  Retry the connection after a delay.
        // 3.  Inform the administrator.
        return; // Important: Stop further execution if connection fails
    } else {
        console.log('Connected to database');
    }
});

router.get('/getQuizFolders', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT * FROM questions_folder
        `);
        console.log(result.rows);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error retrieving quiz folders:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
})

router.get('/getQuestionsByFolder/:folderId', async (req, res) => {
    const { folderId } = req.params;

    try {
        // Step 1: Get the question_ids array and folder_name from the questions_folder table
        const folderResult = await client.query(
            `SELECT question_ids, folder_name FROM questions_folder WHERE id = $1`,
            [folderId]
        );

        if (folderResult.rows.length === 0) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        const { question_ids: questionIds, folder_name: folderName } = folderResult.rows[0];

        if (!questionIds || questionIds.length === 0) {
            return res.status(200).json({ folderName, questions: [] }); // No questions in the folder
        }

        // Step 2: Fetch the questions from the questions table
        const questionsResult = await client.query(
            `SELECT * FROM questions WHERE id = ANY($1::int[])`,
            [questionIds]
        );

        res.status(200).json({ folderName, questions: questionsResult.rows });
    } catch (error) {
        console.error('Error retrieving questions by folder:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});

module.exports = router;