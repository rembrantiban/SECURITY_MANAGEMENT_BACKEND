"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../config/db");
node_cron_1.default.schedule("* * * * *", async () => {
    try {
        // Current Philippine Date & Time
        const nowDate = `(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date`;
        const nowTime = `(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::time`;
        // 2. Complete Monitoring Schedule
        const completeScheduleResult = await db_1.pool.query(`
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
        await db_1.pool.query(`
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
        const startPatrolResult = await db_1.pool.query(`
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
        const completePatrolResult = await db_1.pool.query(`
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
        const missedPatrolResult = await db_1.pool.query(`
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
    }
    catch (error) {
        console.error("Monitoring Scheduler:", error);
    }
});
