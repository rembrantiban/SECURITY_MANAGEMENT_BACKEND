import { CreateReportGenerationBody, ReportExportFormat } from "./Reports.types";

const EXPORT_FORMATS: ReportExportFormat[] = ["PDF", "Excel"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface ValidationResult {
    valid: boolean;
    message?: string;
    data?: CreateReportGenerationBody;
}

/** Validates and normalises the create-report-generation payload. */
export function validateCreateReportGeneration(
    body: unknown
): ValidationResult {
    if (typeof body !== "object" || body === null) {
        return { valid: false, message: "Request body is required." };
    }

    const raw = body as Record<string, unknown>;

    const str = (key: string): string =>
        typeof raw[key] === "string" ? (raw[key] as string).trim() : "";

    const report_key = str("report_key");
    const report_ref = str("report_ref");
    const title = str("title");
    const range_label = str("range_label");
    const export_format = str("export_format") as ReportExportFormat;

    if (!report_key || report_key.length > 64) {
        return { valid: false, message: "A valid report_key is required." };
    }

    if (!report_ref || report_ref.length > 16) {
        return { valid: false, message: "A valid report_ref is required." };
    }

    if (!title || title.length > 120) {
        return { valid: false, message: "A valid title is required." };
    }

    if (!range_label || range_label.length > 160) {
        return { valid: false, message: "A valid range_label is required." };
    }

    if (!EXPORT_FORMATS.includes(export_format)) {
        return {
            valid: false,
            message: "export_format must be either 'PDF' or 'Excel'.",
        };
    }

    const parseDate = (key: string): string | null => {
        const value = raw[key];
        if (value === undefined || value === null || value === "") return null;
        if (typeof value !== "string" || !ISO_DATE.test(value)) return null;
        return value;
    };

    const date_from = parseDate("date_from");
    const date_to = parseDate("date_to");

    if (raw["date_from"] && !date_from) {
        return { valid: false, message: "date_from must be an ISO date (YYYY-MM-DD)." };
    }
    if (raw["date_to"] && !date_to) {
        return { valid: false, message: "date_to must be an ISO date (YYYY-MM-DD)." };
    }

    let record_count: number | null = null;
    if (raw["record_count"] !== undefined && raw["record_count"] !== null) {
        const n = Number(raw["record_count"]);
        if (!Number.isInteger(n) || n < 0) {
            return {
                valid: false,
                message: "record_count must be a non-negative integer.",
            };
        }
        record_count = n;
    }

    return {
        valid: true,
        data: {
            report_key,
            report_ref,
            title,
            export_format,
            range_label,
            date_from,
            date_to,
            record_count,
        },
    };
}
