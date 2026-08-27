import express from "express";
import upload from "../../middleware/upload";
import { createIncidentReport,
         getAllIncidents,
         getMyIncidentReports,
         getMySubmittedIncidents,
         getUserAssignedIncidents,
         assignIncident,
         reAssignIncident,
         closeIncident,
         getIncidentStatistics,
         getMyAssignedIncidents,
         getPersonnelDashboardStats,
         ResolveIncident,
         updateIncident,
         archiveIncident,
         restoreIncident,
         getArchivedIncidents,
} from "./Incident.controller";
import { verifyToken } from "../../middleware/protectedRoute"

const router = express.Router();

router.post("/create-incident",verifyToken ,upload.single("incident_image"), createIncidentReport);
router.put("/update/:incident_id", verifyToken,upload.single("incident_image"), updateIncident);
router.get("/get-all", getAllIncidents);
router.get("/get-my-incidents",verifyToken, getMyIncidentReports);
router.get("/my-submitted-incidents", verifyToken, getMySubmittedIncidents);
router.get("/get-assigned-incidents",verifyToken, getUserAssignedIncidents);
router.put("/assign/:incident_id", verifyToken, assignIncident);
router.put("/reassign/:incident_id", verifyToken, reAssignIncident);
router.put("/close/:incident_id", verifyToken, closeIncident);
router.put("/resolve/:incident_id", verifyToken, ResolveIncident);
router.get("/statistics", verifyToken, getIncidentStatistics);
router.get("/my-assigned-incidents", verifyToken, getMyAssignedIncidents);
router.get("/personnel-dashboard-stats", verifyToken, getPersonnelDashboardStats);
router.get("/archived", verifyToken, getArchivedIncidents);
router.put("/archive/:incident_id", verifyToken, archiveIncident);
router.put("/restore/:incident_id", verifyToken, restoreIncident);

export default router;