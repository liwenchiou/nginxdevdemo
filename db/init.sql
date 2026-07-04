CREATE TABLE IF NOT EXISTS page_visits (
    id SERIAL PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
);

-- Initialize the counter to 0
INSERT INTO page_visits (count) VALUES (0);
