import express from "express";
import { verifyToken } from "../../middleware/protectedRoute";
import {
    addToBlacklist,
    checkBlacklist,
    getBlacklist,
    removeFromBlacklist,
} from "./Blacklist.controller";

const router = express.Router();

router.post("/add", verifyToken, addToBlacklist);
router.get("/get-all", verifyToken, getBlacklist);
router.get("/check", verifyToken, checkBlacklist);
router.put("/remove/:blacklist_id", verifyToken, removeFromBlacklist);

export default router;
