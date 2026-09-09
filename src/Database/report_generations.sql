-- Reporting & Analytics Module (section 7)
--
-- `report_generations` : one row per report produced from the Reports Center.
--                        Backs the "Recent reports" list and the Audit Trail
--                        Report (7.6). Never updated after insert.

CREATE TYPE report_export_format AS ENUM (
    'PDF',
    'Excel'
);

CREATE TABLE report_generations (
    report_generation_id SERIAL PRIMARY KEY,

    report_key   VARCHAR(64)  NOT NULL,   -- 'incident' | 'visitor' | 'patrol' | ...
    report_ref   VARCHAR(16)  NOT NULL,   -- '7.1', '7.4', ...
    title        VARCHAR(120) NOT NULL,

    export_format report_export_format NOT NULL,

    date_from    DATE,
    date_to      DATE,
    range_label  VARCHAR(160) NOT NULL,
    record_count INTEGER,

    generated_by INTEGER
        REFERENCES users(user_id)
        ON DELETE SET NULL,
    generated_by_name VARCHAR(200),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_generations_created_at ON report_generations (created_at DESC);
CREATE INDEX idx_report_generations_key        ON report_generations (report_key);
