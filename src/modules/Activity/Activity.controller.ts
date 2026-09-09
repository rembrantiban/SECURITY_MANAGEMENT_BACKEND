import { Request, Response } from "express";
import { pool } from "../../config/db";

export type ActivityAction =
    | "Login"
    | "Logout"
    | "Register"
    | "Incident Report"
    | "Visitor Request"
    | "Access Request"
    | "Monitoring"
    | "Patrol";

/**
 * Fire-and-forget activity write. Never throws into the caller — a failed
 * log line must not break the action it is recording.
 */
export const logActivity = (
    userId: number | null | undefined,
    action: ActivityAction,
    reference?: string | null,
    detail?: string | null,
    ipAddress?: string | null
): void => {
    if (!userId) return;

    pool
        .query(
            `
            INSERT INTO activity_logs
                (user_id, action, reference, detail, ip_address)
            VALUES
                ($1, $2, $3, $4, $5)
            `,
            [
                userId,
                action,
                reference ?? null,
                detail ?? null,
                ipAddress ?? null,
            ]
        )
        .catch((error) => {
            console.error("Failed to write activity log:", error);
        });
};

export const getActivityLogs = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { from, to, action, role } = req.query;

        const conditions: string[] = [];
        const params: unknown[] = [];

        if (from) {
            params.push(from);
            conditions.push(`al.created_at >= $${params.length}`);
        }

        if (to) {
            params.push(to);
            conditions.push(`al.created_at <= $${params.length}`);
        }

        if (action) {
            params.push(action);
            conditions.push(`al.action = $${params.length}`);
        }

        if (role) {
            params.push(role);
            conditions.push(`u.role = $${params.length}`);
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const result = await pool.query(
            `
            SELECT
                al.activity_id,
                al.user_id,
                al.action,
                al.reference,
                al.detail,
                al.ip_address,
                al.created_at,

                CASE
                    WHEN u.user_id IS NULL THEN 'Deleted user'
                    ELSE CONCAT(u.first_name, ' ', u.last_name)
                END AS user_name,

                u.role

            FROM activity_logs al
            LEFT JOIN users u
                ON u.user_id = al.user_id

            ${where}

            ORDER BY al.created_at DESC
            `,
            params
        );

        res.status(200).json({
            success: true,
            total: result.rowCount,
            logs: result.rows,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch activity logs.",
        });
    }
};
