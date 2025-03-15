CREATE TABLE question (
    id SERIAL PRIMARY KEY,
    paper_name VARCHAR(255),
    page_number INT,
    question_number INT,
    question_text TEXT,
    answer_options JSONB,
    image_paths JSONB,
    topic_label text,
    answer_key VARCHAR(255)

);