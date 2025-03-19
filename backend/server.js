// server.js

require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const cors = require("cors");
const app = express();
const client = require("./databasepg"); // PostgreSQL client

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Define various Routes
const ocrRoutes = require("./routes/ocrRoutes");
const createQuizRoutes = require("./routes/createQuizRoutes");
const practiceQuizRoutes = require("./routes/practiceQuizRoutes");
const s3BucketCRUD = require("./routes/s3BucketCRUD");

// Mount the routes
app.use("/api/ocr", ocrRoutes);
app.use("/api/createQuiz", createQuizRoutes);
app.use("/api/practiceQuiz", practiceQuizRoutes);
app.use("/api/s3BucketCRUD", s3BucketCRUD);

// Optional: A basic health-check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Start Server on port 5003 (or the PORT specified in your .env)
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});