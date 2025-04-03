require("dotenv").config();
const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const cors = require('cors');
// Initialize middleware
router.use(cors());
router.use(express.json());

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

router.get('/getHardestTopic', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT 
            topic_label,
            ROUND(
                CASE 
                    WHEN SUM(question_attempt_count) = 0 THEN 0 
                    ELSE SUM(question_wrong)::numeric / SUM(question_attempt_count)
                END
            , 2) AS wrong_ratio
            FROM question
            GROUP BY topic_label
            ORDER BY wrong_ratio DESC
            LIMIT 10;
        `)
        console.log(result);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});

router.get('/getPaperDemographic', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT level, COUNT(*) AS count
            FROM (
                SELECT DISTINCT ON (paper_name) level
                FROM question
                ORDER BY paper_name, level
            ) AS subquery
            GROUP BY level;
        `)
        console.log(result);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});

router.get('/getHardestQuestions', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT question_text, question_difficulty
            FROM question
            WHERE question_difficulty > 0
            ORDER BY question_difficulty ASC
            LIMIT 10;
        `)
        console.log(result);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});


module.exports = router;