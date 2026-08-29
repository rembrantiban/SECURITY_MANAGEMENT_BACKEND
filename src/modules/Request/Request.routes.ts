import express from "express"
import { verifyToken } from "../../middleware/protectedRoute"
import { getMyRequestAccess, approveAccessRequest, rejectAccessRequest,getAllRequestedAccess, getAllPendingRequestAccess, createAccessRequest, recordVisitorExit } from "./Request.controller"
import upload from "../../middleware/upload"
const router = express.Router()

router.post("/create", verifyToken, upload.single("id_image"), createAccessRequest)
router.get("/get-my-requests", verifyToken, getMyRequestAccess)
router.get("/get-all", verifyToken, getAllRequestedAccess)
router.get("/get-all-pending", verifyToken, getAllPendingRequestAccess)
router.put("/approve/:request_id", verifyToken, approveAccessRequest)
router.put("/reject/:request_id", verifyToken, rejectAccessRequest)
router.put("/checkout/:request_id", verifyToken, recordVisitorExit)

export default router