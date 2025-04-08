CREATE TABLE question_answer_table (
    id SERIAL PRIMARY KEY,
    question_id INT,
    answer_option VARCHAR(50),
    answer_text VARCHAR(255),
    selected_option_count INT DEFAULT 0,
    correctness BOOLEAN,
    paper_id INT,
    topic_label VARCHAR(255),
    CONSTRAINT unique_question_answer_paper UNIQUE (question_id, answer_option, paper_id);
)