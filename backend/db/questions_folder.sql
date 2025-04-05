-- Create the table only if it does not exist
CREATE TABLE IF NOT EXISTS questions_folder (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    folder_name VARCHAR(255) NOT NULL,
    subject VARCHAR(50) CHECK (subject IN ('Biology', 'Chemistry', 'Mathematics', 'History', 'English')),
    banding VARCHAR(50) CHECK (
        (subject = 'Mathematics' AND banding IN ('Math', 'E Math', 'A Math')) OR
        (subject IN ('Biology', 'Chemistry') AND banding IN ('Combined', 'Pure')) OR
        (subject IN ('History', 'English') AND banding IS NULL)
    ),
    level VARCHAR(50) CHECK (level IN ('PSLE', 'Lower Secondary', 'O Level', 'N Level')),
    question_ids JSONB NOT NULL,
    assigned_student INT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_valid_question_ids CHECK (jsonb_typeof(question_ids) = 'array')
);

-- Insert default data if not already present
-- INSERT INTO questions_folder (username, folder_name, subject, banding, level, question_ids) 
-- VALUES 
--     ('alice123', 'Algebra Basics', 'Mathematics', 'E Math', 'O Level', '[523, 532, 545]'::JSONB),
--     ('bob456', 'Science Essentials', 'Chemistry', 'Pure', 'Lower Secondary', '[528, 537, 556]'::JSONB),
--     ('charlie789', 'Historical Analysis', 'History', NULL, 'O Level', '[522, 531, 550]'::JSONB),
--     ('david001', 'English Vocabulary', 'English', NULL, 'PSLE', '[525, 539, 558]'::JSONB),
--     ('emma999', 'Space & Biology', 'Biology', 'Combined', 'N Level', '[526, 541, 552]'::JSONB)
-- ON CONFLICT (username, folder_name) DO NOTHING;
