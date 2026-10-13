import cron from "node-cron";
import { pool } from "../config/db";

cron.schedule("* * * * *", async () => {
    try {
        // Patrols are never auto-completed: personnel must complete them
        // manually once the scheduled end time is reached (see completePatrol).

        // 1. Update User Duty Status
        await pool.query(`
            UPDATE users u
            SET on_duty = EXISTS (
                SELECT 1
                FROM monitoring_schedules ms
                WHERE
                    ms.user_id = u.user_id
                    AND ms.status = 'Ongoing'
            );
        `);

        // 2. Start Patrol
        const startPatrolResult = await pool.query(`
            UPDATE patrol_logs pl
            SET
                status = 'Ongoing',
                patrol_start = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            FROM monitoring_schedules ms
            WHERE
                pl.schedule_id = ms.schedule_id
                AND pl.status = 'Pending'
                AND ms.status = 'Ongoing';
        `);

        console.log("Started patrols:", startPatrolResult.rowCount);

        // 3. Mark Missed Patrol
        const missedPatrolResult = await pool.query(`
            UPDATE patrol_logs pl
            SET
                status = 'Missed',
                updated_at = CURRENT_TIMESTAMP
            FROM monitoring_schedules ms
            WHERE
                pl.schedule_id = ms.schedule_id
                AND pl.status = 'Pending'
                AND ms.status = 'Completed';
        `);

        console.log("Missed patrols:", missedPatrolResult.rowCount);

        console.log("Monitoring scheduler updated.");

    } catch (error) {
        console.error("Monitoring Scheduler:", error);
    }
});