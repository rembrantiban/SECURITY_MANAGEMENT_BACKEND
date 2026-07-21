import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getRoles = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { rows } = await pool.query(
            `
            SELECT
                role_id,
                role_name,
                description,
                created_at,
                updated_at
            FROM system_roles
            ORDER BY role_name ASC;
            `
        );

        res.status(200).json({
            success: true,
            total: rows.length,
            roles: rows,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch roles.",
        });
    }
};

export const createRole = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { role_name, description } = req.body;

        if (!role_name) {
            res.status(400).json({
                success: false,
                message: "Role name is required.",
            });
            return;
        }

        const exists = await pool.query(
            `
            SELECT role_id
            FROM system_roles
            WHERE LOWER(role_name)=LOWER($1)
            `,
            [role_name]
        );

        if (exists.rowCount) {
            res.status(409).json({
                success: false,
                message: "Role already exists.",
            });
            return;
        }

        const { rows } = await pool.query(
            `
            INSERT INTO system_roles
            (
                role_name,
                description
            )
            VALUES
            (
                $1,
                $2
            )
            RETURNING *;
            `,
            [
                role_name,
                description || null,
            ]
        );

        res.status(201).json({
            success: true,
            message: "Role created successfully.",
            role: rows[0],
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create role.",
        });
    }
};

export const updateRole = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        const {
            role_name,
            description,
        } = req.body;

        const role = await pool.query(
            `
            SELECT *
            FROM system_roles
            WHERE role_id=$1
            `,
            [id]
        );

        if (role.rowCount === 0) {
            res.status(404).json({
                success: false,
                message: "Role not found.",
            });
            return;
        }

        const { rows } = await pool.query(
            `
            UPDATE system_roles
            SET
                role_name=$1,
                description=$2,
                updated_at=CURRENT_TIMESTAMP
            WHERE role_id=$3
            RETURNING *;
            `,
            [
                role_name,
                description,
                id,
            ]
        );

        res.status(200).json({
            success: true,
            message: "Role updated successfully.",
            role: rows[0],
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to update role.",
        });
    }
};

export const deleteRole = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        const role = await pool.query(
            `
            SELECT *
            FROM system_roles
            WHERE role_id=$1
            `,
            [id]
        );

        if (role.rowCount === 0) {
            res.status(404).json({
                success: false,
                message: "Role not found.",
            });
            return;
        }

        await pool.query(
            `
            DELETE
            FROM system_roles
            WHERE role_id=$1
            `,
            [id]
        );

        res.status(200).json({
            success: true,
            message: "Role deleted successfully.",
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to delete role.",
        });
    }
};