import { Request, Response } from "express";
import { pool } from "../../config/db";
import { validateCreateReportGeneration } from "./Reports.validation";
import { ReportGenerationQuery } from "./Reports.types";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * POST /api/reports/generations
 * Records that a report was produced from the Reports Center. Append-only.
 */
export const createReportGeneration = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const result = validateCreateReportGeneration(req.body);

        if (!result.valid || !result.data) {
            res.status(400).json({
                success: false,
                message: result.message ?? "Invalid report generation payload.",
            });
            return;
        }

        const {
            report_key,
            report_ref,
            title,
            export_format,
            date_from,
            date_to,
            range_label,
            record_count,
        } = result.data;

        const generatedBy = req.user?.user_id ?? null;

        const inserted = await pool.query(
            `
            INSERT INTO report_generations
                (report_key, report_ref, title, export_format,
                 date_from, date_to, range_label, record_count,
                 generated_by, generated_by_name)
            VALUES
                ($1, $2, $3, $4,
                 $5, $6, $7, $8,
                 $9,
                 (SELECT CONCAT(first_name, ' ', last_name)
                    FROM users
                   WHERE user_id = $9))
            RETURNING *
            `,
            [
                report_key,
                report_ref,
                title,
                export_format,
                date_from,
                date_to,
                range_label,
                record_count,
                generatedBy,
            ]
        );

        res.status(201).json({
            success: true,
            message: "Report generation recorded.",
            data: inserted.rows[0],
        });
    } catch (error) {
        console.error("Failed to record report generation:", error);

        res.status(500).json({
            success: false,
            message: "Failed to record report generation.",
        });
    }
};

/**
 * GET /api/reports/generations
 * Returns recent report-generation events, newest first.
 * Optional filters: ?limit= &report_key= &from= &to=
 */
export const getReportGenerations = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { limit, report_key, from, to } =
            req.query as ReportGenerationQuery;

        const parsedLimit = Number(limit);
        const safeLimit =
            Number.isInteger(parsedLimit) && parsedLimit > 0
                ? Math.min(parsedLimit, MAX_LIMIT)
                : DEFAULT_LIMIT;

        const conditions: string[] = [];
        const params: unknown[] = [];

        if (report_key) {
            params.push(report_key);
            conditions.push(`report_key = $${params.length}`);
        }

        if (from) {
            params.push(from);
            conditions.push(`created_at >= $${params.length}`);
        }

        if (to) {
            params.push(to);
            conditions.push(`created_at <= $${params.length}`);
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        params.push(safeLimit);

        const result = await pool.query(
            `
            SELECT *
            FROM report_generations
            ${where}
            ORDER BY created_at DESC
            LIMIT $${params.length}
            `,
            params
        );

        res.status(200).json({
            success: true,
            message: "Report generations retrieved.",
            data: result.rows,
        });
    } catch (error) {
        console.error("Failed to fetch report generations:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch report generations.",
        });
    }
};
