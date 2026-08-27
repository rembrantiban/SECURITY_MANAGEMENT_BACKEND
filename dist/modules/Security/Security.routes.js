"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Security_controller_1 = require("./Security.controller");
const router = express_1.default.Router();
router.get("/", Security_controller_1.getSecuritySettings);
router.put("/", Security_controller_1.updateSecuritySettings);
exports.default = router;
