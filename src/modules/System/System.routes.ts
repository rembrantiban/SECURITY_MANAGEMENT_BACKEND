import express from "express";
import { verifyToken } from "../../middleware/protectedRoute";
import { getSystemStatus } from "./System.controller";

const router = express.Router();

router.get("/status", verifyToken, getSystemStatus);

export default router;
