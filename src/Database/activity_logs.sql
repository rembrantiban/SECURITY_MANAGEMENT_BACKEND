

CREATE TYPE activity_action AS ENUM (
    'Login',
    'Logout',
    'Visitor Request',
    'Incident Report'
);

CREATE TABLE activity_logs (
    activity_id   SERIAL PRIMARY KEY,

    user_id       INTEGER
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    action        activity_action NOT NULL,

    reference     VARCHAR(100),
    detail        TEXT,
    ip_address    VARCHAR(64),

    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user    ON activity_logs (user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs (created_at);
CREATE INDEX idx_activity_logs_action  ON activity_logs (action);
