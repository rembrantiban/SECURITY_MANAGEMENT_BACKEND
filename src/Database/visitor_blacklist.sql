CREATE TABLE visitor_blacklist (
    blacklist_id SERIAL PRIMARY KEY,

    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,

    reason TEXT NOT NULL,

    is_active BOOLEAN DEFAULT true,

    blacklisted_by INTEGER
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
