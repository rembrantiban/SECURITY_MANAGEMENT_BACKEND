"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_controller_1 = require("./User.controller");
const protectedRoute_1 = require("../../middleware/protectedRoute");
const router = (0, express_1.Router)();
console.log("Auth router mounted");
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "test route works",
    });
});
router.post("/register", User_controller_1.register);
router.get("/me", protectedRoute_1.verifyToken, User_controller_1.getCurrentUser);
router.post("/login", User_controller_1.login);
router.post("/create-user", protectedRoute_1.verifyToken, User_controller_1.createUserByAdmin);
router.put("/update-user-status/:user_id", protectedRoute_1.verifyToken, User_controller_1.updateUserStatus);
router.get("/user/:user_id", protectedRoute_1.verifyToken, User_controller_1.getUserById);
router.get("/get-all-users", protectedRoute_1.verifyToken, User_controller_1.getAllUsers);
router.put("/update-user/:user_id", protectedRoute_1.verifyToken, User_controller_1.updateUser);
router.put("/reset-user-password/:user_id", protectedRoute_1.verifyToken, User_controller_1.resetUserPassword);
router.delete("/delete-user/:user_id", protectedRoute_1.verifyToken, User_controller_1.deleteUser);
router.put("/change-account-details", protectedRoute_1.verifyToken, User_controller_1.changeAccountDetails);
router.post("/logout", User_controller_1.logout);
router.get("/statistics", protectedRoute_1.verifyToken, User_controller_1.getUserStatistics);
router.get("/security-personnel", protectedRoute_1.verifyToken, User_controller_1.getSecurityPersonnel);
//router.put("/set-duty-schedule/:user_id", verifyToken, setDutySchedule);
router.put("/change-password", protectedRoute_1.verifyToken, User_controller_1.changePassword);
router.put("/reset-admin-password", User_controller_1.resetAdminPassword);
router.put("/update-approval-status/:user_id", protectedRoute_1.verifyToken, User_controller_1.updateApprovalStatus);
exports.default = router;
