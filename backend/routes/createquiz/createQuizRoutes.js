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
    //finally {
    //    client.end(); // Close the connection (see notes below)
    //}
});

router.post('/saveFolder', async (req, res) => {
    try {
        const { folder_name, question_ids, subject, banding, level } = req.body;

        if (!folder_name || !question_ids || question_ids.length === 0) {
            return res.status(400).json({ error: "Folder name and question IDs are required." });
        }

        // Select a random username (modify as needed)
        const usernames = ["alice123", "bob456", "charlie789", "david001", "emma999"];
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

module.exports = router;