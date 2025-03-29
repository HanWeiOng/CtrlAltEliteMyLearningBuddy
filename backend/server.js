// server.js

// Load environment variables from .env file
require("dotenv").config();

// Import dependencies
const express = require("express");
const cors = require("cors");

// Create express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all incoming requests
app.use(express.json()); // Parse incoming JSON requests

// PostgreSQL client (optional if used directly in routes)
const client = require("./databasepg");

// Import Routes
const ocrRoutes = require("./routes/ocr/ocrRoutes");
const createQuizRoutes = require("./routes/createquiz/createQuizRoutes");
const showQuizFolderRoutes = require("./routes/practicequiz/showQuizFolder");
const practiceQuizRoutes = require("./routes/practicequiz/practiceQuizRoutes");

// Attach Routes to API paths
app.use("/api/ocr", ocrRoutes);
app.use("/api/createquiz", createQuizRoutes);
app.use("/api/practicequiz", showQuizFolderRoutes);  // Folder listing
app.use("/api/practicequiz", practiceQuizRoutes);    // Quiz-specific actions

// Start Server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
