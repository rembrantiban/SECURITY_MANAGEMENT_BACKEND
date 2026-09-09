CREATE TYPE user_role AS ENUM (
    'Administrator',
    'Security Personnel',
    'IT System Administrator',
    'Authorized Staff'
);

CREATE TYPE account_approval_status AS ENUM (
    'Pending',
    'Approved',
    'Rejected'
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,

    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,

    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,

    role user_role NOT NULL,

    approval_status account_approval_status
        NOT NULL
        DEFAULT 'Pending',

    status BOOLEAN NOT NULL DEFAULT TRUE,
    on_duty BOOLEAN NOT NULL DEFAULT FALSE,

    -- Login lockout state, driven by security_settings (spec 2.30)
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    lockout_until TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Migration for existing databases:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMP;

-- Set database timezone
SET TIME ZONE 'Asia/Manila';