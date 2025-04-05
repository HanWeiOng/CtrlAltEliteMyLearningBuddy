CREATE TABLE IF NOT EXISTS questions (
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
    question_wrong INT DEFAULT 0,
    question_attempt_count INT DEFAULT 0,
    question_difficulty DECIMAL(3,2) GENERATED ALWAYS AS (
        CASE 
            WHEN question_attempt_count = 0 THEN 0 
            ELSE question_wrong::numeric / question_attempt_count 
        END
    ) STORED
);


