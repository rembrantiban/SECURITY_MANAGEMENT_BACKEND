import express from "express";
import { verifyToken } from "../../middleware/protectedRoute";
import { getActivityLogs } from "./Activity.controller";

const router = express.Router();

router.get("/logs", verifyToken, getActivityLogs);

export default router;
