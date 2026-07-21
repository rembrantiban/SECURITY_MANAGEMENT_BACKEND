CREATE TABLE role_permissions (
    role_permission_id SERIAL PRIMARY KEY,

    role user_role NOT NULL,

    permission_id INTEGER NOT NULL
        REFERENCES permissions(permission_id)
        ON DELETE CASCADE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(role, permission_id)
);