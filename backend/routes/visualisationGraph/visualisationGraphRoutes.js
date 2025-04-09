require("dotenv").config();
const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const cors = require('cors');
const { marked } = require('marked');
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
),
most_wrong_options AS (
  SELECT DISTINCT ON (question_id)
    question_id,
    answer_option,
    answer_text,
    selected_option_count
  FROM question_answer_table
  WHERE paper_id = ANY($1)
    AND correctness = FALSE
  ORDER BY question_id, selected_option_count DESC
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
  qat.topic_label,
  q.image_paths, -- ✅ Added image paths here
  mwo.answer_option AS most_wrong_answer_option,
  mwo.answer_text AS most_wrong_answer_text
FROM question_answer_table qat
JOIN questions q ON qat.question_id = q.id
JOIN question_totals qt ON qat.question_id = qt.question_id
JOIN most_wrong_options mwo ON qat.question_id = mwo.question_id
WHERE qat.paper_id = ANY($1)
  AND qat.correctness = FALSE
GROUP BY 
  qat.question_id, 
  qt.total_attempts_per_question,
  q.question_text, 
  qat.topic_label,
  q.image_paths,
  mwo.answer_option,
  mwo.answer_text
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
      ),
      most_wrong_options AS (
        SELECT DISTINCT ON (question_id)
          question_id,
          answer_option,
          answer_text,
          selected_option_count
        FROM question_answer_table
        WHERE paper_id = $1
          AND correctness = FALSE
        ORDER BY question_id, selected_option_count DESC
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
        qat.topic_label,
        q.image_paths,
        mwo.answer_option AS most_wrong_answer_option,
        mwo.answer_text AS most_wrong_answer_text
      FROM question_answer_table qat
      JOIN questions q ON qat.question_id = q.id
      JOIN question_totals qt ON qat.question_id = qt.question_id
      JOIN most_wrong_options mwo ON qat.question_id = mwo.question_id
      WHERE qat.paper_id = $1
        AND qat.correctness = FALSE
      GROUP BY 
        qat.paper_id,
        qat.question_id,
        qt.total_attempts_per_question,
        q.question_text,
        qat.topic_label,
        q.image_paths,
        mwo.answer_option,
        mwo.answer_text
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

router.post('/getAllPaperAllScore', async (req, res) => {
  try {
      const response = await client.query(`
          SELECT 
              student_id,
              student_name,
              ROUND(AVG(student_score)::numeric, 2) AS average_score
          FROM (
              SELECT DISTINCT ON (student_id, folder_id)
                  student_id,
                  student_name,
                  folder_id,
                  student_score,
                  id
              FROM student_attempt_quiz_table
              WHERE completed = true
              ORDER BY student_id, folder_id, id ASC
          ) AS first_attempts
          GROUP BY student_id, student_name
          ORDER BY average_score DESC
      `);
      
      res.status(200).json(response.rows);

  } catch (error) {
      console.error('Error fetching individual quiz score data:', error);
      res.status(500).json({ error: 'Internal server error' });
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
 * Teacher Dashboard Insights - frontend sends the data
 */
router.post('/teacherActionInsights', async (req, res) => {
  try {

    const { hardestQuestions, hardestTopics, allPaperScores } = req.body;

    // // Simulated data for all papers
    // const hardestQuestions = [
    //   {
    //     question_text: "What type of cell is it?",
    //     topic_label: "Cell Types",
    //     selected_percentage_wrong: "100.00"
    //   },
    //   {
    //     question_text: "Amylase solution is tested with Benedict's solution, biuret solution and iodine solution. Which colours are obtained?",
    //     topic_label: "Enzymes",
    //     selected_percentage_wrong: "73.08"
    //   },
    //   {
    //     question_text: "The diagram below shows a cell as seen under an electron microscope. What are the functions in the cell of the numbered parts?",
    //     topic_label: "Cell Structure",
    //     selected_percentage_wrong: "30.00"
    //   }
    // ];

    // const hardestTopics = [
    //   {
    //     topic_label: "Cell Types",
    //     selected_percentage_wrong: "100.00"
    //   },
    //   {
    //     topic_label: "Enzymes",
    //     selected_percentage_wrong: "73.08"
    //   },
    //   {
    //     topic_label: "Cell Structure",
    //     selected_percentage_wrong: "30.00"
    //   }
    // ];

    // const allPaperScores = [
    //   {
    //     student_name: "raerae3",
    //     average_score: "69.55"
    //   },
    //   {
    //     student_name: "Sharon001",
    //     average_score: "57.25"
    //   },
    //   {
    //     student_name: "raerae2",
    //     average_score: "48.00"
    //   },
    //   {
    //     student_name: "raerae1",
    //     average_score: "0.00"
    //   }
    // ];

    // Categorization functions
    function categorizeByPriority(items, key) {
      const high = [], medium = [], low = [];
      items.forEach(item => {
        const value = parseFloat(item[key]);
        if (value >= 70) high.push(item);
        else if (value >= 40) medium.push(item);
        else low.push(item);
      });
      return { high, medium, low };
    }

    function categorizeStudents(students) {
      const high = [], medium = [], low = [];
      students.forEach(s => {
        const score = parseFloat(s.average_score);
        if (score < 40) high.push(s);
        else if (score < 70) medium.push(s);
        else low.push(s);
      });
      return { high, medium, low };
    }

    const topicCategories = categorizeByPriority(hardestTopics, 'selected_percentage_wrong');
    const questionCategories = categorizeByPriority(hardestQuestions, 'selected_percentage_wrong');
    const studentCategories = categorizeStudents(allPaperScores);

    // Build structured prompt with strict headings
    const buildList = (label, data, formatter) => {
      return `### ${label}\n${data.length ? data.map(formatter).join('\n') : 'No recommendations.'}\n`;
    };

    const buildPrioritySection = (priority, topics, questions, students) => {
      return `## ${priority} Priority\n\n` +
        buildList('Topics', topics, t => `- ${t.topic_label} (${t.selected_percentage_wrong}% wrong)`) + '\n' +
        buildList('Questions', questions, q => `- ${q.question_text} (Topic: ${q.topic_label}, ${q.selected_percentage_wrong}% wrong)`) + '\n' +
        buildList('Scores', students, s => `- ${s.student_name} (Average score: ${s.average_score})`) + '\n';
    };

    const highPrioritySection = buildPrioritySection('High', topicCategories.high, questionCategories.high, studentCategories.high);
    const mediumPrioritySection = buildPrioritySection('Medium', topicCategories.medium, questionCategories.medium, studentCategories.medium);
    const lowPrioritySection = buildPrioritySection('Low', topicCategories.low, questionCategories.low, studentCategories.low);

    const finalInstructions = `
Strict format required. No introductions. No extra text. Just headings and bullet points.

For each priority, follow exactly:

## [Priority Level] Priority

### Topics
- Short, clear action for teacher
- Short, clear action for teacher

### Questions
- Short, clear action for teacher
- Short, clear action for teacher

### Scores
- Short, clear action for teacher
- Short, clear action for teacher

Strictly follow this format only. Do not add extra headings or sections.

For each section (Topics, Questions, Scores), give short, actionable, practical advice for teachers.

Avoid explanations or introductions. Go straight to the recommendations.
Keep each point under one line.
Avoid long sentences.
No extra headings, no summaries.
`;

    const prompt = `
You are an education advisor.

Based on the following quiz data, give short, actionable teaching recommendations.

${highPrioritySection}
${mediumPrioritySection}
${lowPrioritySection}

${finalInstructions}
`;

    // Send to Gemini
    const geminiResponse = await model.generateContent(prompt);
    const geminiText = await geminiResponse.response;
    const geminiOutput = geminiText.text();

    // Parse Gemini output with marked
    const tokens = marked.lexer(geminiOutput);

    const response = {
      highPriorityRecommendations: { topic: '', question: '', score: '' },
      mediumPriorityRecommendations: { topic: '', question: '', score: '' },
      lowPriorityRecommendations: { topic: '', question: '', score: '' }
    };

    let currentPriority = '';
    let currentSection = '';

    tokens.forEach(token => {
      if (token.type === 'heading' && token.depth === 2) {
        if (token.text.toLowerCase().includes('high priority')) currentPriority = 'highPriorityRecommendations';
        else if (token.text.toLowerCase().includes('medium priority')) currentPriority = 'mediumPriorityRecommendations';
        else if (token.text.toLowerCase().includes('low priority')) currentPriority = 'lowPriorityRecommendations';
      }

      if (token.type === 'heading' && token.depth === 3) {
        const lowerText = token.text.toLowerCase();
        if (lowerText.includes('topics')) currentSection = 'topic';
        else if (lowerText.includes('questions')) currentSection = 'question';
        else if (lowerText.includes('scores')) currentSection = 'score';
      }

      if ((token.type === 'paragraph' || token.type === 'text') && currentPriority && currentSection) {
        response[currentPriority][currentSection] += token.text.trim() + '\n';
      }

      if (token.type === 'list' && currentPriority && currentSection) {
        const listText = token.items.map(item => `${item.text}`).join('\n'); // ✅ no dash
        response[currentPriority][currentSection] += listText + '\n';
      }
    });

    // Clean up whitespace and fill empty with "No recommendations."
    for (const priority of ['highPriorityRecommendations', 'mediumPriorityRecommendations', 'lowPriorityRecommendations']) {
      for (const section of ['topic', 'question', 'score']) {
        response[priority][section] = response[priority][section].trim() || 'No recommendations.';
      }
    }

    res.status(200).json({
      message: 'Teacher insights generated successfully with Gemini',
      response
    });

  } catch (error) {
    console.error('Dashboard insights error:', error);
    res.status(500).json({ message: 'Failed to generate insights', error: error.message });
  }
});


/**
 * Teacher Dashboard Insights (Individual Paper) - frontend sends the data
 */
router.post('/teacherActionInsightsIndividual', async (req, res) => {
  try {
    const { hardestQuestionsByPaper, hardestTopicsByPaper, individualPaperScores } = req.body;

      // // Simulated data for individual paper
      // const hardestQuestionsByPaper = [
      //   {
      //     paper_id: 5769,
      //     question_id: 2,
      //     total_wrong_attempts: "15",
      //     total_attempts_per_question: "15",
      //     selected_percentage_wrong: "100.00",
      //     question_text: "Amylase solution is tested with Benedict's solution, biuret solution and iodine solution. Which colours are obtained?",
      //     topic_label: "Enzymes"
      //   },
      //   {
      //     paper_id: 5769,
      //     question_id: 22,
      //     total_wrong_attempts: "5",
      //     total_attempts_per_question: "5",
      //     selected_percentage_wrong: "100.00",
      //     question_text: "What type of cell is it?",
      //     topic_label: "Cell Types"
      //   },
      //   {
      //     paper_id: 5769,
      //     question_id: 21,
      //     total_wrong_attempts: "3",
      //     total_attempts_per_question: "10",
      //     selected_percentage_wrong: "30.00",
      //     question_text: "The diagram below shows a cell as seen under an electron microscope. What are the functions in the cell of the numbered parts?",
      //     topic_label: "Cell Structure"
      //   }
      // ];

      // const hardestTopicsByPaper = [
      //   {
      //     topic_label: "Enzymes",
      //     total_wrong_attempts: "15",
      //     total_attempts_per_topic: "15",
      //     selected_percentage_wrong: "100.00"
      //   },
      //   {
      //     topic_label: "Cell Types",
      //     total_wrong_attempts: "5",
      //     total_attempts_per_topic: "5",
      //     selected_percentage_wrong: "100.00"
      //   },
      //   {
      //     topic_label: "Cell Structure",
      //     total_wrong_attempts: "3",
      //     total_attempts_per_topic: "10",
      //     selected_percentage_wrong: "30.00"
      //   }
      // ];

      // const individualPaperScores = [
      //   {
      //     student_name: "raerae3",
      //     student_score: "69.55"
      //   },
      //   {
      //     student_name: "Sharon001",
      //     student_score: "54.00"
      //   },
      //   {
      //     student_name: "raerae2",
      //     student_score: "48.00"
      //   }
      // ];

    // Categorization functions
    function categorizeByPriority(items, key) {
      const high = [], medium = [], low = [];
      items.forEach(item => {
        const value = parseFloat(item[key]);
        if (value >= 70) high.push(item);
        else if (value >= 40) medium.push(item);
        else low.push(item);
      });
      return { high, medium, low };
    }

    function categorizeStudents(students) {
      const high = [], medium = [], low = [];
      students.forEach(s => {
        const score = parseFloat(s.student_score);
        if (score < 40) high.push(s);
        else if (score < 70) medium.push(s);
        else low.push(s);
      });
      return { high, medium, low };
    }

    const topicCategories = categorizeByPriority(hardestTopicsByPaper, 'selected_percentage_wrong');
    const questionCategories = categorizeByPriority(hardestQuestionsByPaper, 'selected_percentage_wrong');
    const studentCategories = categorizeStudents(individualPaperScores);

    // Build structured prompt with strict headings
    const buildList = (label, data, formatter) => {
      return `### ${label}\n${data.length ? data.map(formatter).join('\n') : 'No recommendations.'}\n`;
    };

    const buildPrioritySection = (priority, topics, questions, students) => {
      return `## ${priority} Priority\n\n` +
        buildList('Topics', topics, t => `- ${t.topic_label} (${t.selected_percentage_wrong}% wrong)`) + '\n' +
        buildList('Questions', questions, q => `- ${q.question_text} (Topic: ${q.topic_label}, ${q.selected_percentage_wrong}% wrong)`) + '\n' +
        buildList('Scores', students, s => `- ${s.student_name} (Score: ${s.student_score})`) + '\n';
    };

    const highPrioritySection = buildPrioritySection('High', topicCategories.high, questionCategories.high, studentCategories.high);
    const mediumPrioritySection = buildPrioritySection('Medium', topicCategories.medium, questionCategories.medium, studentCategories.medium);
    const lowPrioritySection = buildPrioritySection('Low', topicCategories.low, questionCategories.low, studentCategories.low);

    const finalInstructions = `
Strict format required. No introductions. No extra text. Just headings and bullet points.

For each priority, follow exactly:

## [Priority Level] Priority

### Topics
- Short, clear action for teacher
- Short, clear action for teacher

### Questions
- Short, clear action for teacher
- Short, clear action for teacher

### Scores
- Short, clear action for teacher
- Short, clear action for teacher

Strictly follow this format only. Do not add extra headings or sections.

For each section (Topics, Questions, Scores), give short, actionable, practical advice for teachers.

Avoid explanations or introductions. Go straight to the recommendations.
Keep each point under one line.
Avoid long sentences.
No extra headings, no summaries.
`;

    const prompt = `
You are an education advisor.

Based on the following quiz data, give short, actionable teaching recommendations.

${highPrioritySection}
${mediumPrioritySection}
${lowPrioritySection}

${finalInstructions}
`;

    // Send to Gemini
    const geminiResponse = await model.generateContent(prompt);
    const geminiText = await geminiResponse.response;
    const geminiOutput = geminiText.text();

    // Parse Gemini output with marked
    const tokens = marked.lexer(geminiOutput);

    const response = {
      highPriorityRecommendations: { topic: '', question: '', score: '' },
      mediumPriorityRecommendations: { topic: '', question: '', score: '' },
      lowPriorityRecommendations: { topic: '', question: '', score: '' }
    };

    let currentPriority = '';
    let currentSection = '';

    tokens.forEach(token => {
      if (token.type === 'heading' && token.depth === 2) {
        if (token.text.toLowerCase().includes('high priority')) currentPriority = 'highPriorityRecommendations';
        else if (token.text.toLowerCase().includes('medium priority')) currentPriority = 'mediumPriorityRecommendations';
        else if (token.text.toLowerCase().includes('low priority')) currentPriority = 'lowPriorityRecommendations';
      }

      if (token.type === 'heading' && token.depth === 3) {
        const lowerText = token.text.toLowerCase();
        if (lowerText.includes('topics')) currentSection = 'topic';
        else if (lowerText.includes('questions')) currentSection = 'question';
        else if (lowerText.includes('scores')) currentSection = 'score';
      }

      if ((token.type === 'paragraph' || token.type === 'text') && currentPriority && currentSection) {
        response[currentPriority][currentSection] += token.text.trim() + '\n';
      }

      if (token.type === 'list' && currentPriority && currentSection) {
        const listText = token.items.map(item => `${item.text}`).join('\n'); // ✅ no dash
        response[currentPriority][currentSection] += listText + '\n';
      }
    });

    // Clean up whitespace and fill empty with "No recommendations."
    for (const priority of ['highPriorityRecommendations', 'mediumPriorityRecommendations', 'lowPriorityRecommendations']) {
      for (const section of ['topic', 'question', 'score']) {
        response[priority][section] = response[priority][section].trim() || 'No recommendations.';
      }
    }

    res.status(200).json({
      message: 'Teacher individual paper insights generated successfully with Gemini',
      response
    });

  } catch (error) {
    console.error('Dashboard insights error (individual):', error);
    res.status(500).json({ message: 'Failed to generate individual paper insights', error: error.message });
  }
});



// ... existing code ...

// Get students needing support across all quizzes
router.post('/getStudentsNeedingSupport', async (req, res) => {
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

    // Step 2: Get average scores for each student across all papers
    const result = await client.query(
      `
      WITH student_scores AS (
        SELECT 
          student_name,
          ROUND(AVG(student_score)::numeric, 2) as score
        FROM student_attempt_quiz_table
        WHERE folder_id = ANY($1)
          AND completed = true
        GROUP BY student_name
        HAVING AVG(student_score) < 70  -- Only get students with average score below 70%
        ORDER BY score ASC
      )
      SELECT 
        student_name,
        score::text as score
      FROM student_scores
      `,
      [paperIds]
    );

    res.status(200).json({
      message: "Students needing support retrieved successfully.",
      data: result.rows,
    });

  } catch (error) {
    console.error('Error retrieving students needing support:', error);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
});

// Get students needing support for a specific quiz
router.post('/getStudentsNeedingSupportByQuiz/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { teacher_id } = req.body;

    if (!teacher_id) {
      return res.status(400).json({ message: "teacher_id is required." });
    }

    // Verify the quiz belongs to the teacher
    const quizCheck = await client.query(
      `
      SELECT id FROM questions_folder
      WHERE id = $1 AND teacher_id = $2
      `,
      [quizId, teacher_id]
    );

    if (quizCheck.rows.length === 0) {
      return res.status(404).json({
        message: 'Quiz not found or does not belong to this teacher.',
        data: [],
      });
    }

    // Get student scores for this specific quiz
    const result = await client.query(
      `
      WITH latest_attempts AS (
        SELECT DISTINCT ON (student_name)
          student_name,
          student_score::numeric as score
        FROM student_attempt_quiz_table
        WHERE folder_id = $1
          AND completed = true
        ORDER BY student_name, id DESC
      )
      SELECT 
        student_name,
        ROUND(score, 2)::text as score
      FROM latest_attempts
      WHERE score < 70  -- Only get students with score below 70%
      ORDER BY score ASC
      `,
      [quizId]
    );

    res.status(200).json({
      message: "Students needing support retrieved successfully.",
      data: result.rows,
    });

  } catch (error) {
    console.error('Error retrieving students needing support:', error);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
});


router.post('/reccomendationForResultsAllPapersNew', async (req, res) => {
  const { question_text, image_paths, most_wrong_answer_text } = req.body;

  if (!question_text || !most_wrong_answer_text) {
    return res.status(400).json({ message: 'Missing required fields in request body' });
  }

  try {
    const prompt = `
    A student answered this multiple-choice question incorrectly.
    
    Question: ${question_text}
    Image: ${image_paths ? image_paths : "No diagram provided"}
    Wrong Answer Chosen: ${most_wrong_answer_text}
    
    Identify clearly and briefly why the student likely selected this wrong answer. Consider misunderstandings, common misconceptions, confusion with the diagram, similar-looking options, or skipped reasoning steps. Keep the explanation short, specific, and focused only on the reason for the mistake. Do not add introductions, conclusions, or extra text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const explanation = response.text().trim();

    return res.status(200).json({ explanation });
  } catch (error) {
    console.error('Gemini error:', error);
    return res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
});




// /**
//  * Explain why a user's answer to a question is wrong using Gemini
//  * @param {string} question - The original question
//  * @param {string} userAnswer - The user's (wrong) answer
//  * @returns {Promise<string>} - Gemini's explanation
//  */
// router.post('/reccomendationForResults', async (req, res) => {
//     const { question, userAnswer, correctAnswer, options, imageUrl } = req.body;
  
//     if (!question || !userAnswer || !correctAnswer || !options) {
//       return res.status(400).json({ message: 'Missing fields in request body' });
//     }
  
//     try {
//       const explanation = await explainWrongAnswer({
//         question,
//         userAnswer,
//         correctAnswer,
//         options,
//         imageUrl,
//         model,
//       });
  
//       return res.status(200).json({ explanation });
//     } catch (error) {
//       console.error('Gemini error:', error);
//       return res.status(500).json({ message: 'Something went wrong', error: error.message });
//     }
// });
  

// async function explainWrongAnswer({ question, userAnswer, correctAnswer, options, imageUrl, model }) {
//     let formattedOptions = options
//       .map((opt) => {
//         const text = typeof opt.text === 'string' ? opt.text : JSON.stringify(opt.text);
//         return `${opt.option}: ${text}`;
//       })
//       .join('\n');
  

//     const prompt = `
//     You are a helpful tutor explaining why an answer is incorrect. Please provide a clear and concise explanation following this format:

//     Here is the full context:
//     - Question: ${question}
//     - Image (if available): ${imageUrl ? imageUrl : "No diagram provided"}
//     - Answer: ${userAnswer.option}: ${userAnswer.text}
//     - Correct answer : ${correctAnswer.option}: ${correctAnswer.text}
//     - Options: ${formattedOptions}

//     Please provide your explanation following these guidelines:
//     1. Start with "❌ ${userAnswer.option} is incorrect because:"
//     2. Then explain "✅ Correct Answer: ${correctAnswer.option}"\
//     3. If the diagram is important, explain its relevance
//     4. Keep explanations concise and focused
//     5. Use bullet points for clarity
//     6. Do not use markdown formatting

//     Format your response like this:
//     ${imageUrl ? `
//         • [Explain diagram's relevance]` : ''}

//     ❌ ${userAnswer.option} is incorrect because:
//     • [First reason]
//     • [Second reason]

//     ✅ Correct Answer: ${correctAnswer.option}
//     • [First reason]
//     • [Second reason]
//     • [More reasons if neccesary]
//     `;
  
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     return response.text();
// }



module.exports = router;
