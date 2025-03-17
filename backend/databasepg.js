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
    path.join(__dirname, 'db', 'questions_folder.sql'),
    path.join(__dirname, 'db', 'topic_label.sql') // Ensure topic_label.sql creates correct table
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

// Function to insert structured JSON data into topic_labelling
const insertJSONData = async () => {
    try {
        const jsonFilePath = path.join(__dirname, 'topic', 'combinedbio.json'); // Path to JSON file
        if (!fs.existsSync(jsonFilePath)) {
            console.error('❌ JSON file not found:', jsonFilePath);
            return;
        }

        // Read and parse JSON file
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const parsedJSON = JSON.parse(jsonData);

        // Extract topics and insert into PostgreSQL
        for (const [topicName, topicData] of Object.entries(parsedJSON)) {
            if (!topicData.learning_outcomes) continue;

            for (const outcome of topicData.learning_outcomes) {
                const subTopic = outcome.sub_topic || 'Unknown';
                const description = outcome.description || 'No description available';

                await client.query(
                    `INSERT INTO topic_labelling (subject, topic_name, sub_topic, description) 
                     VALUES ($1, $2, $3, $4) 
                     ON CONFLICT DO NOTHING;`,
                    ['Combined Science (Biology)', topicName, subTopic, description]
                );
            }
        }

        console.log('✅ JSON data inserted into topic_labelling');
    } catch (err) {
        console.error('❌ Error inserting JSON data:', err.message);
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

        // Insert JSON data into topic_labelling table
        await insertJSONData();

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
