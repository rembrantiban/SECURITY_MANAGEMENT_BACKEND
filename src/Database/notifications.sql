-- Notification Management Module
--
-- `notifications`            : one row per alert / broadcast / scheduled message
-- `notification_recipients`  : fan-out row per recipient, with read / acknowledge state

CREATE TYPE notification_type AS ENUM (
    'Alert',        -- 9.1 system alert
    'Emergency',    -- 9.2 emergency broadcast
    'Info'          -- general notice
);

CREATE TYPE notification_audience AS ENUM (
    'All',                  -- every Security Personnel + Authorized Staff
    'Security Personnel',
    'Authorized Staff'
);

CREATE TYPE notification_status AS ENUM (
    'Scheduled',
    'Sent'
);

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,

    title    VARCHAR(160) NOT NULL,
    message  TEXT NOT NULL,

    type      notification_type     NOT NULL DEFAULT 'Info',
    audience  notification_audience NOT NULL DEFAULT 'All',
    status    notification_status   NOT NULL DEFAULT 'Sent',

    scheduled_for TIMESTAMP,   -- 9.3 : delivery time for scheduled notifications
    sent_at       TIMESTAMP,   -- when it was actually delivered

    created_by INTEGER
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_recipients (
    id SERIAL PRIMARY KEY,

    notification_id INTEGER NOT NULL
        REFERENCES notifications(notification_id)
        ON DELETE CASCADE,

    user_id INTEGER NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    read_at         TIMESTAMP,   -- 9.5 / 9.8 received & opened
    acknowledged_at TIMESTAMP,   -- 9.6 / 9.9 acknowledged

    UNIQUE (notification_id, user_id)
);

CREATE INDEX idx_notif_recipients_user   ON notification_recipients (user_id);
CREATE INDEX idx_notif_recipients_notif  ON notification_recipients (notification_id);
CREATE INDEX idx_notif_status_scheduled  ON notifications (status, scheduled_for);
CREATE INDEX idx_notif_created_at        ON notifications (created_at);
