import cron from "node-cron";
import { pool } from "../config/db";

cron.schedule("* * * * *", async () => {
    try {
        await pool.query(`
            UPDATE users
            SET on_duty =
                CASE
                    WHEN CURRENT_TIME >= duty_start
                     AND CURRENT_TIME < duty_end
                    THEN TRUE
                    ELSE FALSE
                END
            WHERE duty_start IS NOT NULL
              AND duty_end IS NOT NULL;
        `);

        console.log("Duty status updated.");
    } catch (error) {
        console.error("Duty Scheduler:", error);
    }
});