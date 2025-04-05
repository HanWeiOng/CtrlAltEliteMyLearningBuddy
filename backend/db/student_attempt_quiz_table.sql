CREATE TABLE student_attempt_quiz_table (
    id SERIAL PRIMARY KEY,
    student_id INT,
    folder_id INT,
    question_id INT,
    answer_text VARCHAR(255),
    answer_option VARCHAR(50),
    correctness VARCHAR(50)
);
