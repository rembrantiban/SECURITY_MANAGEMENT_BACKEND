"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSecuritySettings = exports.getSecuritySettings = void 0;
const db_1 = require("../../config/db");
/**
 * GET SECURITY SETTINGS
 */
const getSecuritySettings = async (req, res) => {
    try {
        const { rows } = await db_1.pool.query(`
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
            LIMIT 1
        `);
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Security settings not found.",
            });
        }
        return res.status(200).json({
            success: true,
            settings: rows[0],
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch security settings.",
        });
    }
};
exports.getSecuritySettings = getSecuritySettings;
/**
 * UPDATE SECURITY SETTINGS
 */
const updateSecuritySettings = async (req, res) => {
    try {
        const { minimum_password_length, require_uppercase, require_numbers, require_special_characters, maximum_login_attempts, lockout_minutes, session_timeout_minutes, } = req.body;
        const { rows } = await db_1.pool.query(`
            UPDATE security_settings
            SET
                minimum_password_length = $1,
                require_uppercase = $2,
                require_numbers = $3,
                require_special_characters = $4,
                maximum_login_attempts = $5,
                lockout_minutes = $6,
                session_timeout_minutes = $7
            WHERE setting_id = 1

            RETURNING *;
            `, [
            minimum_password_length,
            require_uppercase,
            require_numbers,
            require_special_characters,
            maximum_login_attempts,
            lockout_minutes,
            session_timeout_minutes,
        ]);
        return res.status(200).json({
            success: true,
            message: "Security settings updated successfully.",
            settings: rows[0],
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to update security settings.",
        });
    }
};
exports.updateSecuritySettings = updateSecuritySettings;
