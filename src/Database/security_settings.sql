CREATE TABLE security_settings (
    setting_id SERIAL PRIMARY KEY,
    minimum_password_length INTEGER DEFAULT 8,
    require_uppercase BOOLEAN DEFAULT TRUE,
    require_numbers BOOLEAN DEFAULT TRUE,
    require_special_characters BOOLEAN DEFAULT TRUE,
    maximum_login_attempts INTEGER DEFAULT 5,
    lockout_minutes INTEGER DEFAULT 30,
    session_timeout_minutes INTEGER DEFAULT 30
);

INSERT INTO security_settings DEFAULT VALUES;