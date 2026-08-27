CREATE TABLE access_requests (
    request_id SERIAL PRIMARY KEY,

    request_number VARCHAR(30) UNIQUE NOT NULL,

    -- User who submitted the request
    requested_by INTEGER NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,

    id_type VARCHAR(100),

    -- Optional uploaded ID image (Cloudinary URL)
    id_image TEXT,

    purpose TEXT NOT NULL,

    status VARCHAR(20)
        DEFAULT 'Pending'
        CHECK (
            status IN (
                'Pending',
                'Approved',
                'Rejected'
            )
        ),

    approved_by INTEGER
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    approved_at TIMESTAMP,

    -- When the visitor was recorded as having left the premises
    checked_out_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);