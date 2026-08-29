import { Request, Response } from "express";
import { pool } from "../../config/db";

/** Roles that actually receive notifications. */
const RECEIVING_ROLES = ["Security Personnel", "Authorized Staff"] as const;

/**
 * Inserts a recipient row for every user matching the audience.
 * Safe to call more than once (ON CONFLICT DO NOTHING).
 */
async function fanOut(
    notificationId: number,
    audience: string
): Promise<number> {
    // "All" → every receiving role; otherwise the one requested role.
    const roles: string[] =
        audience === "All" ? [...RECEIVING_ROLES] : [audience];

    // `role` is a `user_role` enum, so it must be cast to text before it can
    // be compared against a text[] parameter — otherwise Postgres throws
    // `operator does not exist: user_role = text` and the send fails.
    const result = await pool.query(
        `
        INSERT INTO notification_recipients (notification_id, user_id)
        SELECT $1, user_id
        FROM users
        WHERE status = true
          AND role::text = ANY($2::text[])
        ON CONFLICT (notification_id, user_id) DO NOTHING
        `,
        [notificationId, roles]
    );

    return result.rowCount ?? 0;
}

/**
 * Promotes scheduled notifications whose time has come to `Sent`
 * and fans them out. Runs lazily on every fetch — no cron needed.
 */
async function releaseDueNotifications(): Promise<void> {
    const due = await pool.query(
        `
        UPDATE notifications
        SET status = 'Sent',
            sent_at = CURRENT_TIMESTAMP
        WHERE status = 'Scheduled'
          AND scheduled_for IS NOT NULL
          AND scheduled_for <= CURRENT_TIMESTAMP
        RETURNING notification_id, audience
        `
    );

    for (const row of due.rows) {
        await fanOut(row.notification_id, row.audience);
    }
}

/* ------------------------------------------------------------------ */
/* Administrator — 9.1 / 9.2 / 9.3                                    */
/* ------------------------------------------------------------------ */

export const sendNotification = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (req.user?.role !== "Administrator") {
            res.status(403).json({
                success: false,
                message: "Only Administrators can send notifications.",
            });
            return;
        }

        const { title, message, type, audience, scheduled_for } = req.body;

        if (!title?.trim() || !message?.trim()) {
            res.status(400).json({
                success: false,
                message: "Title and message are required.",
            });
            return;
        }

        const notifType = ["Alert", "Emergency", "Info"].includes(type)
            ? type
            : "Info";

        const notifAudience = [
            "All",
            "Security Personnel",
            "Authorized Staff",
        ].includes(audience)
            ? audience
            : "All";

        const scheduledDate = scheduled_for ? new Date(scheduled_for) : null;
        const isScheduled =
            !!scheduledDate &&
            !Number.isNaN(scheduledDate.getTime()) &&
            scheduledDate.getTime() > Date.now();

        const insert = await pool.query(
            `
            INSERT INTO notifications
                (title, message, type, audience, status, scheduled_for, sent_at, created_by)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `,
            [
                title.trim(),
                message.trim(),
                notifType,
                notifAudience,
                isScheduled ? "Scheduled" : "Sent",
                isScheduled ? scheduledDate : null,
                isScheduled ? null : new Date(),
                req.user.user_id,
            ]
        );

        const notification = insert.rows[0];

        let recipientCount = 0;
        if (!isScheduled) {
            recipientCount = await fanOut(
                notification.notification_id,
                notifAudience
            );
        }

        res.status(201).json({
            success: true,
            message: isScheduled
                ? "Notification scheduled."
                : `Notification sent to ${recipientCount} recipient(s).`,
            notification,
            recipientCount,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to send notification.",
        });
    }
};

/* ------------------------------------------------------------------ */
/* History — 9.4 (admin) / 9.7 (personnel)                           */
/* ------------------------------------------------------------------ */

export const getNotificationHistory = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (req.user?.role !== "Administrator") {
            res.status(403).json({
                success: false,
                message: "Only Administrators can view the full history.",
            });
            return;
        }

        await releaseDueNotifications();

        const result = await pool.query(
            `
            SELECT
                n.notification_id,
                n.title,
                n.message,
                n.type,
                n.audience,
                n.status,
                n.scheduled_for,
                n.sent_at,
                n.created_at,

                CASE
                    WHEN u.user_id IS NULL THEN 'System'
                    ELSE CONCAT(u.first_name, ' ', u.last_name)
                END AS created_by_name,

                COUNT(nr.id)::int                                   AS total_recipients,
                COUNT(nr.read_at)::int                              AS read_count,
                COUNT(nr.acknowledged_at)::int                      AS acknowledged_count

            FROM notifications n
            LEFT JOIN users u  ON u.user_id = n.created_by
            LEFT JOIN notification_recipients nr
                ON nr.notification_id = n.notification_id

            GROUP BY n.notification_id, u.user_id
            ORDER BY
                COALESCE(n.sent_at, n.scheduled_for, n.created_at) DESC
            `
        );

        res.status(200).json({
            success: true,
            total: result.rowCount,
            notifications: result.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notification history.",
        });
    }
};

/* ------------------------------------------------------------------ */
/* Recipient — 9.5 / 9.6 / 9.7 / 9.8 / 9.9                           */
/* ------------------------------------------------------------------ */

export const getMyNotifications = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.user_id;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized." });
            return;
        }

        await releaseDueNotifications();

        const result = await pool.query(
            `
            SELECT
                n.notification_id,
                n.title,
                n.message,
                n.type,
                n.audience,
                n.sent_at,

                CASE
                    WHEN u.user_id IS NULL THEN 'System'
                    ELSE CONCAT(u.first_name, ' ', u.last_name)
                END AS sent_by_name,

                nr.read_at,
                nr.acknowledged_at

            FROM notification_recipients nr
            INNER JOIN notifications n
                ON n.notification_id = nr.notification_id
               AND n.status = 'Sent'
            LEFT JOIN users u ON u.user_id = n.created_by

            WHERE nr.user_id = $1

            ORDER BY n.sent_at DESC NULLS LAST
            `,
            [userId]
        );

        const rows = result.rows;

        res.status(200).json({
            success: true,
            total: rows.length,
            unreadCount: rows.filter((r) => !r.read_at).length,
            unacknowledgedCount: rows.filter((r) => !r.acknowledged_at).length,
            notifications: rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notifications.",
        });
    }
};

export const markNotificationRead = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.user_id;
        const { notification_id } = req.params;

        const result = await pool.query(
            `
            UPDATE notification_recipients
            SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
            WHERE notification_id = $1 AND user_id = $2
            RETURNING *
            `,
            [notification_id, userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
            return;
        }

        res.status(200).json({ success: true, recipient: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to update notification.",
        });
    }
};

export const markAllNotificationsRead = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.user_id;

        await pool.query(
            `
            UPDATE notification_recipients
            SET read_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND read_at IS NULL
            `,
            [userId]
        );

        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to update notifications.",
        });
    }
};

export const acknowledgeNotification = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.user_id;
        const { notification_id } = req.params;

        const result = await pool.query(
            `
            UPDATE notification_recipients
            SET acknowledged_at = COALESCE(acknowledged_at, CURRENT_TIMESTAMP),
                read_at         = COALESCE(read_at, CURRENT_TIMESTAMP)
            WHERE notification_id = $1 AND user_id = $2
            RETURNING *
            `,
            [notification_id, userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Notification acknowledged.",
            recipient: result.rows[0],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to acknowledge notification.",
        });
    }
};
