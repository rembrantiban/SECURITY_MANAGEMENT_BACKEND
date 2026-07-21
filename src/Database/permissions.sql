CREATE TABLE permissions (
    permission_id SERIAL PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL,
    permission_name VARCHAR(100) NOT NULL
);