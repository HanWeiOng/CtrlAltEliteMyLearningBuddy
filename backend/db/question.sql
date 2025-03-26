CREATE TABLE IF NOT EXISTS question (
    id SERIAL PRIMARY KEY,
    paper_name VARCHAR(255),
    subject VARCHAR(50),
    banding VARCHAR(50),
    level VARCHAR(50),
    page_number INT,
    question_number INT,
    question_text TEXT,
    answer_options JSONB,
    image_paths JSONB,
    topic_label TEXT,
    answer_key VARCHAR(255)
);
