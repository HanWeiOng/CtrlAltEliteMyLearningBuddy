

// 🔧 insertPostgresql.js
require('dotenv').config();
const { Client } = require('pg');

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

const insertJSONPayload = async (parsedJSON) => {
    try {
        await client.connect();
        console.log('✅ Connected to the database');

        const { paper_name, subject, banding, level, questions } = parsedJSON;
        const fullPaperName = `${paper_name}_${subject}_${banding}_${level}`.replace(/\s+/g, '_');
        for (const item of questions) {
            // Extract only image_url(s) from image_path array
            const image_urls = (item.image_path || []).map(obj => obj.image_url);
            if (image_urls.length === 0) continue;
            const image_url_cleaned = image_urls[0]
                .replace(/\s+/g, '_')     // Replace spaces with underscores
                .replace(/\+/g, '_');     // Replace + with underscores

            console.log(`Extracted image URLs:`, image_urls);
            console.log(`Cleaned image URLs:`, image_url_cleaned);

            await client.query(
                `INSERT INTO questions (
                    paper_name, page_number, question_number, question_text,
                    answer_options, image_paths, topic_label, answer_key,
                    subject, banding, level
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 ON CONFLICT DO NOTHING;`,
                [
                    fullPaperName,
                    item.page_number,
                    item.question_number,
                    item.question_text,
                    JSON.stringify(item.answer_options || []),
                    image_url_cleaned, // ✅ Only URLs here
                    item.topic_label || 'Unknown',
                    item.answer_key?.correct_answer || "",
                    subject,
                    banding,
                    level
                ]
            );
        }

        console.log('🚀 All JSON data inserted successfully');
    } catch (err) {
        console.error('❌ Error inserting JSON data:', err.message);
        throw err;
    } finally {
        await client.end();
        console.log('🔌 Disconnected from the database');
    }
};

module.exports = insertJSONPayload;
