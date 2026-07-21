import { Request, Response } from "express";
import { pool } from "../../config/db";

/**
 * GET ALL PERMISSIONS
 */
export const getPermissions = async (
    req: Request,
    res: Response
) => {
    try {
        const { rows } = await pool.query(
            `
            SELECT
                permission_id,
                module_name,
                permission_name

            FROM permissions

            ORDER BY
                module_name,
                permission_name;
            `
        );

        return res.status(200).json({
            success: true,
            total: rows.length,
            permissions: rows,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch permissions.",
        });
    }
};

/**
 * GET SINGLE PERMISSION
 */
export const getPermissionById = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            `
            SELECT
                permission_id,
                module_name,
                permission_name

            FROM permissions

            WHERE permission_id = $1;
            `,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Permission not found.",
            });
        }

        return res.status(200).json({
            success: true,
            permission: rows[0],
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch permission.",
        });
    }
};

/**
 * CREATE PERMISSION
 */
export const createPermission = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            module_name,
            permission_name,
        } = req.body;

        if (!module_name || !permission_name) {
            return res.status(400).json({
                success: false,
                message:
                    "Module name and permission name are required.",
            });
        }

        const exists = await pool.query(
            `
            SELECT permission_id

            FROM permissions

            WHERE permission_name = $1;
            `,
            [permission_name]
        );

        if (exists.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "Permission already exists.",
            });
        }

        const { rows } = await pool.query(
            `
            INSERT INTO permissions
            (
                module_name,
                permission_name
            )
            VALUES
            (
                $1,
                $2
            )
            RETURNING *;
            `,
            [
                module_name,
                permission_name,
            ]
        );

        return res.status(201).json({
            success: true,
            message:
                "Permission created successfully.",
            permission: rows[0],
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to create permission.",
        });
    }
};

/**
 * UPDATE PERMISSION
 */
export const updatePermission = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        const {
            module_name,
            permission_name,
        } = req.body;

        if (!module_name || !permission_name) {
            return res.status(400).json({
                success: false,
                message:
                    "Module name and permission name are required.",
            });
        }

        const exists = await pool.query(
            `
            SELECT permission_id

            FROM permissions

            WHERE
                permission_name = $1
            AND
                permission_id <> $2;
            `,
            [
                permission_name,
                id,
            ]
        );

        if (exists.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "Permission already exists.",
            });
        }

        const { rows } = await pool.query(
            `
            UPDATE permissions

            SET
                module_name = $1,
                permission_name = $2

            WHERE
                permission_id = $3

            RETURNING *;
            `,
            [
                module_name,
                permission_name,
                id,
            ]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Permission not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                "Permission updated successfully.",
            permission: rows[0],
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to update permission.",
        });
    }
};

/**
 * DELETE PERMISSION
 */
export const deletePermission = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        const assigned = await pool.query(
            `
            SELECT role_permission_id

            FROM role_permissions

            WHERE permission_id = $1;
            `,
            [id]
        );

        if (assigned.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Cannot delete permission because it is assigned to one or more roles.",
            });
        }

        const result = await pool.query(
            `
            DELETE FROM permissions

            WHERE permission_id = $1;
            `,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Permission not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                "Permission deleted successfully.",
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to delete permission.",
        });
    }
};