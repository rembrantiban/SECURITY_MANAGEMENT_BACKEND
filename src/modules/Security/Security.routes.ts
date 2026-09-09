import express from "express";

import {
    verifyToken,
    requireRole,
} from "../../middleware/protectedRoute";
import {
    getSecuritySettings,
    updateSecuritySettings,
} from "./Security.controller";

const router = express.Router();

/**
 * Authentication & Account Security Settings (spec 2.30).
 * Restricted to the IT / System Administrator.
 */
router.get(
    "/",
    verifyToken,
    requireRole("IT System Administrator"),
    getSecuritySettings
);

router.put(
    "/",
    verifyToken,
    requireRole("IT System Administrator"),
    updateSecuritySettings
);

export default router;
