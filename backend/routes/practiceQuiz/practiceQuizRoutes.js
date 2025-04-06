require("dotenv").config();

const express = require("express");
const router = express.Router();
const { Client } = require("pg");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

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
    rejectUnauthorized: false,
  },
});

// Establish the database connection
client.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    return;
  } else {
    console.log("Connected to database");
  }
});

// Validation middleware
const validateQuizInput = (req, res, next) => {
  const { username, folder_name, subject, banding, level, question_ids } =
    req.body;

  if (
    !username ||
    !folder_name ||
    !subject ||
    !banding ||
    !level ||
    !question_ids
  ) {
    return res.status(400).json({
      message: "Missing required fields",
      required: [
        "username",
        "folder_name",
        "subject",
        "banding",
        "level",
        "question_ids",
      ],
    });
  }

  if (!Array.isArray(question_ids) || question_ids.length === 0) {
    return res.status(400).json({
      message: "question_ids must be a non-empty array",
    });
  }

  // Validate that all question_ids are numbers
  if (!question_ids.every((id) => typeof id === "number")) {
    return res.status(400).json({
      message: "All question_ids must be numbers",
    });
  }

  next();
};

// Route to get questions by subject, banding, and level
router.get("/getQuestionsByFilters", async (req, res) => {
  const { subject, banding, level } = req.query;

  if (!subject || !banding || !level) {
    return res.status(400).json({
      message: "Subject, banding, and level are required",
    });
  }

  try {
    const result = await client.query(
      `
            SELECT * FROM questions
            WHERE subject = $1 AND banding = $2 AND level = $3
        `,
      [subject, banding, level]
    );
    console.log("Found questions:", result.rows.length);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error retrieving questions:", error);
    res
      .status(500)
      .json({ message: "Internal server error: " + error.message });
  }
});

// Route to get questions by folder ID
router.get("/getQuestionsByFolderId", async (req, res) => {
  const { folderId } = req.query;
  console.log("Received request for folder ID:", folderId);

  if (!folderId) {
    return res.status(400).json({
      message: "Folder ID is required",
    });
  }

  try {
    // Parse folderId as integer
    const folderIdInt = parseInt(folderId, 10);
    if (isNaN(folderIdInt)) {
      return res.status(400).json({
        message: "Invalid folder ID format",
      });
    }

    // First, get the folder to access its question_ids
    const folderResult = await client.query(
      `
            SELECT question_ids
            FROM questions_folder 
            WHERE id = $1
        `,
      [folderIdInt]
    );

    console.log("Folder query result:", folderResult.rows);

    if (folderResult.rows.length === 0) {
      return res.status(404).json({
        message: "Folder not found",
      });
    }

    // Extract the question IDs from the JSONB array
    const questionIds = folderResult.rows[0].question_ids;
    console.log("Question IDs from folder:", questionIds);

    // Then, get all questions with these IDs
    const questionsResult = await client.query(
      `
            SELECT id, question_text, answer_key, answer_options, image_paths
            FROM questions 
            WHERE id = ANY(
                SELECT DISTINCT jsonb_array_elements_text(question_ids)::integer 
                FROM questions_folder 
                WHERE id = $1
            )
        `,
      [folderIdInt]
    );

    console.log("Found questions:", questionsResult.rows.length);
    res.status(200).json(questionsResult.rows);
  } catch (error) {
    console.error("Error retrieving questions:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});


router.post("/saveQuiz", validateQuizInput, async (req, res) => {
  console.log("Received saveQuiz request:", req.body);

  const {
    username,
    folder_name,
    subject,
    banding,
    level,
    question_ids,
    teacher_id, // Ensure teacher_id is included
  } = req.body;

  try {
    // Check if folder name already exists for this user
    const existingFolder = await client.query(
      `
            SELECT id FROM questions_folder 
            WHERE username = $1 AND folder_name = $2
        `,
      [username, folder_name]
    );

    if (existingFolder.rows.length > 0) {
      return res.status(409).json({
        message: "A quiz folder with this name already exists",
      });
    }
    // Insert the new quiz into the questions_folder table
    const result = await client.query(
      `
        INSERT INTO questions_folder 
        (username, folder_name, subject, banding, level, question_ids, teacher_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, current_timestamp)
        RETURNING *
      `,
      [
        username,
        folder_name,
        subject,
        banding,
        level,
        JSON.stringify(question_ids),
        teacher_id // hardcoded for testing
      ]
    );
    

    console.log("Quiz folder created:", result.rows[0]);
    res.status(201).json({
      message: "Quiz folder created successfully",
      quiz: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating quiz folder:", error);
    res.status(500).json({
      message: "Internal server error: " + error.message,
    });
  }
});
// Route to get all folders for a user
router.get("/getFolders", async (req, res) => {
  const { teacherId } = req.query;

  if (!teacherId) {
    return res.status(400).json({
      message: "TeacherID is required",
    });
  }

  try {
    const result = await client.query(
      `
            SELECT 
                id,
                folder_name,
                subject,
                banding,
                level,
                question_ids,
                created_at
            FROM questions_folder 
            WHERE teacher_id = $1
            ORDER BY created_at DESC
        `,
      [teacherId]
    );

    // For each folder, get the count of questions
    const foldersWithQuestionCount = result.rows.map((folder) => ({
      ...folder,
      questionCount: folder.question_ids ? folder.question_ids.length : 0,
    }));

    res.status(200).json(foldersWithQuestionCount);
  } catch (error) {
    console.error("Error retrieving folders:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Test route to check folder
router.get("/testFolder/:id", async (req, res) => {
  const folderId = req.params.id;
  try {
    const result = await client.query(
      `
            SELECT * FROM questions_folder WHERE id = $1
        `,
      [folderId]
    );

    console.log("Folder query result:", result.rows);
    res.json({
      folderExists: result.rows.length > 0,
      folder: result.rows[0] || null,
    });
  } catch (error) {
    console.error("Test query error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: err.message,
  });
});

// 2 person 1 correct 1 wrong

router.post("/updateScore", async (req, res) => {
  try {
    const { questionId, questionCorrectness } = req.body;
    console.log("questionId:", questionId);
    console.log("questionCorrectness", questionCorrectness);
    const messages = [];
    if (questionCorrectness == "Correct") {
      //updateAttemptCount
      await client.query(
        `UPDATE questions 
                SET question_attempt_count = COALESCE(question_attempt_count, 0) + 1 
                WHERE id = $1`,
        [questionId]
      );
      messages.push("question_attempt_count incremented successfully.");
    } else if (questionCorrectness === "Wrong") {
      //updateScore
      await client.query(
        `UPDATE questions 
                SET question_wrong = CASE
                    WHEN question_wrong IS NULL THEN 0
                    ELSE question_wrong + 1
                    END
                WHERE id = $1`,
        [questionId]
      );
      messages.push("question_wrong updated successfully.");
      //updateAttemptCount
      await client.query(
        `UPDATE questions
                SET question_attempt_count = COALESCE(question_attempt_count, 0) + 1 
                WHERE id = $1`,
        [questionId]
      );
      messages.push("question_attempt_count incremented successfully.");
    }

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Error updating score:", error);
    res.status(500).json({ success: false, error: "Something went wrong." });
  }
});

router.post("/addAnswerOptionAnalytics", async (req, res) => {
  try {
    const { question_id, answer_option, answer_text, correctness } = req.body;

    const result = await client.query(
      `INSERT INTO question_answer_table (
                question_id, answer_option, answer_text, selected_option_count, correctness
            )
            VALUES ($1, $2, $3, 1, $4)
            ON CONFLICT (question_id, answer_option)
            DO UPDATE SET selected_option_count = question_answer_table.selected_option_count + 1
            RETURNING *;`,
      [question_id, answer_option, answer_text, correctness]
    );

    const row = result.rows[0];

    // Decide if it's an insert or update
    const operation = row.selected_option_count === 1 ? "inserted" : "updated";

    res.status(200).json({
      message: `Answer option ${operation} successfully.`,
      data: row,
    });
  } catch (error) {
    console.error("Error inserting/updating answer option:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/assignQuiz", async (req, res) => {
  try {
    const { teacher_id, student_id, quiz_folder_id } = req.body;

    // Check if the assignment already exists
    const { rows } = await client.query(
      `SELECT * FROM quiz_assignment_table
             WHERE teacher_id = $1 AND student_id = $2 AND quiz_folder_id = $3`,
      [teacher_id, student_id, quiz_folder_id]
    );

    let operation;

    if (rows.length > 0) {
      // If exists, unassign (delete)
      await client.query(
        `DELETE FROM quiz_assignment_table
                 WHERE teacher_id = $1 AND student_id = $2 AND quiz_folder_id = $3`,
        [teacher_id, student_id, quiz_folder_id]
      );
      operation = "unassigned";
    } else {
      // If not exists, assign (insert)
      await client.query(
        `INSERT INTO quiz_assignment_table (student_id, teacher_id, quiz_folder_id) 
                 VALUES ($1, $2, $3)`,

        [student_id, teacher_id, quiz_folder_id] // 🔥 corrected order!
      );
      operation = "assigned";
    }

    res.status(200).json({
      message: `Quiz folder ${operation} successfully.`,
    });
  } catch (error) {
    console.error("Error during quiz assignment:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

router.get("/getQuizAssigned/:quiz_folder_id", async (req, res) => {
  try {
    const { quiz_folder_id } = req.params;

    if (!quiz_folder_id) {
      return res
        .status(400)
        .json({ error: "Missing quiz_folder_id parameter" });
    }

    const all_account_name = await client.query(
      `SELECT account_id, username FROM account_table
            where position = 'student'`
    );

    const student_assigned = await client.query(
      `SELECT student_id FROM quiz_assignment_table 
            WHERE quiz_folder_id = $1`,
      [quiz_folder_id]
    );

    const assignedIds = new Set(
      student_assigned.rows.map((row) => row.student_id)
    );

    const assignedStudents = all_account_name.rows.filter((student) =>
      assignedIds.has(student.account_id)
    );

    const unassignedStudents = all_account_name.rows.filter(
      (student) => !assignedIds.has(student.account_id)
    );

    res.status(200).json({
      assignedStudents,
      unassignedStudents,
    });
  } catch (error) {
    console.error("Error retrieving quiz assignment:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

router.post("/logCompletion", async (req, res) => {
  try {
    const { student_id, folder_id, completed, student_score } = req.body;

    // ✅ Call your other API properly using fetch
    const response = await fetch(
      `http://localhost:5003/api/accountHandling/getStudentName/${student_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const studentData = await response.json();
    const username = studentData.username;

    console.log("Student Username:", username);

    // ✅ Determine the correct score
    const scoreToInsert =
      completed.toLowerCase() === "true" ? student_score : 0;

    // ✅ Insert the completion data into database
    await client.query(
      `INSERT INTO student_attempt_quiz_table (student_id, folder_id, completed, student_score, student_name)
             VALUES ($1, $2, $3, $4, $5)`,
      [student_id, folder_id, completed, scoreToInsert, username]
    );

    // ✅ Return response
    if (completed.toLowerCase() === "true") {
      res.status(200).json({
        message: `Quiz completed successfully by ${username}.`,
        score: scoreToInsert,
      });
    } else {
      res.status(200).json({
        message: `Quiz uncompleted by ${username}, user has left the paper.`,
        score: scoreToInsert,
      });
    }
  } catch (error) {
    console.error("Error during quiz completion uploading:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

module.exports = router;
