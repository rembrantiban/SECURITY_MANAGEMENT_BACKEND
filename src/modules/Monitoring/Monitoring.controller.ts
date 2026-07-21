import { pool } from "../../config/db"
import { Request, Response } from "express"


export const createMonitoringSchedule = async (
    req: Request,
    res: Response
): Promise<void> => {

    const assigned_by = req.user?.user_id;

    if (!assigned_by) {
        res.status(401).json({
            success: false,
            message: "Unauthorized.",
        });
        return;
    }

    try {
        const {
            user_id,
            assigned_area,
            schedule_date,
            start_time,
            end_time,
            remarks,
        } = req.body;

        if (
            !user_id ||
            !assigned_area ||
            !schedule_date ||
            !start_time ||
            !end_time
        ) {
            res.status(400).json({
                success: false,
                message: "All required fields must be provided.",
            });
            return;
        }

        /* Prevent past schedule */

        const today = new Date().toISOString().split("T")[0];

        if (schedule_date < today) {
            res.status(400).json({
                success: false,
                message: "Schedule date cannot be in the past.",
            });
            return;
        }

        /* Check Security Personnel */

        const personnel = await pool.query(
            `
            SELECT
                user_id,
                first_name,
                last_name
            FROM users
            WHERE
                user_id = $1
                AND role = 'Security Personnel'
                AND status = TRUE
            `,
            [user_id]
        );

        if (personnel.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Security personnel not found.",
            });
            return;
        }

        /* Prevent overlapping schedules */

        const overlap = await pool.query(
            `
            SELECT schedule_id
            FROM monitoring_schedules
            WHERE
                user_id = $1
                AND schedule_date = $2
                AND (
                    start_time < $4
                    AND end_time > $3
                )
            `,
            [
                user_id,
                schedule_date,
                start_time,
                end_time,
            ]
        );

        if (overlap.rows.length > 0) {
            res.status(400).json({
                success: false,
                message:
                    "This security personnel already has a monitoring schedule during the selected time.",
            });
            return;
        }

        /* Insert Schedule */

        const result = await pool.query(
            `
       INSERT INTO monitoring_schedules
            (
                user_id,
                assigned_by,
                assigned_area,
                schedule_date,
                start_time,
                end_time,
                remarks
            )

            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7
            )

            RETURNING *
            `,
            [
                user_id,
                assigned_by,
                assigned_area,
                schedule_date,
                start_time,
                end_time,
                remarks ?? null,
            ]
        );

        res.status(201).json({
            success: true,
            message: "Monitoring schedule created successfully.",
            schedule: result.rows[0],
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create monitoring schedule.",
        });

    }
};



export const getMonitoringSchedules = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const {
            search,
            status,
            date,
        } = req.query;

        let query = `
        SELECT

            ms.schedule_id,
            ms.assigned_area,
            ms.schedule_date,
            ms.start_time,
            ms.end_time,
            ms.status,
            ms.remarks,
            ms.created_at,
            ms.updated_at,

            u.user_id,
            u.first_name,
            u.middle_name,
            u.last_name,
            u.username,
            u.role

        FROM monitoring_schedules ms

        INNER JOIN users u
            ON ms.user_id = u.user_id

        WHERE 1 = 1
            AND ms.status <> 'Completed'
        `;

        const values: any[] = [];

        /* Search */

        if (search) {

            values.push(`%${search}%`);

            query += `
            AND
            (
                CONCAT(
                    u.first_name,
                    ' ',
                    u.last_name
                ) ILIKE $${values.length}

                OR

                ms.assigned_area ILIKE $${values.length}
            )
            `;
        }

        /* Status */

        if (status) {

            values.push(status);

            query += `
            AND ms.status = $${values.length}
            `;
        }

        /* Date */

        if (date) {

            values.push(date);

            query += `
            AND ms.schedule_date = $${values.length}
            `;
        }

        query += `
        ORDER BY
            ms.schedule_date ASC,
            ms.start_time ASC
        `;

        const result = await pool.query(
            query,
            values
        );

        res.status(200).json({
            success: true,
            count: result.rows.length,
            schedules: result.rows,
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch monitoring schedules.",
        });

    }

};
export const updateMonitoringSchedule = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const { schedule_id } = req.params;

        const {
            user_id,
            assigned_area,
            schedule_date,
            start_time,
            end_time,
        } = req.body;

        const result = await pool.query(
            `
      UPDATE monitoring_schedules

      SET

        user_id = $1,
        assigned_area = $2,
        schedule_date = $3,
        start_time = $4,
        end_time = $5,
        updated_at = CURRENT_TIMESTAMP

      WHERE schedule_id = $6

      RETURNING *
      `,
            [
                user_id,
                assigned_area,
                schedule_date,
                start_time,
                end_time,
                schedule_id,
            ]
        );

        if (result.rows.length === 0) {

            res.status(404).json({
                success: false,
                message: "Monitoring schedule not found.",
            });

            return;
        }

        res.status(200).json({
            success: true,
            message: "Monitoring schedule updated successfully.",
            schedule: result.rows[0],
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to update monitoring schedule.",
        });

    }
};

export const deleteMonitoringSchedule = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const { schedule_id } = req.params;

        const result = await pool.query(
            `
      DELETE FROM monitoring_schedules

      WHERE schedule_id = $1

      RETURNING *
      `,
            [schedule_id]
        );

        if (result.rows.length === 0) {

            res.status(404).json({
                success: false,
                message: "Monitoring schedule not found.",
            });

            return;
        }

        res.status(200).json({
            success: true,
            message: "Monitoring schedule deleted successfully.",
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to delete monitoring schedule.",
        });

    }
};

export const updateMonitoringScheduleStatus = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const { schedule_id } = req.params;

        const { status } = req.body;

        const allowedStatus = [
            "Pending",
            "Ongoing",
            "Completed",
            "Cancelled",
        ];

        if (!allowedStatus.includes(status)) {

            res.status(400).json({
                success: false,
                message: "Invalid status.",
            });

            return;
        }

        const result = await pool.query(
            `
      UPDATE monitoring_schedules

      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP

      WHERE schedule_id = $2

      RETURNING *
      `,
            [
                status,
                schedule_id,
            ]
        );

        if (result.rows.length === 0) {

            res.status(404).json({
                success: false,
                message: "Monitoring schedule not found.",
            });

            return;
        }

        res.status(200).json({
            success: true,
            message: "Schedule status updated successfully.",
            schedule: result.rows[0],
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to update schedule status.",
        });

    }
};


export const getMyMonitoringSchedules = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const user_id = req.user?.user_id;

        if (!user_id) {
            res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
            return;
        }

        const result = await pool.query(
            `
            SELECT

                ms.schedule_id,
                ms.assigned_area,
                ms.schedule_date,
                ms.start_time,
                ms.end_time,
                ms.status,
                ms.remarks,
                ms.created_at,
                ms.updated_at,

                -- Assigned Security Personnel
                guard.user_id,
                guard.first_name,
                guard.middle_name,
                guard.last_name,
                guard.username,

                -- Assigned By Administrator
                admin.user_id AS assigned_by_id,
                admin.first_name AS assigned_by_first_name,
                admin.middle_name AS assigned_by_middle_name,
                admin.last_name AS assigned_by_last_name,
                admin.username AS assigned_by_username,
                admin.role AS assigned_by_role

            FROM monitoring_schedules ms

            INNER JOIN users guard
                ON ms.user_id = guard.user_id

            LEFT JOIN users admin
                ON ms.assigned_by = admin.user_id

            WHERE
                ms.user_id = $1
                AND ms.status <> 'Completed'

            ORDER BY
                ms.schedule_date DESC,
                ms.start_time ASC
            `,
            [user_id]
        );

        res.status(200).json({
            success: true,
            count: result.rows.length,
            schedules: result.rows,
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch your monitoring schedules.",
        });
    }
};