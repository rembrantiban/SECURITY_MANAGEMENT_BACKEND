"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const protectedRoute_1 = require("../../middleware/protectedRoute");
const Blacklist_controller_1 = require("./Blacklist.controller");
const router = express_1.default.Router();
router.post("/add", protectedRoute_1.verifyToken, Blacklist_controller_1.addToBlacklist);
router.get("/get-all", protectedRoute_1.verifyToken, Blacklist_controller_1.getBlacklist);
router.put("/remove/:blacklist_id", protectedRoute_1.verifyToken, Blacklist_controller_1.removeFromBlacklist);
exports.default = router;
