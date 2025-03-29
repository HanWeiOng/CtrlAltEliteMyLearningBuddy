// Initiate the server
require("dotenv").config(); // Load environment variables from .env file
const express = require("express"); 
const cors = require("cors"); // Enable CORS for all requests
const app = express(); // Create express app
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cors()); // Enable CORS for all requests
const client = require('./databasepg'); // PostgreSQL client

// Define various Routes
const ocrRoutes = require("./routes/ocr/ocrRoutes");
const createQuizRoutes = require("./routes/createquiz/createQuizRoutes");
const showQuizFolderRoutes = require("./routes/practiceQuiz/showQuizFolder");
const practiceQuizRoutes = require("./routes/practiceQuiz/practiceQuizRoutes");


app.use("/api/ocr", ocrRoutes);
app.use("/api/createquiz", createQuizRoutes);
app.use("/api/practicequiz", showQuizFolderRoutes);
app.use("/api/practicequiz2", practiceQuizRoutes);

// Start Server on port 5000
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
