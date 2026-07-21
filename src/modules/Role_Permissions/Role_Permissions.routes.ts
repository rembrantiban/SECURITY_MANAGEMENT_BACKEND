import express from "express";
import {
    getAllRolePermissions,
    getRolePermissions,
    getPermissionMatrix,
    assignPermission,
    removePermission,
    updateRolePermissions,
} from "./Role_Permissions.controller";

const router = express.Router();

router.get("/get-all", getAllRolePermissions);

router.get("/get/:role", getRolePermissions);

router.get("/matrix", getPermissionMatrix);

router.post("/assign", assignPermission);

router.delete(
    "/delete/:role/:permission_id",
    removePermission
);

router.put(
    "/update/:role",
    updateRolePermissions
);

export default router;