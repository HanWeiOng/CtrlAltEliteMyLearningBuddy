// Initiate the server
require("dotenv").config(); // Load environment variables from .env file
const express = require("express"); 
const cors = require("cors"); // Enable CORS for all requests
const app = express(); // Create express app
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cors()); // Enable CORS for all requests
const client = require('./databasepg'); // PostgreSQL client

// Define various Routes
const ocrRoutes = require("./routes/ocrRoutes");
const createQuizRoutes = require("./routes/createQuizRoutes");
const practiceQuizRoutes = require("./routes/practiceQuizRoutes");
app.use("/api/ocr", ocrRoutes);
app.use("/api/createQuiz", createQuizRoutes);
app.use("/api/practiceQuiz", practiceQuizRoutes);


// Start Server on port 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
