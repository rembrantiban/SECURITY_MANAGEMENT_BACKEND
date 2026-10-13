import { Request, Response } from "express";
import { pool } from "../../config/db";
import { logActivity } from "../Activity/Activity.controller";
import { findBlacklistMatch, toVisitorName } from "./Blacklist.service";

export const addToBlacklist = async (
    req: Request,
    res: Response
): Promise<void> => {
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

    const firstName = String(first_name).trim();
    const middleName =
        typeof middle_name === "string" && middle_name.trim() !== ""
            ? middle_name.trim()
            : null;
    const lastName = String(last_name).trim();

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `
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
            `,
            [
                firstName,
                middleName,
                lastName,
                reason,
                blacklisted_by,
            ]
        );

        /**
         * Reject the visitor's pending access requests.
         *
         * Uses the same name-matching rule as the blacklist screening in
         * createAccessRequest: first + last name (case-insensitive, trimmed),
         * and the middle name only when both sides carry one.
         */
        const rejected = await client.query(
            `
            UPDATE access_requests
            SET
                status = 'Rejected',
                approved_by = $4,
                approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE
                status = 'Pending'
                AND LOWER(TRIM(first_name)) = LOWER($1)
                AND LOWER(TRIM(last_name)) = LOWER($2)
                AND (
                    middle_name IS NULL
                    OR TRIM(middle_name) = ''
                    OR $3::text IS NULL
                    OR LOWER(TRIM(middle_name)) = LOWER($3)
                )
            RETURNING request_number
            `,
            [firstName, lastName, middleName, blacklisted_by]
        );

        await client.query("COMMIT");

        for (const row of rejected.rows) {
            logActivity(
                blacklisted_by,
                "Access Request",
                row.request_number,
                "rejected (visitor blacklisted)",
                req.ip ?? null
            );
        }

        const rejectedCount = rejected.rowCount ?? 0;

        res.status(201).json({
            success: true,
            message:
                rejectedCount > 0
                    ? `Visitor blacklisted successfully. ${rejectedCount} pending request(s) rejected.`
                    : "Visitor blacklisted successfully.",
            entry: result.rows[0],
            rejected_requests: rejected.rows.map((row) => row.request_number),
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to blacklist visitor.",
        });
    } finally {
        client.release();
    }
};

export const getBlacklist = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const result = await pool.query(
            `
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
            `
        );

        res.status(200).json({
            success: true,
            total: result.rowCount,
            blacklist: result.rows,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch blacklist.",
        });
    }
};

/**
 * Pre-submit screening used by the Register Visitor form so staff are told
 * a visitor is blacklisted before they submit. createAccessRequest still
 * enforces the same rule server-side.
 */
export const checkBlacklist = async (
    req: Request,
    res: Response
): Promise<void> => {
    const visitorName = toVisitorName(
        req.query.first_name,
        req.query.middle_name,
        req.query.last_name
    );

    if (!visitorName.firstName || !visitorName.lastName) {
        res.status(400).json({
            success: false,
            message: "First name and last name are required.",
        });
        return;
    }

    try {
        const match = await findBlacklistMatch(pool, visitorName);

        res.status(200).json({
            success: true,
            message: match
                ? `${match.name} is on the visitor blacklist.`
                : "Visitor is not blacklisted.",
            data: {
                blacklisted: match !== null,
                blacklist: match,
            },
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to check blacklist.",
        });
    }
};

export const removeFromBlacklist = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (req.user?.role !== "Administrator") {
            res.status(403).json({
                success: false,
                message: "Only Administrators can update the blacklist.",
            });
            return;
        }

        const { blacklist_id } = req.params;

        const result = await pool.query(
            `
            UPDATE visitor_blacklist
            SET
                is_active = false,
                updated_at = CURRENT_TIMESTAMP
            WHERE blacklist_id = $1
            RETURNING *
            `,
            [blacklist_id]
        );

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
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to update blacklist.",
        });
    }
};
