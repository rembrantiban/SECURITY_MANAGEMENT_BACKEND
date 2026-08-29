import express from "express";
import { verifyToken } from "../../middleware/protectedRoute";
import {
    sendNotification,
    getNotificationHistory,
    getMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    acknowledgeNotification,
} from "./Notification.controller";

const router = express.Router();

// Administrator — 9.1 / 9.2 / 9.3
router.post("/send", verifyToken, sendNotification);

// History — 9.4 (admin)
router.get("/history", verifyToken, getNotificationHistory);

// Recipient — 9.5 / 9.6 / 9.7 / 9.8 / 9.9
router.get("/my", verifyToken, getMyNotifications);
router.put("/read-all", verifyToken, markAllNotificationsRead);
router.put("/:notification_id/read", verifyToken, markNotificationRead);
router.put("/:notification_id/acknowledge", verifyToken, acknowledgeNotification);

export default router;
