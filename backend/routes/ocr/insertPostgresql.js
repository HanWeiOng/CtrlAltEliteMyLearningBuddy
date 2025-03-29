// insertPostgresql.js

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ✅ Initialize PostgreSQL client
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

// ✅ Function to Insert JSON Data into PostgreSQL
const insertJSONData = async (jsonFileName) => {
    try {
        const jsonFilePath = path.join(__dirname, '../routes/output/', jsonFileName);
        if (!fs.existsSync(jsonFilePath)) {
            console.error('❌ JSON file not found:', jsonFilePath);
            return;
        }

        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const parsedJSON = JSON.parse(jsonData);

        // Extract paper metadata from the first object
        const { paperName, subject, banding, level } = parsedJSON[0];

        const fullPaperName = `${paperName}_${subject}_${banding}_${level}`.replace(/\\s+/g, '_');

        for (const item of parsedJSON) {
            await client.query(
                `INSERT INTO question (paper_name, page_number, question_number, question_text, answer_options, image_paths, topic_label, answer_key, subject, banding, level)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 ON CONFLICT DO NOTHING;`,
                [
                    fullPaperName,
                    item.page_number,
                    item.question_number,
                    item.question_text,
                    JSON.stringify(item.answer_options || []),
                    JSON.stringify(item.image_path || []),
                    item.topic_label || 'Unknown',
                    item.answer_key,
                    item.subject,
                    item.banding,
                    item.level
                ]
            );
        }

        console.log(`✅ JSON data inserted successfully from: ${jsonFileName}`);
    } catch (err) {
        console.error('❌ Error inserting JSON data:', err.message);
    }
};


// ✅ Function to Process All JSON Files in `/data/` Folder
const processAllJSONFiles = async () => {
    try {
        await client.connect();
        console.log('✅ Connected to the database');

        // Read all JSON files in the "data" directory
        const dataFolder = path.join(__dirname, '../routes/output/');
        const jsonFiles = fs.readdirSync(dataFolder).filter(file => file.endsWith(".json"));

        // Insert each JSON file dynamically
        for (const jsonFile of jsonFiles) {
            await insertJSONData(jsonFile);
        }

        console.log('🚀 All JSON data inserted successfully');
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
    } finally {
        await client.end();
        console.log('🔌 Disconnected from the database');
    }
};

// ✅ Export Function for Reuse
module.exports = processAllJSONFiles;

// ✅ Run the Script if Executed Directly
if (require.main === module) {
    processAllJSONFiles();
}
