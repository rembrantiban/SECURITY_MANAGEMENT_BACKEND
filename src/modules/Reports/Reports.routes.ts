import express from "express";
import { verifyToken } from "../../middleware/protectedRoute";
import {
    createReportGeneration,
    getReportGenerations,
} from "./Reports.controller";

const router = express.Router();

router.get("/generations", verifyToken, getReportGenerations);
router.post("/generations", verifyToken, createReportGeneration);

export default router;
