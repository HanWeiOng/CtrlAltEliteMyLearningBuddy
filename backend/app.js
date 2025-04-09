const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
}));

// ... rest of your app configuration ... 