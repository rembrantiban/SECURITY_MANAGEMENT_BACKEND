import { pool } from "../config/db";

/**
 * Authentication & Account Security Settings (spec 2.30).
 *
 * A single row in `security_settings` drives the system-wide password policy,
 * login lockout thresholds, and session lifetime. The IT / System Administrator
 * maintains it from the Security Settings screen; every auth path reads it here.
 */

export interface SecuritySettings {
    setting_id: number;
    minimum_password_length: number;
    require_uppercase: boolean;
    require_numbers: boolean;
    require_special_characters: boolean;
    maximum_login_attempts: number;
    lockout_minutes: number;
    session_timeout_minutes: number;
}

/** Values used when the row is missing or the table has not been provisioned. */
export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
    setting_id: 1,
    minimum_password_length: 8,
    require_uppercase: true,
    require_numbers: true,
    require_special_characters: true,
    maximum_login_attempts: 5,
    lockout_minutes: 30,
    session_timeout_minutes: 30,
};

const CACHE_TTL_MS = 30_000;

let cache: { value: SecuritySettings; expiresAt: number } | null = null;

/**
 * Fetch the active settings, cached briefly so hot auth paths do not hit the
 * database on every request. `invalidateSecuritySettingsCache()` is called by
 * the update endpoint so changes take effect immediately.
 */
export async function getSecuritySettings(): Promise<SecuritySettings> {
    if (cache && cache.expiresAt > Date.now()) {
        return cache.value;
    }

    try {
        const { rows } = await pool.query<SecuritySettings>(
            `
            SELECT
                setting_id,
                minimum_password_length,
                require_uppercase,
                require_numbers,
                require_special_characters,
                maximum_login_attempts,
                lockout_minutes,
                session_timeout_minutes
            FROM security_settings
            ORDER BY setting_id ASC
            LIMIT 1
            `
        );

        const value = rows[0] ?? DEFAULT_SECURITY_SETTINGS;
        cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
        return value;
    } catch (error) {
        console.error("Failed to load security settings, using defaults:", error);
        return DEFAULT_SECURITY_SETTINGS;
    }
}

export function invalidateSecuritySettingsCache(): void {
    cache = null;
}

/**
 * Validate a candidate password against the active policy.
 * Returns an error message when it fails, or `null` when it passes.
 */
export function validatePassword(
    password: string,
    settings: SecuritySettings
): string | null {
    if (!password || typeof password !== "string") {
        return "Password is required.";
    }

    if (password.length < settings.minimum_password_length) {
        return `Password must be at least ${settings.minimum_password_length} characters long.`;
    }

    if (settings.require_uppercase && !/[A-Z]/.test(password)) {
        return "Password must contain at least one uppercase letter.";
    }

    if (settings.require_numbers && !/[0-9]/.test(password)) {
        return "Password must contain at least one number.";
    }

    if (
        settings.require_special_characters &&
        !/[^A-Za-z0-9]/.test(password)
    ) {
        return "Password must contain at least one special character.";
    }

    return null;
}

/** Clamp an incoming settings payload to safe, sane bounds. */
export function normalizeSecuritySettingsInput(body: Record<string, unknown>) {
    const int = (value: unknown, fallback: number, min: number, max: number) => {
        const n = Math.trunc(Number(value));
        if (Number.isNaN(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    };

    const bool = (value: unknown, fallback: boolean) =>
        typeof value === "boolean" ? value : fallback;

    return {
        minimum_password_length: int(
            body.minimum_password_length,
            DEFAULT_SECURITY_SETTINGS.minimum_password_length,
            6,
            64
        ),
        require_uppercase: bool(body.require_uppercase, true),
        require_numbers: bool(body.require_numbers, true),
        require_special_characters: bool(
            body.require_special_characters,
            true
        ),
        maximum_login_attempts: int(
            body.maximum_login_attempts,
            DEFAULT_SECURITY_SETTINGS.maximum_login_attempts,
            3,
            10
        ),
        lockout_minutes: int(
            body.lockout_minutes,
            DEFAULT_SECURITY_SETTINGS.lockout_minutes,
            1,
            1440
        ),
        session_timeout_minutes: int(
            body.session_timeout_minutes,
            DEFAULT_SECURITY_SETTINGS.session_timeout_minutes,
            5,
            1440
        ),
    };
}
