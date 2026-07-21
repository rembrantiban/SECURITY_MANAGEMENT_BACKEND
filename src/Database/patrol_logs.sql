CREATE TABLE patrol_logs (
    patrol_log_id SERIAL PRIMARY KEY,

    schedule_id INT NOT NULL
        REFERENCES monitoring_schedules(schedule_id)
        ON DELETE CASCADE,

    user_id INT NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    area_patrolled VARCHAR(150) NOT NULL,

    patrol_start TIMESTAMP NOT NULL,

    patrol_end TIMESTAMP,

    observations TEXT,

    status VARCHAR(20)
        DEFAULT 'Pending'
        CHECK (
            status IN (
                'Pending',
                'Ongoing',
                'Completed',
                'Missed'
            )
        ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET TIME ZONE 'Asia/Manila';