import express from "express";
import upload from "../../middleware/upload";
import { createIncidentReport,
         getAllIncidents,
         getMyIncidentReports,
         getUserAssignedIncidents,
         assignIncident,
         reAssignIncident, 
         closeIncident,          
} from "./Incident.controller";
import { verifyToken } from "../../middleware/protectedRoute"

const router = express.Router();

router.post("/create-incident",verifyToken ,upload.single("incident_image"), createIncidentReport);
router.get("/get-all", getAllIncidents);
router.get("/get-my-incidents",verifyToken, getMyIncidentReports);
router.get("/get-assigned-incidents",verifyToken, getUserAssignedIncidents);
router.put("/assign/:incident_id", verifyToken, assignIncident);
router.put("/reassign/:incident_id", verifyToken, reAssignIncident);
router.put("/close/:incident_id", verifyToken, closeIncident);

export default router;