CREATE TABLE student_attempt_quiz_table (
    id SERIAL PRIMARY KEY,
    student_id INT,
    folder_id INT,
    completed BOOLEAN,
    student_score NUMERIC(5,2),
    student_name VARCHAR(255)
);