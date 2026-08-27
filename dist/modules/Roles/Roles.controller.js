"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoles = void 0;
const db_1 = require("../../config/db");
const getRoles = async (req, res) => {
    try {
        const { rows } = await db_1.pool.query(`
            SELECT
                role_id,
                role_name,
                description,
                created_at,
                updated_at
            FROM system_roles
            ORDER BY role_name ASC;
            `);
        res.status(200).json({
            success: true,
            total: rows.length,
            roles: rows,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch roles.",
        });
    }
};
exports.getRoles = getRoles;
const createRole = async (req, res) => {
    try {
        const { role_name, description } = req.body;
        if (!role_name) {
            res.status(400).json({
                success: false,
                message: "Role name is required.",
            });
            return;
        }
        const exists = await db_1.pool.query(`
            SELECT role_id
            FROM system_roles
            WHERE LOWER(role_name)=LOWER($1)
            `, [role_name]);
        if (exists.rowCount) {
            res.status(409).json({
                success: false,
                message: "Role already exists.",
            });
            return;
        }
        const { rows } = await db_1.pool.query(`
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
            `, [
            role_name,
            description || null,
        ]);
        res.status(201).json({
            success: true,
            message: "Role created successfully.",
            role: rows[0],
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to create role.",
        });
    }
};
exports.createRole = createRole;
const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role_name, description, } = req.body;
        const role = await db_1.pool.query(`
            SELECT *
            FROM system_roles
            WHERE role_id=$1
            `, [id]);
        if (role.rowCount === 0) {
            res.status(404).json({
                success: false,
                message: "Role not found.",
            });
            return;
        }
        const { rows } = await db_1.pool.query(`
            UPDATE system_roles
            SET
                role_name=$1,
                description=$2,
                updated_at=CURRENT_TIMESTAMP
            WHERE role_id=$3
            RETURNING *;
            `, [
            role_name,
            description,
            id,
        ]);
        res.status(200).json({
            success: true,
            message: "Role updated successfully.",
            role: rows[0],
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to update role.",
        });
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await db_1.pool.query(`
            SELECT *
            FROM system_roles
            WHERE role_id=$1
            `, [id]);
        if (role.rowCount === 0) {
            res.status(404).json({
                success: false,
                message: "Role not found.",
            });
            return;
        }
        await db_1.pool.query(`
            DELETE
            FROM system_roles
            WHERE role_id=$1
            `, [id]);
        res.status(200).json({
            success: true,
            message: "Role deleted successfully.",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to delete role.",
        });
    }
};
exports.deleteRole = deleteRole;
