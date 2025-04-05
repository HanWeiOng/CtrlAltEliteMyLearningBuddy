// topicLabelling.js
require('dotenv').config();
const { HfInference } = require("@huggingface/inference");
const { Client } = require("pg");

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
    const result = await client.query(
      "SELECT topic_name, sub_topic, description FROM topic_labelling"
    );
    return result.rows.map(row => ({
      sub_topic: row.sub_topic,
      text: `${row.sub_topic}: ${row.description}`,
      description: row.description
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

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const safeFeatureExtraction = async (model, inputs, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await hf.featureExtraction({ model, inputs });
    } catch (err) {
      console.warn(`⚠️ Attempt ${i + 1} failed: ${err.message}`);
      console.warn(err.stack);
      if (i === retries - 1) {
        console.error("❌ Final attempt failed, skipping this input.");
        return null;
      }
      await sleep(1000);
    }
  }
};

const topicLabelling = async (jsonData) => {
  try {
    const documents = await fetchTopicLabels();
    if (!documents || documents.length === 0) {
      console.error("❌ No topic labels available.");
      return jsonData;
    }

    const topicDescriptions = documents.map(d => d.description);
    const topicEmbeddings = await safeFeatureExtraction("sentence-transformers/all-MiniLM-L6-v2", topicDescriptions);

    if (!topicEmbeddings || topicEmbeddings.length !== documents.length) {
      console.error("❌ Failed to embed all topic descriptions.");
      return jsonData;
    }

    for (let question of jsonData.questions) {
      if (!question.question_text || typeof question.question_text !== "string") {
        console.warn("⚠️ Skipping invalid question_text:", question);
        continue;
      }

      try {
        console.log(`🔍 Getting embedding for Q${question.question_number}:`, question.question_text);
        const qEmbed = await safeFeatureExtraction("sentence-transformers/all-MiniLM-L6-v2", [question.question_text]);
        if (!qEmbed || qEmbed.length !== 1) {
          console.warn("⚠️ Invalid embedding returned for question:", question.question_text);
          continue;
        }

        const scores = topicEmbeddings.map((embedding, index) => ({
          sub_topic: documents[index].sub_topic,
          description: documents[index].description,
          score: cosineSimilarity(qEmbed[0], embedding)
        }));

        scores.sort((a, b) => b.score - a.score);

        if (scores.length > 0) {
          question.topic_label = scores[0].sub_topic;
          question.topic_description = scores[0].description;
        } else {
          question.topic_label = "Unknown";
          question.topic_description = null;
        }

        console.log(`🏷️  Q${question.question_number} tagged as: ${question.topic_label}`);
      } catch (embedErr) {
        console.error(`❌ Hugging Face API error for Q${question.question_number}:`, embedErr.message);
        continue;
      }

      await sleep(200);
    }

    return jsonData;
  } catch (err) {
    console.error("❌ Error processing questions:", err.message);
    throw err;
  }
};

module.exports = { topicLabelling };