"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const protectedRoute_1 = require("../../middleware/protectedRoute");
const express_1 = __importDefault(require("express"));
const Patrol_controller_1 = require("./Patrol.controller");
const router = express_1.default.Router();
router.patch("/start/:schedule_id", protectedRoute_1.verifyToken, Patrol_controller_1.startPatrol);
router.get("/my-completed", protectedRoute_1.verifyToken, Patrol_controller_1.getMyCompletedPatrols);
exports.default = router;
