"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Roles_controller_1 = require("./Roles.controller");
const router = express_1.default.Router();
router.get("/roles", Roles_controller_1.getRoles);
router.post("/roles", Roles_controller_1.createRole);
router.put("/roles/:id", Roles_controller_1.updateRole);
router.delete("/roles/:id", Roles_controller_1.deleteRole);
exports.default = router;
