CREATE OR REPLACE FUNCTION update_incident_updated_at()
RETURNS TRIGGER
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE incident_reports (
    incident_id SERIAL PRIMARY KEY,
    incident_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL
        CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    location VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    incident_image TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending'
        CHECK (
            status IN (
                'Pending',
                'In Progress',
                'Resolved',
                'Closed',
                'Archived'   -- legacy value, kept for old rows; new flow uses is_archived
            )
        ),

    -- Archiving no longer touches `status`. An archived incident keeps its real
    -- status (Resolved / Closed) and is simply hidden from the active list.
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,

    note TEXT,
    reported_by INTEGER NOT NULL,
    assigned_to INTEGER,
    assigned_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reported_by
        FOREIGN KEY (reported_by)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assigned_to
        FOREIGN KEY (assigned_to)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_assigned_by
        FOREIGN KEY (assigned_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE TRIGGER trg_update_incident_updated_at
BEFORE UPDATE ON incident_reports
FOR EACH ROW
EXECUTE FUNCTION update_incident_updated_at();

CREATE INDEX idx_incident_reported_by
ON incident_reports(reported_by);

CREATE INDEX idx_incident_assigned_to
ON incident_reports(assigned_to);

CREATE INDEX idx_incident_status
ON incident_reports(status);

CREATE INDEX idx_incident_created_at
ON incident_reports(created_at DESC);

CREATE INDEX idx_incident_is_archived
ON incident_reports(is_archived);

-- ------------------------------------------------------------------
-- Migration for existing databases
-- ------------------------------------------------------------------
ALTER TABLE incident_reports
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Move any legacy status = 'Archived' rows onto the flag. Their original
-- status was lost when they were archived, so settle them as 'Closed'.
UPDATE incident_reports
SET is_archived = TRUE,
    status = 'Closed'
WHERE status = 'Archived';

CREATE INDEX IF NOT EXISTS idx_incident_is_archived
    ON incident_reports(is_archived);