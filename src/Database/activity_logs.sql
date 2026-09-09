

CREATE TYPE activity_action AS ENUM (
    'Login',
    'Logout',
    'Register',
    'Incident Report',
    'Visitor Request',
    'Access Request',
    'Monitoring',
    'Patrol'
);

-- Migration for existing databases:
-- ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'Register';
-- ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'Access Request';
-- ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'Monitoring';
-- ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'Patrol';

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
