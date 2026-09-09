    import { Request, Response } from "express";
    import { pool } from "../../config/db";
    import { uploadToCloudinary } from "../../utils/UploadToCloudinary";
    import cloudinary from "../../config/cloudinary";
    import { logActivity } from "../Activity/Activity.controller";

    export const createIncidentReport = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const client = await pool.connect();
        console.log("Body:", req.body);
        console.log("File:", req.file);
        console.log("User:", req.user);
        try {
            await client.query("BEGIN");

            const {
                title,
                category,
                severity,
                location,
                description
            } = req.body;

            const reported_by = req.user?.user_id;

            if (!title || !category || !severity || !location || !description || !reported_by) {
                res.status(400).json({
                    success: false,
                    message: "All required fields are required.",
                });
                return;
            }

            let incidentImage: string | null = null;

            if (req.file) {
                const uploaded = await uploadToCloudinary(req.file);

                incidentImage = uploaded.secure_url;
            }

            const year = new Date().getFullYear();

            const countResult = await client.query(
                `
                SELECT COUNT(*)::INTEGER AS total
                FROM incident_reports
                WHERE EXTRACT(YEAR FROM created_at) = $1
                `,
                [year]
            );

            const nextNumber = countResult.rows[0].total + 1;

            const incidentNumber = `INC-${year}-${String(nextNumber).padStart(
                4,
                "0"
            )}`;

            const result = await client.query(
                `
                INSERT INTO incident_reports
                (
                    incident_number,
                    title,
                    category,
                    severity,
                    location,
                    description,
                    incident_image,
                    reported_by
                )
                VALUES
                (
                    $1,$2,$3,$4,$5,$6,$7,$8
                )
                RETURNING *
                `,
                [
                    incidentNumber,
                    title,
                    category,
                    severity,
                    location,
                    description,
                    incidentImage,
                    reported_by,
                ]
            );

            await client.query("COMMIT");

            logActivity(
                reported_by,
                "Incident Report",
                result.rows[0].incident_number,
                title
            );

            res.status(201).json({
                success: true,
                message: "Incident report submitted successfully.",
                incident: result.rows[0],
            });
        } catch (error) {
            await client.query("ROLLBACK");

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to submit incident report.",
            });
        } finally {
            client.release();
        }
    };

    export const updateIncident = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const { incident_id } = req.params;

            const {
                title,
                category,
                severity,
                location,
                description,
            } = req.body;

            const currentUser = req.user;

            const incidentResult = await client.query(
                `
                SELECT *
                FROM incident_reports
                WHERE incident_id = $1
                `,
                [incident_id]
            );

            if (incidentResult.rows.length === 0) {
                await client.query("ROLLBACK");

                res.status(404).json({
                    success: false,
                    message: "Incident not found.",
                });
                return;
            }

            const incident = incidentResult.rows[0];

            if (
                currentUser?.role !== "Administrator" &&
                incident.reported_by !== currentUser?.user_id
            ) {
                await client.query("ROLLBACK");

                res.status(403).json({
                    success: false,
                    message: "Unauthorized.",
                });
                return;
            }

            if (
                currentUser?.role !== "Administrator" &&
                incident.status !== "Pending"
            ) {
                await client.query("ROLLBACK");

                res.status(400).json({
                    success: false,
                    message: "Only pending incidents can be updated.",
                });
                return;
            }

            let incidentImage = incident.incident_image;

            if (req.file) {
                const uploaded = await uploadToCloudinary(req.file);
                incidentImage = uploaded.secure_url;
            }

            const { rows } = await client.query(
                `
                UPDATE incident_reports
                SET
                    title = $1,
                    category = $2,
                    severity = $3,
                    location = $4,
                    description = $5,
                    incident_image = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE incident_id = $7
                RETURNING *;
                `,
                [
                    title,
                    category,
                    severity,
                    location,
                    description,
                    incidentImage,
                    incident_id,
                ]
            );

            await client.query("COMMIT");

            res.status(200).json({
                success: true,
                message: "Incident updated successfully.",
                incident: rows[0],
            });
        } catch (error) {
            await client.query("ROLLBACK");

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to update incident.",
            });
        } finally {
            client.release();
        }
    };

    export const getAllIncidents = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const result = await pool.query(
                `
                SELECT
                    ir.incident_id,
                    ir.incident_number,
                    ir.title,
                    ir.category,
                    ir.severity,
                    ir.location,
                    ir.description,
                    ir.incident_image,
                    ir.status,
                    ir.created_at,
                    ir.updated_at,

                    ir.reported_by,
                    CONCAT(
                        reporter.first_name,
                        ' ',
                        reporter.last_name
                    ) AS reported_by_name,

                    ir.assigned_to,
                    CASE
                        WHEN assignee.user_id IS NULL THEN NULL
                        ELSE CONCAT(
                            assignee.first_name,
                            ' ',
                            assignee.last_name
                        )
                    END AS assigned_to_name

                FROM incident_reports ir

                INNER JOIN users reporter
                    ON reporter.user_id = ir.reported_by

                LEFT JOIN users assignee
                    ON assignee.user_id = ir.assigned_to
                
                WHERE ir.status != 'Archived'

                ORDER BY ir.created_at DESC
                `
            );

            res.status(200).json({
                success: true,
                total: result.rowCount,
                incidents: result.rows,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to fetch incident reports.",
            });
        }
    };



    export const deleteIncident = async (
        req: Request,
        res: Response
    ) => {
        try {
            const { incident_id } = req.params;

            const currentUser = req.user;

            const incident = await pool.query(
                `
        SELECT *
        FROM incident_reports
        WHERE incident_id=$1
        `,
                [incident_id]
            );

            if (incident.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Incident not found.",
                });
            }

            const report = incident.rows[0];

            if (
                currentUser?.role !== "Administrator" &&
                report.reported_by !== currentUser?.user_id
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized.",
                });
            }

            if (
                currentUser?.role !== "Administrator" &&
                report.status !== "Pending"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Only pending incidents can be deleted.",
                });
            }

            if (report.incident_image) {
                const publicId = report.incident_image
                    .split("/")
                    .slice(-2)
                    .join("/")
                    .split(".")[0];

                try {
                    await cloudinary.uploader.destroy(publicId);
                } catch {
                    console.log("Cloudinary image not removed.");
                }
            }

            await pool.query(
                `
            DELETE FROM incident_reports
            WHERE incident_id=$1
            `,
                [incident_id]
            );

            return res.status(200).json({
                success: true,
                message: "Incident deleted successfully.",
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to delete incident.",
            });
        }
    };

    export const getMyIncidentReports = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const user = req.user;

            if (!user) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
                return;
            }

            const result = await pool.query(
                `
                SELECT
                    ir.incident_id,
                    ir.incident_number,
                    ir.title,
                    ir.category,
                    ir.severity,
                    ir.location,
                    ir.description,
                    ir.incident_image,
                    ir.status,
                    ir.created_at,
                    ir.updated_at,

                    ir.reported_by,
                    CONCAT(
                        reporter.first_name,
                        ' ',
                        reporter.last_name
                    ) AS reported_by_name,

                    ir.assigned_to,
                    CASE
                        WHEN assignee.user_id IS NULL THEN NULL
                        ELSE CONCAT(
                            assignee.first_name,
                            ' ',
                            assignee.last_name
                        )
                    END AS assigned_to_name

                FROM incident_reports ir

                INNER JOIN users reporter
                    ON reporter.user_id = ir.reported_by

                LEFT JOIN users assignee
                    ON assignee.user_id = ir.assigned_to
                    
            WHERE
                    ir.reported_by = $1
                    AND ir.status NOT IN ('Resolved', 'Closed')

                ORDER BY ir.created_at DESC
                `,
                [user.user_id]
            );

            res.status(200).json({
                success: true,
                total: result.rowCount,
                incidents: result.rows,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to fetch your incident reports.",
            });
        }
    };

    /**
     * GET ALL INCIDENTS SUBMITTED BY THE CURRENT USER (Authorized Staff)
     * Unlike getMyIncidentReports, this includes Resolved/Closed incidents
     * so the reporter can track the full status history of what they submitted.
     */
    export const getMySubmittedIncidents = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const user = req.user;

            if (!user) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
                return;
            }

            const result = await pool.query(
                `
                SELECT
                    ir.incident_id,
                    ir.incident_number,
                    ir.title,
                    ir.category,
                    ir.severity,
                    ir.location,
                    ir.description,
                    ir.incident_image,
                    ir.status,
                    ir.created_at,
                    ir.updated_at,

                    ir.reported_by,
                    CONCAT(
                        reporter.first_name,
                        ' ',
                        reporter.last_name
                    ) AS reported_by_name,

                    ir.assigned_to,
                    CASE
                        WHEN assignee.user_id IS NULL THEN NULL
                        ELSE CONCAT(
                            assignee.first_name,
                            ' ',
                            assignee.last_name
                        )
                    END AS assigned_to_name

                FROM incident_reports ir

                INNER JOIN users reporter
                    ON reporter.user_id = ir.reported_by

                LEFT JOIN users assignee
                    ON assignee.user_id = ir.assigned_to

                WHERE
                    ir.reported_by = $1
                    AND ir.status != 'Archived'

                ORDER BY ir.created_at DESC
                `,
                [user.user_id]
            );

            res.status(200).json({
                success: true,
                total: result.rowCount,
                incidents: result.rows,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to fetch your submitted incident reports.",
            });
        }
    };

    export const getUserAssignedIncidents = async (
        req: Request,
        res: Response
    ) => {
        try {
            const userId = req.user?.user_id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            const { rows } = await pool.query(
                `
        SELECT
            ir.incident_id,
            ir.incident_number,
            ir.title,
            ir.category,
            ir.severity,
            ir.location,
            ir.description,
            ir.incident_image,
            ir.status,
            ir.note,
            ir.created_at,
            ir.updated_at,

            reporter.user_id AS reported_by_id,
            CONCAT(
            reporter.first_name,
            ' ',
            reporter.last_name
            ) AS reported_by,

            assignee.user_id AS assigned_to_id,
            CONCAT(
            assignee.first_name,
            ' ',
            assignee.last_name
            ) AS assigned_to,

            admin.user_id AS assigned_by_id,
            CONCAT(
            admin.first_name,
            ' ',
            admin.last_name
            ) AS assigned_by

        FROM incident_reports ir

        INNER JOIN users reporter
            ON reporter.user_id = ir.reported_by

        LEFT JOIN users assignee
            ON assignee.user_id = ir.assigned_to

        LEFT JOIN users admin
            ON admin.user_id = ir.assigned_by

        WHERE ir.assigned_to = $1

        ORDER BY ir.created_at DESC
        `,
                [userId]
            );

            return res.status(200).json({
                success: true,
                count: rows.length,
                incidents: rows,
            });
        } catch (error) {
            console.error("Get Assigned Incidents Error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch assigned incidents.",
            });
        }
    };

    export const assignIncident = async (
        req: Request,
        res: Response
    ) => {
        try {
            const { incident_id } = req.params;
            const { assigned_to, note } = req.body;

            const assigned_by = req.user?.user_id;

            if (!assigned_by) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            if (!assigned_to) {
                return res.status(400).json({
                    success: false,
                    message: "Please select personnel.",
                });
            }

            const { rows } = await pool.query(
                `
        UPDATE incident_reports
        SET
            assigned_to = $1,
            assigned_by = $2,
            note = $3,
            status = 'In Progress'
        WHERE incident_id = $4
        RETURNING *;
        `,
                [
                    assigned_to,
                    assigned_by,
                    note || null,
                    incident_id,
                ]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Incident not found.",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Incident assigned successfully.",
                incident: rows[0],
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to assign incident.",
            });
        }
    };


    export const reAssignIncident = async (
        req: Request,
        res: Response
    ) => {
        try {
            const { incident_id } = req.params;
            const { assigned_to, note } = req.body;

            const assigned_by = req.user?.user_id;

            if (!assigned_by) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            const { rows } = await pool.query(
                `
        UPDATE incident_reports
        SET
            assigned_to = $1,
            assigned_by = $2,
            note = $3
        WHERE incident_id = $4
        RETURNING *;
        `,
                [
                    assigned_to,
                    assigned_by,
                    note || null,
                    incident_id,
                ]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Incident not found.",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Incident reassigned successfully.",
                incident: rows[0],
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to reassign incident.",
            });
        }
    };

    export const closeIncident = async (
        req: Request,
        res: Response
    ) => {
        try {
            const { incident_id } = req.params;

            const currentUser = req.user;

            if (!currentUser) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized.",
                });
            }

            const incidentResult = await pool.query(
                `
                SELECT *
                FROM incident_reports
                WHERE incident_id = $1
                `,
                [incident_id]
            );

            if (incidentResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Incident not found.",
                });
            }

            const incident = incidentResult.rows[0];

            // Only Administrator or assigned personnel can close
            if (
                currentUser.role !== "Administrator" &&
                incident.assigned_to !== currentUser.user_id
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You are not authorized to close this incident.",
                });
            }

            if (incident.status === "Closed") {
                return res.status(400).json({
                    success: false,
                    message: "Incident is already closed.",
                });
            }

            const { rows } = await pool.query(
                `
                UPDATE incident_reports
                SET
                    status = 'Closed',
                    updated_at = CURRENT_TIMESTAMP
                WHERE incident_id = $1
                RETURNING *;
                `,
                [incident_id]
            );

            return res.status(200).json({
                success: true,
                message: "Incident closed successfully.",
                incident: rows[0],
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to close incident.",
            });
        }
    };


    export const ResolveIncident = async (
        req: Request,
        res: Response
    ) => {
        try {
            const { incident_id } = req.params;

            const currentUser = req.user;

            if (!currentUser) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized.",
                });
            }

            const incidentResult = await pool.query(
                `
                SELECT *
                FROM incident_reports
                WHERE incident_id = $1
                `,
                [incident_id]
            );

            if (incidentResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Incident not found.",
                });
            }

            const incident = incidentResult.rows[0];

            // Administrator, the assigned personnel, or the reporter can resolve
            if (
                currentUser.role !== "Administrator" &&
                incident.assigned_to !== currentUser.user_id &&
                incident.reported_by !== currentUser.user_id
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You are not authorized to resolve this incident.",
                });
            }

            if (incident.status === "Resolved" || incident.status === "Closed") {
                return res.status(400).json({
                    success: false,
                    message: "Incident is already resolved or closed.",
                });
            }

            const { rows } = await pool.query(
                `
                UPDATE incident_reports
                SET
                    status = 'Resolved',
                    updated_at = CURRENT_TIMESTAMP
                WHERE incident_id = $1
                RETURNING *;
                `,
                [incident_id]
            );

            return res.status(200).json({
                success: true,
                message: "Incident resolved successfully.",
                incident: rows[0],
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to resolve incident.",
            });
        }
    };

    export const archiveIncident = async (
        req: Request,
        res: Response
    ) => {
        try {
            const { incident_id } = req.params;

            const incidentResult = await pool.query(
                `
                SELECT *
                FROM incident_reports
                WHERE incident_id = $1
                `,
                [incident_id]
            );

            if (incidentResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Incident not found.",
                });
            }

            const incident = incidentResult.rows[0];

            if (!["Resolved", "Closed"].includes(incident.status)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Only resolved or closed incidents can be archived.",
                });
            }

            const { rows } = await pool.query(
                `
                UPDATE incident_reports
                SET
                    pre_archive_status = status,
                    status = 'Archived',
                    updated_at = CURRENT_TIMESTAMP
                WHERE incident_id = $1
                RETURNING *;
                `,
                [incident_id]
            );

            return res.status(200).json({
                success: true,
                message: "Incident archived successfully.",
                incident: rows[0],
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to archive incident.",
            });
        }
    };

    export const restoreIncident = async (
        req: Request,
        res: Response
    ) => {
        try {
            const { incident_id } = req.params;

            const incidentResult = await pool.query(
                `
                SELECT *
                FROM incident_reports
                WHERE incident_id = $1
                `,
                [incident_id]
            );

            if (incidentResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Incident not found.",
                });
            }

            const incident = incidentResult.rows[0];

            if (incident.status !== "Archived") {
                return res.status(400).json({
                    success: false,
                    message: "Incident is not archived.",
                });
            }

            const { rows } = await pool.query(
                `
                UPDATE incident_reports
                SET
                    status = COALESCE(pre_archive_status, 'Resolved'),
                    pre_archive_status = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE incident_id = $1
                RETURNING *;
                `,
                [incident_id]
            );

            return res.status(200).json({
                success: true,
                message: "Incident restored successfully.",
                incident: rows[0],
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to restore incident.",
            });
        }
    };

    export const getArchivedIncidents = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const result = await pool.query(
                `
                SELECT
                    ir.incident_id,
                    ir.incident_number,
                    ir.title,
                    ir.category,
                    ir.severity,
                    ir.location,
                    ir.description,
                    ir.incident_image,
                    ir.status,
                    ir.created_at,
                    ir.updated_at,

                    ir.reported_by,
                    CONCAT(
                        reporter.first_name,
                        ' ',
                        reporter.last_name
                    ) AS reported_by_name,

                    ir.assigned_to,
                    CASE
                        WHEN assignee.user_id IS NULL THEN NULL
                        ELSE CONCAT(
                            assignee.first_name,
                            ' ',
                            assignee.last_name
                        )
                    END AS assigned_to_name

                FROM incident_reports ir

                INNER JOIN users reporter
                    ON reporter.user_id = ir.reported_by

                LEFT JOIN users assignee
                    ON assignee.user_id = ir.assigned_to

                WHERE ir.status = 'Archived'

                ORDER BY ir.updated_at DESC
                `
            );

            res.status(200).json({
                success: true,
                total: result.rowCount,
                incidents: result.rows,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to fetch archived incidents.",
            });
        }
    };

    export const getIncidentStatistics = async (
        req: Request,
        res: Response
    ) => {
        try {
            const { rows } = await pool.query(`
                SELECT
                    COUNT(*)::INT AS total_incidents,

                    COUNT(*) FILTER (
                        WHERE status = 'Pending'
                    )::INT AS pending_incidents,

                    COUNT(*) FILTER (
                        WHERE status IN ('Resolved', 'Closed')
                    )::INT AS resolved_incidents,

                    COUNT(DISTINCT assigned_to)::INT AS assigned_personnel

                FROM incident_reports;
            `);

            res.status(200).json({
                success: true,
                stats: rows[0],
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to fetch incident statistics.",
            });
        }
    };


    export const getMyAssignedIncidents = async (
        req: Request,
        res: Response
    ) => {
        try {
            const userId = req.user?.user_id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            const { rows } = await pool.query(
                `
                SELECT
                    ir.incident_id,
                    ir.incident_number,
                    ir.title,
                    ir.category,
                    ir.severity,
                    ir.location,
                    ir.description,
                    ir.incident_image,
                    ir.status,
                    ir.note,
                    ir.created_at,
                    ir.updated_at,

                    CONCAT(
                        reporter.first_name,
                        ' ',
                        reporter.last_name
                    ) AS reported_by,

                    CONCAT(
                        assignee.first_name,
                        ' ',
                        assignee.last_name
                    ) AS assigned_to

                FROM incident_reports ir

                INNER JOIN users reporter
                    ON reporter.user_id = ir.reported_by

                LEFT JOIN users assignee
                    ON assignee.user_id = ir.assigned_to

                WHERE
                    ir.assigned_to = $1
                    AND ir.status NOT IN ('Resolved', 'Closed')

                ORDER BY ir.created_at DESC
                `,
                [userId]
            );

            return res.status(200).json({
                success: true,
                count: rows.length,
                incidents: rows,
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch assigned incidents.",
            });
        }
    };

    export const getPersonnelDashboardStats = async (
        req: Request,
        res: Response
    ) => {
        try {
            const userId = req.user?.user_id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            const { rows } = await pool.query(
                `
                SELECT
                    COUNT(*) FILTER (
                        WHERE assigned_to = $1
                        AND status NOT IN ('Resolved', 'Closed')
                    )::INT AS assigned_incidents,

                    COUNT(*) FILTER (
                        WHERE assigned_to = $1
                        AND status = 'In Progress'
                    )::INT AS active_response,

                    COUNT(*) FILTER (
                        WHERE assigned_to = $1
                        AND status = 'Resolved'
                        AND DATE(updated_at) = CURRENT_DATE
                    )::INT AS resolved_today

                FROM incident_reports;
                `,
                [userId]
            );

            res.status(200).json({
                success: true,
                stats: rows[0],
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Failed to fetch personnel dashboard statistics.",
            });
        }
    };