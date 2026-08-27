import { verifyToken } from "../../middleware/protectedRoute";
import express from "express"
import { startPatrol, completePatrol, getMyPatrols, getMyCompletedPatrols, getAllPatrolLogs } from "./Patrol.controller";

const router = express.Router();

router.patch("/start/:schedule_id", verifyToken, startPatrol);
router.patch("/complete/:schedule_id", verifyToken, completePatrol);
router.get("/my-patrols", verifyToken, getMyPatrols);
router.get("/my-completed", verifyToken, getMyCompletedPatrols);
router.get("/logs", verifyToken, getAllPatrolLogs);
    
export default router;