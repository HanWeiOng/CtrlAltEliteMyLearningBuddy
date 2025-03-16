require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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
    path.join(__dirname, 'db', 'questions_folder.sql')
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
        console.error(`❌ Error executing ${filePath}:`, err);
    }
};

// Connect to the database and execute SQL files
client.connect(async (err) => {
    if (err) {
        console.error('❌ Database connection error:', err.stack);
    } else {
        console.log('✅ Connected to the database');

        // Run SQL scripts
        for (const file of sqlFiles) {
            await runSQLFile(file);
        }

        console.log('🚀 Database setup completed');
    }
});

module.exports = client;
