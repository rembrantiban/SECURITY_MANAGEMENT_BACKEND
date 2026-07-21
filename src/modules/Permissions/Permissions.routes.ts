import { Router } from "express";

import {
    getPermissions,
    getPermissionById,
    createPermission,
    updatePermission,
    deletePermission,
} from "./Permissions.controller";

const router = Router();

router.get("/list", getPermissions);

router.get("/detail/:id", getPermissionById);

router.post("/create", createPermission);

router.put("/update/:id", updatePermission);

router.delete("/delete/:id", deletePermission);

export default router;