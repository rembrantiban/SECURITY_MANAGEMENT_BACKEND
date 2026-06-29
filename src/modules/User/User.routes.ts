import { Router } from "express";
import {
  register,
  login,
  createUserByAdmin,
  updateUserStatus,
  getAllUsers,
  updateUser,
  deleteUser,
  changeAccountDetails,
  logout,
  getCurrentUser,
  getUserStatistics,
  getSecurityPersonnel,
  setDutySchedule,
  getUserById,
} from "./User.controller";
import  { verifyToken }  from "../../middleware/protectedRoute"

const router = Router();

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "test route works",
  });
});

router.post("/register", register);
router.get("/me", verifyToken, getCurrentUser);
router.post("/login", login);
router.post("/create-user", verifyToken, createUserByAdmin);
router.put("/update-user-status/:user_id", verifyToken, updateUserStatus);
router.get("/user/:user_id", verifyToken, getUserById);
router.get("/get-all-users", verifyToken, getAllUsers);
router.put("/update-user/:user_id", verifyToken, updateUser);
router.delete("/delete-user/:user_id", verifyToken, deleteUser);
router.put("/change-account-details", verifyToken, changeAccountDetails);
router.post("/logout", logout);
router.get("/statistics", verifyToken, getUserStatistics);
router.get("/security-personnel", verifyToken, getSecurityPersonnel);
router.put("/set-duty-schedule/:user_id", verifyToken, setDutySchedule);

export default router;