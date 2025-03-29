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

// Function to insert structured JSON data into `topic_labelling`
const insertJSONData = async (jsonFileName) => {
    try {
        const jsonFilePath = path.join(__dirname, '../topic', jsonFileName);
        if (!fs.existsSync(jsonFilePath)) {
            console.error('❌ JSON file not found:', jsonFilePath);
            return;
        }

        // Extract subject name from filename (e.g., "physics.json" → "Physics")
        const subjectName = jsonFileName.replace(".json", "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        // Read and parse JSON file
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const parsedJSON = JSON.parse(jsonData);

        // Insert topics into PostgreSQL
        for (const [topicName, topicData] of Object.entries(parsedJSON)) {
            if (!topicData.learning_outcomes) continue;

            for (const outcome of topicData.learning_outcomes) {
                const subTopic = outcome.sub_topic || 'Unknown';
                const description = outcome.description || 'No description available';

                await client.query(
                    `INSERT INTO topic_labelling (subject, topic_name, sub_topic, description) 
                     VALUES ($1, $2, $3, $4) 
                     ON CONFLICT DO NOTHING;`,
                    [subjectName, topicName, subTopic, description]
                );
            }
        }

        console.log(`✅ JSON data inserted for subject: ${subjectName}`);
    } catch (err) {
        console.error('❌ Error inserting JSON data:', err.message);
    }
};

// Function to process all JSON files in /topic/ folder
const processAllSubjects = async () => {
    try {
        await client.connect();
        console.log('✅ Connected to the database');

        // Read all JSON files in the "topic" directory
        const topicFolder = path.join(__dirname, '../topic');
        const jsonFiles = fs.readdirSync(topicFolder).filter(file => file.endsWith(".json"));

        // Insert each subject dynamically
        for (const jsonFile of jsonFiles) {
            await insertJSONData(jsonFile);
        }

        console.log('🚀 All topics inserted successfully');
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
    } finally {
        await client.end();
        console.log('🔌 Disconnected from the database');
    }
};

// Export the function for reuse
module.exports = processAllSubjects;

// Run the script if executed directly
if (require.main === module) {
    processAllSubjects();
}