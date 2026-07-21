import { verifyToken } from "../../middleware/protectedRoute";
import express from "express"
import { startPatrol, getMyCompletedPatrols } from "./Patrol.controller";

const router = express.Router();

router.patch("/start/:schedule_id", verifyToken, startPatrol);
router.get("/my-completed", verifyToken, getMyCompletedPatrols);
    
export default router;