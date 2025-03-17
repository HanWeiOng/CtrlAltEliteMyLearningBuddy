CREATE TABLE IF NOT EXISTS topic_labelling (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    topic_name VARCHAR(255) NOT NULL,
    sub_topic VARCHAR(255) NOT NULL,
    description TEXT NOT NULL
);
