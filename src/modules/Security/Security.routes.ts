import express from "express";

import {
    getSecuritySettings,
    updateSecuritySettings,
} from "./Security.controller";

const router = express.Router();

router.get("/", getSecuritySettings);

router.put("/", updateSecuritySettings);

export default router;