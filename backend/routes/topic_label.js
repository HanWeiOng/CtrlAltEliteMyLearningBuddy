require('dotenv').config();
const { HfInference } = require("@huggingface/inference");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

require('events').EventEmitter.defaultMaxListeners = 20;

// Initialize Hugging Face Inference API
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// PostgreSQL Client Setup (Keep Connection Open)
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

// Connect to the database once at startup
client.connect().then(() => {
    console.log("✅ Connected to PostgreSQL");
}).catch(err => {
    console.error("❌ Database connection error:", err.message);
});

// File paths
//const jsonFilePath = "/Applications/MAMP/htdocs/YZ_ctrl-alt-elite/backend/routes/output_json/AES 2019_original.json";
//const updatedFilePath = "/Applications/MAMP/htdocs/YZ_ctrl-alt-elite/backend/routes/output_json/AES_2019_with_topics.json";

// Function to Fetch Topic Labels (No need to reconnect each time)
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

// Function to Calculate Cosine Similarity
const cosineSimilarity = (a, b) => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
};

// Function to Rank & Match Topics for Questions
const rankAndMatchTopics = async (jsonFilePath, updatedFilePath) => {
    try {

        console.log(`📂 Attempting to process file: ${jsonFilePath}`);
        //console.log(updatedFilePath)

        // Read the JSON file
        const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
        //console.log("This is jsonData in topic_label.js",jsonData)

        // Fetch topics from the database
        const documents = await fetchTopicLabels();

        //console.log("This is documents in topic_label.js", documents)

        // Process each question
        for (let question of jsonData) {
            if (!question.question_text) continue;

            // Get embeddings for question & topics
            const embeddings = await hf.featureExtraction({
                model: "sentence-transformers/all-MiniLM-L6-v2",
                inputs: [question.question_text, ...documents.map(d => d.text)] 
            });

            // Extract question embedding
            const questionEmbedding = embeddings[0];

            // Compute cosine similarity scores
            const scores = embeddings.slice(1).map((embedding, index) => ({
                sub_topic: documents[index].sub_topic, 
                score: cosineSimilarity(questionEmbedding, embedding)
            }));

            // Sort scores in descending order
            scores.sort((a, b) => b.score - a.score);

            // Assign best-matching topic (Only Subtopic in JSON)
            question.topic_label = scores.length > 0 ? scores[0].sub_topic : "Unknown"
            console.log("I died here 5");
        }

        console.log("I am here.")

        // Save updated JSON file
        fs.writeFileSync(updatedFilePath, JSON.stringify(jsonData, null, 4));
        console.log(`✅ Updated JSON saved to: ${updatedFilePath}`);
    } catch (err) {
        console.error("❌ Error processing questions:", err.message);
    }
};

// Execute the function
//rankAndMatchTopics();


// Function to Get the Latest JSON File in a Directory
const getLatestJsonFile = (dir) => {
    if (!fs.existsSync(dir)) {
        console.error(`❌ Directory does not exist: ${dir}`);
        return null;
    }

    const files = fs.readdirSync(dir)
        .filter(file => file.endsWith("_original.json"))
        .map(file => ({ file, time: fs.statSync(path.join(dir, file)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time); // Sort by latest

    if (files.length === 0) {
        console.error(`❌ No matching JSON file found in: ${dir}`);
        return null;
    }

    console.log(`✅ Found latest JSON file: ${files[0].file}`);
    return path.join(dir, files[0].file);
};


const executeTopicLabel = async () => {
    // Set the directory where JSON files are stored
    const jsonDir = "routes/output_json";
    const latestFilePath = getLatestJsonFile(jsonDir);

    if (latestFilePath) {
        const updatedFilePath = latestFilePath.replace("_original.json", "_with_topics.json");
        console.log(`📂 Processing file: ${latestFilePath}`);
        await rankAndMatchTopics(latestFilePath, updatedFilePath);
    } else {
        console.error("❌ No matching JSON file found in directory.");
    }
    process.on("exit", () => {
        client.end().then(() => console.log("🔌 Database connection closed."));
    });

}

//executeTopicLabel();

module.exports = { executeTopicLabel };
// Gracefully close the database connection when the script exits
