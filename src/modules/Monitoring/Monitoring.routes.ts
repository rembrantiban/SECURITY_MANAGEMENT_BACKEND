import { Router } from "express";
import { verifyToken } from "../../middleware/protectedRoute";
import {
    createMonitoringSchedule,
    getMonitoringSchedules,
    updateMonitoringSchedule,
    deleteMonitoringSchedule,
    updateMonitoringScheduleStatus,
    getMyMonitoringSchedules
} from "./Monitoring.controller";

const router = Router();


router.post( "/create", verifyToken, createMonitoringSchedule);

router.get( "/getAll",verifyToken,getMonitoringSchedules);

router.put( "/update/:schedule_id", verifyToken, updateMonitoringSchedule);

router.delete( "/delete/:schedule_id", verifyToken, deleteMonitoringSchedule);

router.patch("/update-status/:schedule_id/status", verifyToken,updateMonitoringScheduleStatus);

router.get("/getMySchedules", verifyToken, getMyMonitoringSchedules);

export default router;