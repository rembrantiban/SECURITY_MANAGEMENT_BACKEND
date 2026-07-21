import { Request, Response } from "express";
import { pool } from "../../config/db";

const VALID_ROLES = [
    "Administrator",
    "Security Personnel",
    "IT System Administrator",
    "Authorized Staff",
];


export const getAllRolePermissions = async (
    req: Request,
    res: Response
) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                rp.role_permission_id,
                rp.role,

                p.permission_id,
                p.permission_name,
                p.module,
                p.description,

                rp.created_at

            FROM role_permissions rp

            INNER JOIN permissions p
                ON p.permission_id = rp.permission_id

            ORDER BY
                rp.role,
                p.module,
                p.permission_name;
        `);

        return res.status(200).json({
            success: true,
            total: rows.length,
            permissions: rows,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch role permissions.",
        });
    }
};

/**
 * GET PERMISSIONS OF A ROLE
 */
export const getRolePermissions = async (
    req: Request,
    res: Response
) => {
    try {
        const { role } = req.params as { role: string };

        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role.",
            });
        }

        const { rows } = await pool.query(
            `
            SELECT
                p.permission_id,
                p.permission_name,
                p.module_name

            FROM role_permissions rp

            INNER JOIN permissions p
                ON p.permission_id = rp.permission_id

            WHERE rp.role = $1

            ORDER BY
                p.module_name,
                p.permission_name;
            `,
            [role]
        );

        return res.status(200).json({
            success: true,
            role,
            permissions: rows,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch role permissions.",
        });
    }
};
/**
 * GET PERMISSION MATRIX
 */
export const getPermissionMatrix = async (
    req: Request,
    res: Response
) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                role,
                permission_id
            FROM role_permissions
            ORDER BY role;
        `);

        const matrix: Record<string, number[]> = {};

        VALID_ROLES.forEach((role) => {
            matrix[role] = [];
        });

        rows.forEach((row) => {
            matrix[row.role].push(row.permission_id);
        });

        return res.status(200).json({
            success: true,
            matrix,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch permission matrix.",
        });
    }
};

/**
 * ASSIGN SINGLE PERMISSION
 */
export const assignPermission = async (
    req: Request,
    res: Response
) => {
    try {
        const { role, permission_id } = req.body;

        if (!role || !permission_id) {
            return res.status(400).json({
                success: false,
                message: "Role and permission are required.",
            });
        }

        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role.",
            });
        }

        const permission = await pool.query(
            `
            SELECT permission_id
            FROM permissions
            WHERE permission_id = $1
            `,
            [permission_id]
        );

        if (permission.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Permission not found.",
            });
        }

        const { rows } = await pool.query(
            `
            INSERT INTO role_permissions
            (
                role,
                permission_id
            )
            VALUES
            (
                $1,
                $2
            )
            ON CONFLICT
            (
                role,
                permission_id
            )
            DO NOTHING

            RETURNING *;
            `,
            [role, permission_id]
        );

        return res.status(201).json({
            success: true,
            message: "Permission assigned successfully.",
            rolePermission: rows[0] ?? null,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to assign permission.",
        });
    }
};

/**
 * REMOVE SINGLE PERMISSION
 */
export const removePermission = async (
    req: Request,
    res: Response
) => {
    try {
        const { role, permission_id } = req.params;

        await pool.query(
            `
            DELETE FROM role_permissions

            WHERE
                role = $1
            AND
                permission_id = $2;
            `,
            [role, permission_id]
        );

        return res.status(200).json({
            success: true,
            message: "Permission removed successfully.",
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to remove permission.",
        });
    }
};

/**
 * UPDATE PERMISSION MATRIX
 */
export const updateRolePermissions = async (
    req: Request,
    res: Response
) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const { role } = req.params as { role: string };
        const { permission_ids } = req.body;

        if (!VALID_ROLES.includes(role)) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Invalid role.",
            });
        }

        if (!Array.isArray(permission_ids)) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "permission_ids must be an array.",
            });
        }

        const uniquePermissions = [...new Set(permission_ids)];

        for (const permission_id of uniquePermissions) {
            const permission = await client.query(
                `
                SELECT permission_id
                FROM permissions
                WHERE permission_id = $1
                `,
                [permission_id]
            );

            if (permission.rowCount === 0) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    message: `Permission ${permission_id} not found.`,
                });
            }
        }

        await client.query(
            `
            DELETE FROM role_permissions
            WHERE role = $1;
            `,
            [role]
        );

        for (const permission_id of uniquePermissions) {
            await client.query(
                `
                INSERT INTO role_permissions
                (
                    role,
                    permission_id
                )
                VALUES
                (
                    $1,
                    $2
                );
                `,
                [role, permission_id]
            );
        }

        await client.query("COMMIT");

        const updated = await pool.query(
            `
        SELECT
            p.permission_id,
            p.permission_name,
            p.module_name

        FROM role_permissions rp

        INNER JOIN permissions p
            ON p.permission_id = rp.permission_id

        WHERE rp.role = $1

        ORDER BY
            p.module_name,
            p.permission_name;
    `,
            [role]
        );

        return res.status(200).json({
            success: true,
            message: "Permission matrix updated successfully.",
            role,
            permissions: updated.rows,
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to update permission matrix.",
        });
    } finally {
        client.release();
    }
};