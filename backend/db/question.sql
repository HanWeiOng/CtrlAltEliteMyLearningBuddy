CREATE TABLE IF NOT EXISTS question (
    id SERIAL PRIMARY KEY,
    paper_name VARCHAR(255),
    subject VARCHAR(255),  -- Changed to match the first table
    banding VARCHAR(50),
    level VARCHAR(50),
    page_number INT,
    question_number INT,
    question_text TEXT,
    answer_options JSONB,
    image_paths JSONB,  -- Keeping JSONB as per the second table
    topic_label TEXT,
    answer_key VARCHAR(255)
);
