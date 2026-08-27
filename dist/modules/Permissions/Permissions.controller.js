"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePermission = exports.updatePermission = exports.createPermission = exports.getPermissionById = exports.getPermissions = void 0;
const db_1 = require("../../config/db");
/**
 * GET ALL PERMISSIONS
 */
const getPermissions = async (req, res) => {
    try {
        const { rows } = await db_1.pool.query(`
            SELECT
                permission_id,
                module_name,
                permission_name

            FROM permissions

            ORDER BY
                module_name,
                permission_name;
            `);
        return res.status(200).json({
            success: true,
            total: rows.length,
            permissions: rows,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch permissions.",
        });
    }
};
exports.getPermissions = getPermissions;
/**
 * GET SINGLE PERMISSION
 */
const getPermissionById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db_1.pool.query(`
            SELECT
                permission_id,
                module_name,
                permission_name

            FROM permissions

            WHERE permission_id = $1;
            `, [id]);
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch permission.",
        });
    }
};
exports.getPermissionById = getPermissionById;
/**
 * CREATE PERMISSION
 */
const createPermission = async (req, res) => {
    try {
        const { module_name, permission_name, } = req.body;
        if (!module_name || !permission_name) {
            return res.status(400).json({
                success: false,
                message: "Module name and permission name are required.",
            });
        }
        const exists = await db_1.pool.query(`
            SELECT permission_id

            FROM permissions

            WHERE permission_name = $1;
            `, [permission_name]);
        if (exists.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Permission already exists.",
            });
        }
        const { rows } = await db_1.pool.query(`
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
            `, [
            module_name,
            permission_name,
        ]);
        return res.status(201).json({
            success: true,
            message: "Permission created successfully.",
            permission: rows[0],
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to create permission.",
        });
    }
};
exports.createPermission = createPermission;
/**
 * UPDATE PERMISSION
 */
const updatePermission = async (req, res) => {
    try {
        const { id } = req.params;
        const { module_name, permission_name, } = req.body;
        if (!module_name || !permission_name) {
            return res.status(400).json({
                success: false,
                message: "Module name and permission name are required.",
            });
        }
        const exists = await db_1.pool.query(`
            SELECT permission_id

            FROM permissions

            WHERE
                permission_name = $1
            AND
                permission_id <> $2;
            `, [
            permission_name,
            id,
        ]);
        if (exists.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Permission already exists.",
            });
        }
        const { rows } = await db_1.pool.query(`
            UPDATE permissions

            SET
                module_name = $1,
                permission_name = $2

            WHERE
                permission_id = $3

            RETURNING *;
            `, [
            module_name,
            permission_name,
            id,
        ]);
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Permission not found.",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Permission updated successfully.",
            permission: rows[0],
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to update permission.",
        });
    }
};
exports.updatePermission = updatePermission;
/**
 * DELETE PERMISSION
 */
const deletePermission = async (req, res) => {
    try {
        const { id } = req.params;
        const assigned = await db_1.pool.query(`
            SELECT role_permission_id

            FROM role_permissions

            WHERE permission_id = $1;
            `, [id]);
        if (assigned.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete permission because it is assigned to one or more roles.",
            });
        }
        const result = await db_1.pool.query(`
            DELETE FROM permissions

            WHERE permission_id = $1;
            `, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Permission not found.",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Permission deleted successfully.",
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete permission.",
        });
    }
};
exports.deletePermission = deletePermission;
