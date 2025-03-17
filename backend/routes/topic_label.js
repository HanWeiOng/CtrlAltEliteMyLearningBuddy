require('dotenv').config();
const { HfInference } = require("@huggingface/inference");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Initialize Hugging Face Inference API
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// PostgreSQL Client Setup (Disable SSL)
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

// File paths
const jsonFilePath = "/Applications/MAMP/htdocs/YZ_ctrl-alt-elite/backend/routes/output_json/AES 2019_original.json";
const updatedFilePath = "/Applications/MAMP/htdocs/YZ_ctrl-alt-elite/backend/routes/output_json/AES_2019_with_topics.json";

// Function to Fetch Topic Labels from PostgreSQL (Use sub_topic + description for analysis)
const fetchTopicLabels = async () => {
    try {
        await client.connect();
        const result = await client.query("SELECT topic_name, sub_topic, description FROM topic_labelling");
        return result.rows.map(row => ({
            sub_topic: row.sub_topic,  // Used for returning in final JSON
            text: `${row.sub_topic}: ${row.description}` // Used for similarity ranking
        }));
    } catch (err) {
        console.error("❌ Error fetching topic labels:", err.message);
        return [];
    } finally {
        await client.end();
    }
};

// Function to Calculate Cosine Similarity
const cosineSimilarity = (a, b) => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
};

// Function to Rank & Match Topics for Questions
const rankAndMatchTopics = async () => {
    try {
        // Read the JSON file
        const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));

        // Fetch topics from the database
        const documents = await fetchTopicLabels();

        // Process each question
        for (let question of jsonData) {
            if (!question.question_text) continue;


            // Get embeddings for question & topics
            const embeddings = await hf.featureExtraction({
                model: "sentence-transformers/all-MiniLM-L6-v2",
                inputs: [question.question_text, ...documents.map(d => d.text)] // Use sub_topic + description for ranking
            });

            // Extract question embedding
            const questionEmbedding = embeddings[0];

            // Compute cosine similarity scores
            const scores = embeddings.slice(1).map((embedding, index) => ({
                sub_topic: documents[index].sub_topic, // Store only sub_topic for JSON output
                score: cosineSimilarity(questionEmbedding, embedding)
            }));

            // Sort scores in descending order
            scores.sort((a, b) => b.score - a.score);

            // Assign best-matching topic (Only Subtopic in JSON)
            question.topic_label = scores.length > 0 ? scores[0].sub_topic : "Unknown";

        }

        // Save updated JSON file
        fs.writeFileSync(updatedFilePath, JSON.stringify(jsonData, null, 4));
        console.log(`✅ Updated JSON saved to: ${updatedFilePath}`);
    } catch (err) {
        console.error("❌ Error processing questions:", err.message);
    }
};

// Execute the function
rankAndMatchTopics();
