import express from "express";
import {
    getRoles,
    createRole,
    updateRole,
    deleteRole,
} from "./Roles.controller";

const router = express.Router();

router.get("/roles", getRoles);

router.post("/roles", createRole);

router.put("/roles/:id", updateRole);

router.delete("/roles/:id", deleteRole);

export default router;