import { Request, Response } from "express";
import { pool } from "../../config/db";
import {
    DEFAULT_SECURITY_SETTINGS,
    invalidateSecuritySettingsCache,
    normalizeSecuritySettingsInput,
} from "../../utils/securitySettings";

const SELECT_COLUMNS = `
    setting_id,
    minimum_password_length,
    require_uppercase,
    require_numbers,
    require_special_characters,
    maximum_login_attempts,
    lockout_minutes,
    session_timeout_minutes
`;

/**
 * GET SECURITY SETTINGS (spec 2.30)
 *
 * Returns the single active settings row. If the table has never been seeded
 * the built-in defaults are returned so the UI always has something to render.
 */
export const getSecuritySettings = async (
    _req: Request,
    res: Response
) => {
    try {
        const { rows } = await pool.query(`
            SELECT ${SELECT_COLUMNS}
            FROM security_settings
            ORDER BY setting_id ASC
            LIMIT 1
        `);

        return res.status(200).json({
            success: true,
            settings: rows[0] ?? DEFAULT_SECURITY_SETTINGS,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch security settings.",
        });
    }
};

/**
 * UPDATE SECURITY SETTINGS (spec 2.30)
 *
 * The payload is clamped to safe bounds before it is written, and the shared
 * settings cache is invalidated so the new policy takes effect on the next
 * authentication attempt.
 */
export const updateSecuritySettings = async (
    req: Request,
    res: Response
) => {
    try {
        const input = normalizeSecuritySettingsInput(req.body ?? {});

        const params = [
            input.minimum_password_length,
            input.require_uppercase,
            input.require_numbers,
            input.require_special_characters,
            input.maximum_login_attempts,
            input.lockout_minutes,
            input.session_timeout_minutes,
        ];

        // Upsert the single settings row without assuming a fixed id.
        const existing = await pool.query(
            `SELECT setting_id FROM security_settings ORDER BY setting_id ASC LIMIT 1`
        );

        let rows;

        if (existing.rows.length === 0) {
            ({ rows } = await pool.query(
                `
                INSERT INTO security_settings
                    (minimum_password_length, require_uppercase, require_numbers,
                     require_special_characters, maximum_login_attempts,
                     lockout_minutes, session_timeout_minutes)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING ${SELECT_COLUMNS}
                `,
                params
            ));
        } else {
            ({ rows } = await pool.query(
                `
                UPDATE security_settings
                SET
                    minimum_password_length = $1,
                    require_uppercase = $2,
                    require_numbers = $3,
                    require_special_characters = $4,
                    maximum_login_attempts = $5,
                    lockout_minutes = $6,
                    session_timeout_minutes = $7
                WHERE setting_id = $8
                RETURNING ${SELECT_COLUMNS}
                `,
                [...params, existing.rows[0].setting_id]
            ));
        }

        invalidateSecuritySettingsCache();

        return res.status(200).json({
            success: true,
            message: "Security settings updated successfully.",
            settings: rows[0],
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to update security settings.",
        });
    }
};
