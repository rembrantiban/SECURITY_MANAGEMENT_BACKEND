"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const protectedRoute_1 = require("../../middleware/protectedRoute");
const Request_controller_1 = require("./Request.controller");
const upload_1 = __importDefault(require("../../middleware/upload"));
const router = express_1.default.Router();
router.post("/create", protectedRoute_1.verifyToken, upload_1.default.single("id_image"), Request_controller_1.createAccessRequest);
router.get("/get-my-requests", protectedRoute_1.verifyToken, Request_controller_1.getMyRequestAccess);
router.get("/get-all", protectedRoute_1.verifyToken, Request_controller_1.getAllRequestedAccess);
router.put("/approve/:request_id", protectedRoute_1.verifyToken, Request_controller_1.approveAccessRequest);
router.put("/reject/:request_id", protectedRoute_1.verifyToken, Request_controller_1.rejectAccessRequest);
router.put("/checkout/:request_id", protectedRoute_1.verifyToken, Request_controller_1.recordVisitorExit);
exports.default = router;
