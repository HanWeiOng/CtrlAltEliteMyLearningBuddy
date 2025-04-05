require("dotenv").config();
const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const cors = require('cors');
// Initialize middleware
router.use(cors());
router.use(express.json());

const { GoogleGenerativeAI } = require('@google/generative-ai');
// Initialize Gemini model
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
            FROM questions
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
                FROM questions
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
            FROM questions
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

router.get('/getAnswerOptionAnalytics/:question_id', async (req, res) => {
    try {
        const { question_id } = req.params; // ✅ GET requests use req.query

        const result = await client.query(`
            SELECT question_id, answer_option, answer_text, selected_option_count, correctness
            FROM question_answer_table
            WHERE question_id = $1 AND correctness = 'False'
            ORDER BY selected_option_count DESC
            LIMIT 1
        `, [question_id]);

        const row = result.rows[0];

        res.status(200).json({
            message: 'Most selected incorrect answer retrieved successfully.',
            data: row || null
        });
    } catch (error) {
        console.error('Error retrieving answer analytics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/getCompletionOfQuiz', async (req, res) => {
    const { teacher_id } = req.body;

    try {
        // Step 1: Get all quizzes owned by the teacher
        const findTeacherOwnedQuiz = await client.query(
            `SELECT id FROM questions_folder WHERE teacher_id = $1`,
            [teacher_id]
        );

        const quizIds = findTeacherOwnedQuiz.rows.map(quiz => quiz.id);
        console.log('Teacher Quiz IDs:', quizIds);

        const results = {};

        // Step 2: Process each quiz individually
        for (const quizId of quizIds) {
            // Query 1: Completed attempts
            const completedQuery = client.query(`
                WITH latest_attempts AS (
                    SELECT 
                        student_id,
                        folder_id,
                        completed,
                        student_score,
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY student_id, folder_id
                            ORDER BY 
                                (CASE WHEN completed THEN 1 ELSE 2 END),
                                id DESC
                        ) AS rn
                    FROM student_attempt_quiz_table
                    WHERE folder_id = $1
                )
                SELECT student_id, folder_id, completed, student_score, id
                FROM latest_attempts
                WHERE rn = 1 AND completed = true
            `, [quizId]);

            // Query 2: Incomplete attempts
            const incompleteQuery = client.query(`
                WITH latest_attempts AS (
                    SELECT 
                        student_id,
                        folder_id,
                        completed,
                        student_score,
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY student_id, folder_id
                            ORDER BY 
                                (CASE WHEN completed THEN 1 ELSE 2 END),
                                id DESC
                        ) AS rn
                    FROM student_attempt_quiz_table
                    WHERE folder_id = $1
                )
                SELECT student_id, folder_id, completed, student_score, id
                FROM latest_attempts
                WHERE rn = 1 AND completed = false
            `, [quizId]);

            // Query 3: Average and Median for completed only
            const scoreStatsQuery = client.query(`
                WITH latest_attempts AS (
                    SELECT 
                        student_id,
                        folder_id,
                        completed,
                        student_score,
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY student_id, folder_id
                            ORDER BY 
                                (CASE WHEN completed THEN 1 ELSE 2 END),
                                id DESC
                        ) AS rn
                    FROM student_attempt_quiz_table
                    WHERE folder_id = $1
                )
                SELECT 
                    AVG(student_score) AS average_student_score,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY student_score) AS median_score
                FROM latest_attempts
                WHERE rn = 1 AND completed = true
            `, [quizId]);

            // Execute all queries in parallel
            const [completedResult, incompleteResult, scoreStatsResult] = await Promise.all([
                completedQuery,
                incompleteQuery,
                scoreStatsQuery
            ]);

            const scoreStats = scoreStatsResult.rows[0];

            // Step 3: Build result for this quiz
            results[quizId] = {
                completedCount: completedResult.rows.length,
                completed: completedResult.rows,
                notCompletedCount: incompleteResult.rows.length,
                notCompleted: incompleteResult.rows,
                averageScoreCompleted: scoreStats.average_student_score !== null
                    ? parseFloat(scoreStats.average_student_score).toFixed(2)
                    : null,
                medianScoreCompleted: scoreStats.median_score !== null
                    ? parseFloat(scoreStats.median_score).toFixed(2)
                    : null
            };
        }

        // Step 4: Send response
        res.json(results);

    } catch (error) {
        console.error('Error fetching quiz completion data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.get('/getIndividualPaperAllScore', async (req, res) => {
    try {
        const response = await client.query(`
            SELECT student_name, student_score 
            FROM student_attempt_quiz_table
            WHERE completed = true OR LOWER(completed::text) = 'true'
            ORDER BY student_score DESC
        `);

        res.status(200).json(response.rows);

    } catch (error) {
        console.error('Error fetching individual quiz score data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;