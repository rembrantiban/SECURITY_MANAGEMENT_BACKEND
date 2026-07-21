import { Request, Response } from "express";
import { pool } from "../../config/db";
import { uploadToCloudinary } from "../../utils/UploadToCloudinary";

export const createAccessRequest = async (
    req: Request,
    res: Response
): Promise<void> => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const {
            first_name,
            middle_name,
            last_name,
            id_type,
            purpose,
        } = req.body;

        const requested_by = req.user?.user_id;

        if (
            !requested_by ||
            !first_name ||
            !last_name ||
            !purpose
        ) {
            res.status(400).json({
                success: false,
                message: "Please fill in all required fields.",
            });
            return;
        }

        let idImage: string | null = null;

        if (req.file) {
            const uploaded = await uploadToCloudinary(
                req.file,
                "visitor_ids"
            );

            idImage = uploaded.secure_url;
        }

        const year = new Date().getFullYear();

        const countResult = await client.query(
            `
            SELECT COUNT(*)::INTEGER AS total
            FROM access_requests
            WHERE EXTRACT(YEAR FROM created_at) = $1
            `,
            [year]
        );

        const nextNumber = countResult.rows[0].total + 1;

        const requestNumber = `REQ-${year}-${String(nextNumber).padStart(
            4,
            "0"
        )}`;

        const result = await client.query(
            `
            INSERT INTO access_requests
            (
                request_number,
                requested_by,
                first_name,
                middle_name,
                last_name,
                id_type,
                id_image,
                purpose
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8
            )
            RETURNING *
            `,
            [
                requestNumber,
                requested_by,
                first_name,
                middle_name || null,
                last_name,
                id_type || null,
                idImage,
                purpose,
            ]
        );

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Access request submitted successfully.",
            request: result.rows[0],
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to submit access request.",
        });
    } finally {
        client.release();
    }
};


export const getAllRequestedAccess = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const result = await pool.query(
            `
            SELECT
                ar.request_id,
                ar.request_number,

                ar.first_name,
                ar.middle_name,
                ar.last_name,

                ar.id_type,
                ar.id_image,
                ar.purpose,

                ar.status,

                ar.created_at,
                ar.updated_at,
                ar.approved_at,

                ar.requested_by,

                CONCAT(
                    requester.first_name,
                    ' ',
                    requester.last_name
                ) AS requested_by_name,

                ar.approved_by,

                CASE
                    WHEN approver.user_id IS NULL THEN NULL
                    ELSE CONCAT(
                        approver.first_name,
                        ' ',
                        approver.last_name
                    )
                END AS approved_by_name

            FROM access_requests ar

            INNER JOIN users requester
                ON requester.user_id = ar.requested_by

            LEFT JOIN users approver
                ON approver.user_id = ar.approved_by

            ORDER BY
                ar.created_at DESC
            `
        );

        res.status(200).json({
            success: true,
            total: result.rowCount,
            requests: result.rows,
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch access requests.",
        });
    }
}; 


export const approveAccessRequest = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { request_id } = req.params;

        const approved_by = req.user?.user_id;

        if (!approved_by) {
            res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
            return;
        }

        const request = await pool.query(
            `
            SELECT *
            FROM access_requests
            WHERE request_id = $1
            `,
            [request_id]
        );

        if (request.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Access request not found.",
            });
            return;
        }

        if (request.rows[0].status !== "Pending") {
            res.status(400).json({
                success: false,
                message: "Only pending requests can be approved.",
            });
            return;
        }

        const result = await pool.query(
            `
            UPDATE access_requests
            SET
                status = 'Approved',
                approved_by = $1,
                approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE request_id = $2
            RETURNING *
            `,
            [approved_by, request_id]
        );

        res.status(200).json({
            success: true,
            message: "Access request approved successfully.",
            request: result.rows[0],
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to approve access request.",
        });
    }
};

export const rejectAccessRequest = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { request_id } = req.params;

        const approved_by = req.user?.user_id;

        if (!approved_by) {
            res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
            return;
        }

        const request = await pool.query(
            `
            SELECT *
            FROM access_requests
            WHERE request_id = $1
            `,
            [request_id]
        );

        if (request.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Access request not found.",
            });
            return;
        }

        if (request.rows[0].status !== "Pending") {
            res.status(400).json({
                success: false,
                message: "Only pending requests can be rejected.",
            });
            return;
        }

        const result = await pool.query(
            `
            UPDATE access_requests
            SET
                status = 'Rejected',
                approved_by = $1,
                approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE request_id = $2
            RETURNING *
            `,
            [approved_by, request_id]
        );

        res.status(200).json({
            success: true,
            message: "Access request rejected successfully.",
            request: result.rows[0],
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to reject access request.",
        });
    }
};

export const getMyRequestAccess = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const requested_by = req.user?.user_id;

        if (!requested_by) {
            res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
            return;
        }

        const result = await pool.query(
            `
            SELECT
                ar.request_id,
                ar.request_number,

                ar.first_name,
                ar.middle_name,
                ar.last_name,

                ar.id_type,
                ar.id_image,
                ar.purpose,

                ar.status,

                ar.created_at,
                ar.updated_at,
                ar.approved_at,

                ar.requested_by,

                CONCAT(
                    requester.first_name,
                    ' ',
                    requester.last_name
                ) AS requested_by_name,

                ar.approved_by,

                CASE
                    WHEN approver.user_id IS NULL THEN NULL
                    ELSE CONCAT(
                        approver.first_name,
                        ' ',
                        approver.last_name
                    )
                END AS approved_by_name

            FROM access_requests ar

            INNER JOIN users requester
                ON requester.user_id = ar.requested_by

            LEFT JOIN users approver
                ON approver.user_id = ar.approved_by

            WHERE ar.requested_by = $1

            ORDER BY ar.created_at DESC
            `,
            [requested_by]
        );

        res.status(200).json({
            success: true,
            total: result.rowCount,
            requests: result.rows,
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch your access requests.",
        });
    }
};