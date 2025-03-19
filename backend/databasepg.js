require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const processAllSubjects = require('./routes/insertTopics'); // Import topic insertion function
const processAllJSONFiles = require('./routes/insertQuestions'); // Import topic insertion function

// Initialize PostgreSQL client
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

// Define SQL file paths dynamically
const sqlFiles = [
    path.join(__dirname, 'db', 'question.sql'),
    path.join(__dirname, 'db', 'questions_folder.sql'),
    path.join(__dirname, 'db', 'topic_label.sql')
];

// Function to execute SQL files
const runSQLFile = async (filePath) => {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Error: File not found - ${filePath}`);
        return;
    }
    try {
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`✅ Executed ${filePath} successfully`);
    } catch (err) {
        console.error(`❌ Error executing ${filePath}:`, err.message);
    }
};

// Main function to connect to DB and run setup
const main = async () => {
    try {
        await client.connect();
        console.log('✅ Connected to the database');

        // Run SQL scripts
        for (const file of sqlFiles) {
            await runSQLFile(file);
        }

        // Run topic insertion from insertTopics.js
        await processAllSubjects();

        // Run question insertion from insertQuestions.js
        await processAllJSONFiles();

        console.log('🚀 Database setup completed');
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
    } finally {
        await client.end();
        console.log('🔌 Disconnected from the database');
    }
};


// Execute the script
main();

module.exports = client;
