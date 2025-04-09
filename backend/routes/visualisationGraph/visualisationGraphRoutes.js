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

router.post('/getHardestTopicOverview', async (req, res) => {
    try {
      const { teacher_id } = req.body;
  
      if (!teacher_id) {
        return res.status(400).json({ message: "teacher_id is required." });
      }
  
      // Step 1: Get all paper_ids for this teacher
      const papersResult = await client.query(
        `
        SELECT id FROM questions_folder
        WHERE teacher_id = $1
        `,
        [teacher_id]
      );
  
      const paperIds = papersResult.rows.map(row => row.id);
  
      if (paperIds.length === 0) {
        return res.status(200).json({
          message: 'No papers found for this teacher.',
          data: [],
        });
      }
  
      // Step 2: Aggregate by topic_label
      const result = await client.query(
        `
        WITH topic_totals AS (
          SELECT
            topic_label,
            SUM(selected_option_count) AS total_attempts_per_topic
          FROM question_answer_table
          WHERE paper_id = ANY($1)
          GROUP BY topic_label
        )
        SELECT 
          qat.topic_label,
          SUM(qat.selected_option_count) AS total_wrong_attempts,
          tt.total_attempts_per_topic,
          ROUND(
            (SUM(qat.selected_option_count)::decimal / NULLIF(tt.total_attempts_per_topic, 0)) * 100,
            2
          ) AS selected_percentage_wrong
        FROM question_answer_table qat
        JOIN topic_totals tt ON qat.topic_label = tt.topic_label
        WHERE qat.paper_id = ANY($1)
          AND qat.correctness = FALSE
        GROUP BY 
          qat.topic_label, 
          tt.total_attempts_per_topic
        ORDER BY selected_percentage_wrong DESC;
        `,
        [paperIds]
      );
  
      res.status(200).json({
        message: "Hardest topics retrieved successfully.",
        data: result.rows,
      });
  
    } catch (error) {
      console.error('Error retrieving topics:', error);
      res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});

router.post('/getHardestTopicByPaper', async (req, res) => {
    try {
      const { paper_id } = req.body;
  
      if (!paper_id) {
        return res.status(400).json({ message: "paper_id is required." });
      }
  
      // Step 1: Aggregate by topic_label for this specific paper
      const result = await client.query(
        `
        WITH topic_totals AS (
          SELECT
            topic_label,
            SUM(selected_option_count) AS total_attempts_per_topic
          FROM question_answer_table
          WHERE paper_id = $1
          GROUP BY topic_label
        )
        SELECT 
          qat.topic_label,
          SUM(qat.selected_option_count) AS total_wrong_attempts,
          tt.total_attempts_per_topic,
          ROUND(
            (SUM(qat.selected_option_count)::decimal / NULLIF(tt.total_attempts_per_topic, 0)) * 100,
            2
          ) AS selected_percentage_wrong
        FROM question_answer_table qat
        JOIN topic_totals tt ON qat.topic_label = tt.topic_label
        WHERE qat.paper_id = $1
          AND qat.correctness = FALSE
        GROUP BY 
          qat.topic_label, 
          tt.total_attempts_per_topic
        ORDER BY selected_percentage_wrong DESC;
        `,
        [paper_id]
      );
  
      res.status(200).json({
        message: "Hardest topics retrieved successfully.",
        paper_id: paper_id,
        data: result.rows,
      });
  
    } catch (error) {
      console.error('Error retrieving topics:', error);
      res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
});
  

//To use the function below need send the paper owned by the teacher in an array
router.post('/getHardestQuestionsOverview', async (req, res) => {
    try {
      const { teacher_id } = req.body;
  
      if (!teacher_id) {
        return res.status(400).json({ message: "teacher_id is required." });
      }
  
      // Step 1: Get all paper_ids for this teacher
      const papersResult = await client.query(
        `
        SELECT id FROM questions_folder
        WHERE teacher_id = $1
        `,
        [teacher_id]
      );
  
      const paperIds = papersResult.rows.map(row => row.id);
  
      if (paperIds.length === 0) {
        return res.status(200).json({
          message: 'No papers found for this teacher.',
          data: [],
        });
      }
  
      // Step 2: Global question aggregation (ignore paper_id)
      const result = await client.query(
        `
        WITH question_totals AS (
          SELECT
            question_id,
            SUM(selected_option_count) AS total_attempts_per_question
          FROM question_answer_table
          WHERE paper_id = ANY($1)
          GROUP BY question_id
        )
        SELECT 
          qat.question_id,
          SUM(qat.selected_option_count) AS total_wrong_attempts,
          qt.total_attempts_per_question,
          ROUND(
            (SUM(qat.selected_option_count)::decimal / NULLIF(qt.total_attempts_per_question, 0)) * 100,
            2
          ) AS selected_percentage_wrong,
          q.question_text,
          qat.topic_label
        FROM question_answer_table qat
        JOIN questions q ON qat.question_id = q.id
        JOIN question_totals qt ON qat.question_id = qt.question_id
        WHERE qat.paper_id = ANY($1)
          AND qat.correctness = FALSE
        GROUP BY 
          qat.question_id, 
          qt.total_attempts_per_question,
          q.question_text, 
          qat.topic_label
        ORDER BY selected_percentage_wrong DESC;
        `,
        [paperIds]
      );
  
      res.status(200).json({
        message: "Question overview retrieved successfully.",
        data: result.rows,
      });
  
    } catch (error) {
      console.error("Error fetching question overview:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  
router.post('/getHardestQuestionsByPaper', async (req, res) => {
    try {
      const { paper_id } = req.body;
  
      if (!paper_id) {
        return res.status(400).json({ message: "paper_id is required." });
      }
  
      const result = await client.query(
        `
        WITH question_totals AS (
          SELECT
            question_id,
            SUM(selected_option_count) AS total_attempts_per_question
          FROM question_answer_table
          WHERE paper_id = $1
          GROUP BY question_id
        )
        SELECT 
          qat.paper_id,
          qat.question_id,
          SUM(qat.selected_option_count) AS total_wrong_attempts,
          qt.total_attempts_per_question,
          ROUND(
            (SUM(qat.selected_option_count)::decimal / NULLIF(qt.total_attempts_per_question, 0)) * 100,
            2
          ) AS selected_percentage_wrong,
          q.question_text,
          qat.topic_label
        FROM question_answer_table qat
        JOIN questions q ON qat.question_id = q.id
        JOIN question_totals qt ON qat.question_id = qt.question_id
        WHERE qat.paper_id = $1
          AND qat.correctness = FALSE
        GROUP BY 
          qat.paper_id, 
          qat.question_id, 
          qt.total_attempts_per_question,
          q.question_text, 
          qat.topic_label
        ORDER BY selected_percentage_wrong DESC;
        `,
        [paper_id]
      );
  
      res.status(200).json({
        message: "Questions retrieved successfully.",
        paper_id: paper_id,
        data: result.rows,
      });
  
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Internal server error" });
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

router.post('/getAllAverageQuizScores', async (req, res) => {
  try {
    const { teacher_id, subject, banding, level } = req.body;

    if (!teacher_id || !subject || !banding || !level) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Step 1: Get all paper IDs for the teacher
    const paperResult = await client.query(
      `
      SELECT id FROM questions_folder
      WHERE teacher_id = $1
        AND subject = $2
        AND banding = $3
        AND level = $4
      ORDER BY id ASC
      `,
      [teacher_id, subject, banding, level]
    );

    const papers = paperResult.rows.map(row => row.id);

    if (papers.length === 0) {
      return res.status(200).json({
        message: "No papers found for the given teacher.",
        data: []
      });
    }

    // Step 2: Query completed attempts for all papers
    const scoresResult = await client.query(
      `
      SELECT DISTINCT ON (student_id, folder_id)
        folder_id AS paper_id,
        student_id,
        student_score
      FROM student_attempt_quiz_table
      WHERE folder_id = ANY($1)
        AND completed = true
      ORDER BY student_id, folder_id, id ASC
      `,
      [papers]
    );

    const scores = scoresResult.rows;

    // Step 3: Calculate total completed and average score for each paper
    const paperScores = papers.map(paper => {
      const paperEntries = scores.filter(entry => entry.paper_id === paper);
      const totalCompleted = paperEntries.length;
      const totalScore = paperEntries.reduce((sum, entry) => sum + Number(entry.student_score || 0), 0);
      const averageScore = totalCompleted > 0 ? (totalScore / totalCompleted).toFixed(2) : "0.00";

      return {
        paper_id: paper,
        total_number_of_completed: totalCompleted,
        average_student_score: averageScore
      };
    });

    // Step 4: Return the results
    res.status(200).json({
      message: "All quiz scores retrieved successfully.",
      selected_papers: papers,
      scores: paperScores
    });

  } catch (error) {
    console.error('Error fetching quiz scores:', error);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
});


router.post('/getAverageQuizScoresFor3Quiz', async (req, res) => {
  try {
    const { paper_id, teacher_id, subject, banding, level } = req.body;

    if (!paper_id || !teacher_id || !subject || !banding || !level) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Step 1: Get all paper IDs for the teacher
    const paperResult = await client.query(
      `
      SELECT id FROM questions_folder
      WHERE teacher_id = $1
        AND subject = $2
        AND banding = $3
        AND level = $4
      ORDER BY id ASC
      `,
      [teacher_id, subject, banding, level]
    );

    const papers = paperResult.rows.map(row => row.id);

    if (!papers.includes(paper_id)) {
      return res.status(404).json({ message: "Provided paper_id not found in teacher's papers." });
    }

    // Step 2: Find index of current paper_id
    const currentIndex = papers.indexOf(paper_id);

    // Step 3: Get previous, current, next paper IDs
    const selectedPapers = papers.filter((_, index) =>
      index === currentIndex - 1 || index === currentIndex || index === currentIndex + 1
    );

    if (selectedPapers.length === 0) {
      return res.status(200).json({
        message: "No adjacent papers found.",
        selected_papers: [],
        scores: []
      });
    }

    // Step 4: Query first attempts with completed = true
    const scoresResult = await client.query(
      `
      SELECT DISTINCT ON (student_id, folder_id)
        folder_id AS paper_id,
        student_id,
        student_score
      FROM student_attempt_quiz_table
      WHERE folder_id = ANY($1)
        AND completed = true
      ORDER BY student_id, folder_id, id ASC
      `,
      [selectedPapers]
    );

    const scores = scoresResult.rows;

    // Step 5: Process results to match your format
    const paperScores = selectedPapers.map(paper => {
      const paperEntries = scores.filter(entry => entry.paper_id === paper);
      const totalCompleted = paperEntries.length;
      const totalScore = paperEntries.reduce((sum, entry) => sum + Number(entry.student_score || 0), 0);
      const averageScore = totalCompleted > 0 ? (totalScore / totalCompleted).toFixed(2) : "0.00";

      return {
        paper_id: paper,
        total_number_of_completed: totalCompleted,
        average_student_score: averageScore
      };
    });

    // Step 6: Respond
    res.status(200).json({
      message: "Quiz scores retrieved successfully.",
      selected_papers: selectedPapers,
      scores: paperScores
    });

  } catch (error) {
    console.error('Error fetching quiz scores:', error);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
});


// router.post('/getIndividualPaperAllScore/:folder_id', async (req, res) => {
//     try {
//         const {folder_id} = req.params
//         const response = await client.query(`
//             SELECT student_name, student_score
//             FROM (
//                 SELECT DISTINCT ON (student_name) student_name, student_score, id
//                 FROM student_attempt_quiz_table
//                 WHERE folder_id = $1 AND completed = true
//                 ORDER BY student_name, id ASC
//             ) AS first_attempts
//             ORDER BY student_score DESC
//         `, [folder_id]);
//         res.status(200).json(response.rows);

//     } catch (error) {
//         console.error('Error fetching individual quiz score data:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// get student performance across all papers
router.post('/getIndividualPaperAllScore/:folder_id', async (req, res) => {
  try {
      const {folder_id} = req.params;
      
      // Handle 'all' case
      if (folder_id === 'all') {
          const response = await client.query(`
              WITH student_averages AS (
                  SELECT 
                      student_name,
                      ROUND(AVG(student_score)::numeric, 2) as student_score
                  FROM student_attempt_quiz_table
                  WHERE completed = true
                  GROUP BY student_name
              )
              SELECT student_name, student_score::text
              FROM student_averages
              ORDER BY student_score DESC
          `);
          return res.status(200).json(response.rows);
      }

      // Handle specific folder case
      const response = await client.query(`
          SELECT student_name, student_score
          FROM (
              SELECT DISTINCT ON (student_name) student_name, student_score, id
              FROM student_attempt_quiz_table
              WHERE folder_id = $1 AND completed = true
              ORDER BY student_name, id ASC
          ) AS first_attempts
          ORDER BY student_score DESC
      `, [folder_id]);
      res.status(200).json(response.rows);

  } catch (error) {
      console.error('Error fetching individual quiz score data:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});


// New endpoint to get all quizzes/folders for the dropdown list
router.get('/getAllQuizzes', async (req, res) => {
    try {
        const { teacher_id } = req.query;
        
        // Validate teacher_id
        if (!teacher_id) {
            return res.status(400).json({ error: 'teacher_id is required' });
        }

        // Get quiz folders filtered by teacher_id
        const result = await client.query(`
            SELECT 
                id, 
                folder_name
            FROM 
                questions_folder 
            WHERE 
                teacher_id = $1
            ORDER BY 
                folder_name ASC
        `, [teacher_id]);

        // Format the response for the frontend dropdown
        const quizzes = result.rows.map(quiz => ({
            id: quiz.id,
            name: quiz.folder_name
        }));

        // Add an "All Quizzes" option
        const response = [
            { id: "all", name: "All Quizzes" },
            ...quizzes
        ];

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/getQuizFolder', async (req, res) => {
  try {
    const { quiz_id, teacher_id } = req.query;

    if (!quiz_id || !teacher_id) {
      return res.status(400).json({ message: "quiz_id and teacher_id are required." });
    }

    // Get quiz folder data
    const result = await client.query(
      `
      SELECT subject, banding, level, folder_name
      FROM questions_folder
      WHERE id = $1 AND teacher_id = $2
      `,
      [quiz_id, teacher_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Quiz folder not found." });
    }

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching quiz folder:', error);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
});

/**
 * Explain why a user's answer to a question is wrong using Gemini
 * @param {string} question - The original question
 * @param {string} userAnswer - The user's (wrong) answer
 * @returns {Promise<string>} - Gemini's explanation
 */
router.post('/reccomendationForResults', async (req, res) => {
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


//         const result = await client.query(`
//             SELECT question_text, question_difficulty
//             FROM questions
//             WHERE question_difficulty > 0
//             ORDER BY question_difficulty ASC
//             LIMIT 10;
//         `)
//         console.log(result);
//         res.status(200).json(result.rows);
//     } catch (error) {
//         console.error('Error retrieving questions:', error);
//         res.status(500).json({ message: 'Internal server error: ' + error.message });
//     }
// });
// And this for most wrong questions individidual paper

// Get the answer option that has the most wrong in a question
// router.get('/getAnswerOptionAnalytics/:question_id', async (req, res) => {
//     try {
//         const { question_id } = req.params; // ✅ GET requests use req.query

//         const result = await client.query(`
//             SELECT question_id, answer_option, answer_text, selected_option_count, correctness
//             FROM question_answer_table
//             WHERE question_id = $1 AND correctness = 'False'
//             ORDER BY selected_option_count DESC
//             LIMIT 1
//         `, [question_id]);

//         const row = result.rows[0];

//         res.status(200).json({
//             message: 'Most selected incorrect answer retrieved successfully.',
//             data: row || null
//         });
//     } catch (error) {
//         console.error('Error retrieving answer analytics:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// });


// router.get('/getPaperDemographic', async (req, res) => {
//     try {
//         const result = await client.query(`
//             SELECT level, COUNT(*) AS count
//             FROM (
//                 SELECT DISTINCT ON (paper_name) level
//                 FROM questions
//                 ORDER BY paper_name, level
//             ) AS subquery
//             GROUP BY level;
//         `)
//         console.log(result);
//         res.status(200).json(result.rows);
//     } catch (error) {
//         console.error('Error retrieving questions:', error);
//         res.status(500).json({ message: 'Internal server error: ' + error.message });
//     }
// });