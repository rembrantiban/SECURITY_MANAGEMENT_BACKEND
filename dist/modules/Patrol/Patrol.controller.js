"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyCompletedPatrols = exports.startPatrol = void 0;
const db_1 = require("../../config/db");
const startPatrol = async (req, res) => {
    const client = await db_1.pool.connect();
    try {
        await client.query("BEGIN");
        const { schedule_id } = req.params;
        if (!schedule_id) {
            await client.query("ROLLBACK");
            res.status(400).json({
                success: false,
                message: "Schedule ID is required.",
            });
            return;
        }
        // Get Monitoring Schedule
        const scheduleResult = await client.query(`
            SELECT
                schedule_id,
                user_id,
                assigned_area,
                schedule_date,
                start_time,
                end_time,
                status
            FROM monitoring_schedules
            WHERE schedule_id = $1
            `, [schedule_id]);
        if (scheduleResult.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({
                success: false,
                message: "Monitoring schedule not found.",
            });
            return;
        }
        const schedule = scheduleResult.rows[0];
        // Already started?
        if (schedule.status === "Ongoing") {
            await client.query("ROLLBACK");
            res.status(400).json({
                success: false,
                message: "This patrol is already ongoing.",
            });
            return;
        }
        // Already completed?
        if (schedule.status === "Pending") {
            await client.query("ROLLBACK");
            res.status(400).json({
                success: false,
                message: "Patrol cannot be started yet.",
            });
            return;
        }
        if (schedule.status === "Completed") {
            await client.query("ROLLBACK");
            res.status(400).json({
                success: false,
                message: "This patrol schedule has already ended.",
            });
            return;
        }
        // Don't allow starting after duty end
        const now = new Date();
        const scheduleEnd = new Date(`${schedule.schedule_date}T${schedule.end_time}`);
        if (now > scheduleEnd) {
            await client.query("ROLLBACK");
            res.status(400).json({
                success: false,
                message: "This patrol schedule has already ended.",
            });
            return;
        }
        // Check if patrol log already exists
        const existingPatrol = await client.query(`
            SELECT patrol_log_id
            FROM patrol_logs
            WHERE schedule_id = $1
            `, [schedule.schedule_id]);
        if (existingPatrol.rows.length > 0) {
            await client.query("ROLLBACK");
            res.status(400).json({
                success: false,
                message: "Patrol log already exists.",
            });
            return;
        }
        // Create Patrol Log
        const patrolResult = await client.query(`
            INSERT INTO patrol_logs
            (
                schedule_id,
                user_id,
                area_patrolled,
                patrol_start,
                status
            )
            VALUES
            (
                $1,
                $2,
                $3,
                CURRENT_TIMESTAMP,
                'Ongoing'
            )
            RETURNING *;
            `, [
            schedule.schedule_id,
            schedule.user_id,
            schedule.assigned_area,
        ]);
        // Update Monitoring Schedule
        await client.query(`
            UPDATE monitoring_schedules
            SET
                status = 'Ongoing',
                updated_at = CURRENT_TIMESTAMP
            WHERE schedule_id = $1
            `, [schedule.schedule_id]);
        // Update User
        await client.query(`
            UPDATE users
            SET
                on_duty = TRUE
            WHERE user_id = $1
            `, [schedule.user_id]);
        await client.query("COMMIT");
        res.status(200).json({
            success: true,
            message: "Patrol started successfully.",
            patrol: patrolResult.rows[0],
        });
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("Start Patrol Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to start patrol.",
        });
    }
    finally {
        client.release();
    }
};
exports.startPatrol = startPatrol;
const getMyCompletedPatrols = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
            return;
        }
        const result = await db_1.pool.query(`
            SELECT
                pl.patrol_log_id,
                pl.schedule_id,
                pl.area_patrolled,
                pl.patrol_start,
                pl.patrol_end,
                pl.status,
                pl.created_at,

                ms.schedule_date,
                ms.start_time,
                ms.end_time,

                u.user_id,
                CONCAT(u.first_name, ' ', u.last_name) AS personnel_name

            FROM patrol_logs pl
            INNER JOIN monitoring_schedules ms
                ON pl.schedule_id = ms.schedule_id
            INNER JOIN users u
                ON pl.user_id = u.user_id

            WHERE
                pl.user_id = $1
                AND pl.status = 'Completed'

            ORDER BY
                pl.patrol_end DESC;
            `, [userId]);
        res.status(200).json({
            success: true,
            total: result.rows.length,
            patrols: result.rows,
        });
    }
    catch (error) {
        console.error("Get My Completed Patrols Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve completed patrols.",
        });
    }
};
exports.getMyCompletedPatrols = getMyCompletedPatrols;
