import { Request, Response } from "express";
import { pool } from "../../config/db";

/**
 * System Status (dashboard 3.x) — live health of the systems this app depends on.
 *
 * Each check is a real probe: the API server is up if this handler runs, and
 * the database / auth / notification checks issue a lightweight query and grade
 * the result by round-trip latency.
 */

type Status = "Operational" | "Degraded" | "Offline";

interface SystemComponent {
    id: string;
    name: string;
    status: Status;
    latency_ms: number | null;
    detail: string;
}

/** Grade a successful probe by how long it took. */
function latencyStatus(ms: number): Status {
    if (ms < 200) return "Operational";
    if (ms < 800) return "Degraded";
    return "Offline";
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

/** Run a probe query and turn it into a component health entry. */
async function probe(
    id: string,
    name: string,
    sql: string,
    onOk: (rows: Record<string, unknown>[], ms: number) => string,
    failStatus: Status = "Offline",
    failDetail = "Unreachable"
): Promise<SystemComponent> {
    try {
        const start = Date.now();
        const result = await pool.query(sql);
        const ms = Date.now() - start;

        return {
            id,
            name,
            status: latencyStatus(ms),
            latency_ms: ms,
            detail: onOk(result.rows, ms),
        };
    } catch (error) {
        console.error(`System check failed (${id}):`, error);
        return { id, name, status: failStatus, latency_ms: null, detail: failDetail };
    }
}

export const getSystemStatus = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {
        const uptimeSeconds = Math.floor(process.uptime());

        const components: SystemComponent[] = [
            {
                id: "api",
                name: "API Server",
                status: "Operational",
                latency_ms: null,
                detail: `Up ${formatUptime(uptimeSeconds)}`,
            },
            await probe(
                "database",
                "Database",
                "SELECT 1",
                (_rows, ms) => `${ms} ms response`
            ),
            await probe(
                "auth",
                "Authentication",
                "SELECT COUNT(*)::int AS n FROM users",
                (rows) => `${(rows[0]?.n as number) ?? 0} accounts`
            ),
            await probe(
                "notifications",
                "Notification Service",
                "SELECT 1 FROM notifications LIMIT 1",
                (_rows, ms) => `${ms} ms response`,
                "Degraded",
                "Check failed"
            ),
        ];

        const offline = components.filter((c) => c.status === "Offline").length;
        const degraded = components.filter((c) => c.status === "Degraded").length;
        const operational = components.filter(
            (c) => c.status === "Operational"
        ).length;

        const overall: Status = offline
            ? "Offline"
            : degraded
            ? "Degraded"
            : "Operational";

        res.status(200).json({
            success: true,
            message: "System status retrieved.",
            data: {
                checked_at: new Date().toISOString(),
                uptime_seconds: uptimeSeconds,
                overall,
                operational,
                total: components.length,
                components,
            },
        });
    } catch (error) {
        console.error("Failed to build system status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve system status.",
        });
    }
};
