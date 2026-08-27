"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Role_Permissions_controller_1 = require("./Role_Permissions.controller");
const router = express_1.default.Router();
router.get("/get-all", Role_Permissions_controller_1.getAllRolePermissions);
router.get("/get/:role", Role_Permissions_controller_1.getRolePermissions);
router.get("/matrix", Role_Permissions_controller_1.getPermissionMatrix);
router.post("/assign", Role_Permissions_controller_1.assignPermission);
router.delete("/delete/:role/:permission_id", Role_Permissions_controller_1.removePermission);
router.put("/update/:role", Role_Permissions_controller_1.updateRolePermissions);
exports.default = router;
