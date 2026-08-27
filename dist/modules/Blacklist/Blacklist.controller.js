"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFromBlacklist = exports.getBlacklist = exports.addToBlacklist = void 0;
const db_1 = require("../../config/db");
const addToBlacklist = async (req, res) => {
    try {
        if (req.user?.role !== "Administrator") {
            res.status(403).json({
                success: false,
                message: "Only Administrators can blacklist visitors.",
            });
            return;
        }
        const { first_name, middle_name, last_name, reason } = req.body;
        const blacklisted_by = req.user?.user_id;
        if (!first_name || !last_name || !reason) {
            res.status(400).json({
                success: false,
                message: "First name, last name, and reason are required.",
            });
            return;
        }
        const result = await db_1.pool.query(`
            INSERT INTO visitor_blacklist
            (
                first_name,
                middle_name,
                last_name,
                reason,
                blacklisted_by
            )
            VALUES
            (
                $1,$2,$3,$4,$5
            )
            RETURNING *
            `, [
            first_name,
            middle_name || null,
            last_name,
            reason,
            blacklisted_by,
        ]);
        res.status(201).json({
            success: true,
            message: "Visitor blacklisted successfully.",
            entry: result.rows[0],
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to blacklist visitor.",
        });
    }
};
exports.addToBlacklist = addToBlacklist;
const getBlacklist = async (req, res) => {
    try {
        const result = await db_1.pool.query(`
            SELECT
                vb.blacklist_id,
                vb.first_name,
                vb.middle_name,
                vb.last_name,
                vb.reason,
                vb.is_active,
                vb.created_at,

                vb.blacklisted_by,
                CASE
                    WHEN admin.user_id IS NULL THEN NULL
                    ELSE CONCAT(admin.first_name, ' ', admin.last_name)
                END AS blacklisted_by_name

            FROM visitor_blacklist vb

            LEFT JOIN users admin
                ON admin.user_id = vb.blacklisted_by

            WHERE vb.is_active = true

            ORDER BY vb.created_at DESC
            `);
        res.status(200).json({
            success: true,
            total: result.rowCount,
            blacklist: result.rows,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch blacklist.",
        });
    }
};
exports.getBlacklist = getBlacklist;
const removeFromBlacklist = async (req, res) => {
    try {
        if (req.user?.role !== "Administrator") {
            res.status(403).json({
                success: false,
                message: "Only Administrators can update the blacklist.",
            });
            return;
        }
        const { blacklist_id } = req.params;
        const result = await db_1.pool.query(`
            UPDATE visitor_blacklist
            SET
                is_active = false,
                updated_at = CURRENT_TIMESTAMP
            WHERE blacklist_id = $1
            RETURNING *
            `, [blacklist_id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Blacklist entry not found.",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Visitor removed from blacklist successfully.",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to update blacklist.",
        });
    }
};
exports.removeFromBlacklist = removeFromBlacklist;
