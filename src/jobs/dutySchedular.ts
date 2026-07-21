import cron from "node-cron";
import { pool } from "../config/db";

cron.schedule("* * * * *", async () => {
    try {

        // Current Philippine Date & Time
        const nowDate = `(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date`;
        const nowTime = `(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::time`;

       

        // 2. Complete Monitoring Schedule
        const completeScheduleResult = await pool.query(`
            UPDATE monitoring_schedules
            SET
                status = 'Completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE
                status = 'Ongoing'
                AND schedule_date = ${nowDate}
                AND ${nowTime} >= end_time;
        `);

        console.log("Completed schedules:", completeScheduleResult.rowCount);

        // 3. Update User Duty Status
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

        // 4. Start Patrol
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

        // 5. Complete Patrol
        const completePatrolResult = await pool.query(`
            UPDATE patrol_logs pl
            SET
                status = 'Completed',
                patrol_end = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            FROM monitoring_schedules ms
            WHERE
                pl.schedule_id = ms.schedule_id
                AND pl.status = 'Ongoing'
                AND ms.status = 'Completed';
        `);

        console.log("Completed patrols:", completePatrolResult.rowCount);

        // 6. Mark Missed Patrol
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