CREATE TABLE monitoring_schedules (
    schedule_id SERIAL PRIMARY KEY,

    user_id INT NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    assigned_by INT
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    assigned_area VARCHAR(150) NOT NULL,

    schedule_date DATE NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    status VARCHAR(20)
        DEFAULT 'Pending'
        CHECK (
            status IN (
                'Pending',
                'Ongoing',
                'Completed',
                'Cancelled'
            )
        ),

    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);