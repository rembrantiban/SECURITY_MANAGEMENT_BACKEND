export type ReportExportFormat = "PDF" | "Excel";

/** Payload accepted by POST /api/reports/generations. */
export interface CreateReportGenerationBody {
    report_key: string;
    report_ref: string;
    title: string;
    export_format: ReportExportFormat;
    date_from?: string | null;
    date_to?: string | null;
    range_label: string;
    record_count?: number | null;
}

/** Row shape returned to the client. */
export interface ReportGeneration {
    report_generation_id: number;
    report_key: string;
    report_ref: string;
    title: string;
    export_format: ReportExportFormat;
    date_from: string | null;
    date_to: string | null;
    range_label: string;
    record_count: number | null;
    generated_by: number | null;
    generated_by_name: string | null;
    created_at: string;
}

export interface ReportGenerationQuery {
    limit?: string;
    report_key?: string;
    from?: string;
    to?: string;
}
