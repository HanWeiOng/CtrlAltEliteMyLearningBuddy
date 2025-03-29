// topicLabelling.js

require('dotenv').config();
const { HfInference } = require("@huggingface/inference");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

require('events').EventEmitter.defaultMaxListeners = 20;

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

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

client.connect().then(() => {
    console.log("✅ Connected to PostgreSQL");
}).catch(err => {
    console.error("❌ Database connection error:", err.message);
});

const fetchTopicLabels = async () => {
    try {
        const result = await client.query("SELECT topic_name, sub_topic, description FROM topic_labelling");
        return result.rows.map(row => ({
            sub_topic: row.sub_topic,
            text: `${row.sub_topic}: ${row.description}`
        }));
    } catch (err) {
        console.error("❌ Error fetching topic labels:", err.message);
        return [];
    }
};

const cosineSimilarity = (a, b) => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
};

const rankAndMatchTopics = async (jsonFilePath, updatedFilePath) => {
    try {
        const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
        const documents = await fetchTopicLabels();

        for (let question of jsonData) {
            if (!question.question_text) continue;

            const embeddings = await hf.featureExtraction({
                model: "sentence-transformers/all-MiniLM-L6-v2",
                inputs: [question.question_text, ...documents.map(d => d.text)]
            });

            const questionEmbedding = embeddings[0];

            const scores = embeddings.slice(1).map((embedding, index) => ({
                sub_topic: documents[index].sub_topic,
                score: cosineSimilarity(questionEmbedding, embedding)
            }));

            scores.sort((a, b) => b.score - a.score);
            question.topic_label = scores.length > 0 ? scores[0].sub_topic : "Unknown";
        }

        fs.writeFileSync(updatedFilePath, JSON.stringify(jsonData, null, 4));
        console.log(`✅ Updated JSON saved to: ${updatedFilePath}`);
    } catch (err) {
        console.error("❌ Error processing questions:", err.message);
    }
};

const getLatestJsonFile = (dir) => {
    if (!fs.existsSync(dir)) {
        console.error(`❌ Directory does not exist: ${dir}`);
        return null;
    }

    const files = fs.readdirSync(dir)
        .filter(file => file.endsWith("_structured_output.json"))
        .map(file => ({ file, time: fs.statSync(path.join(dir, file)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
        console.error(`❌ No matching JSON file found in: ${dir}`);
        return null;
    }

    console.log(`✅ Found latest JSON file: ${files[0].file}`);
    return path.join(dir, files[0].file);
};

const topicLabelling = async () => {
    const jsonDir = path.join(__dirname, 'output');
    const latestFilePath = getLatestJsonFile(jsonDir);

    if (latestFilePath) {
        const updatedFilePath = latestFilePath.replace("_structured_output.json", "_with_topics.json");
        await rankAndMatchTopics(latestFilePath, updatedFilePath);
    } else {
        console.error("❌ No matching JSON file found in directory.");
    }

    process.on("exit", () => {
        client.end().then(() => console.log("🔌 Database connection closed."));
    });
};

module.exports = { topicLabelling };