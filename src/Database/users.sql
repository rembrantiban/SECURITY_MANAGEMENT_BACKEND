CREATE TYPE user_role AS ENUM (
    'Administrator',
    'Security Personnel',
    'IT System Administrator',
    'Authorized Staff'
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
    status BOOLEAN DEFAULT TRUE,
    on_duty BOOLEAN DEFAULT FALSE,
    duty_start TIMESTAMP NULL,
    duty_end TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);