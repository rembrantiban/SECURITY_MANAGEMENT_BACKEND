import { Request, Response } from "express";
import { pool } from "../../config/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { logActivity } from "../Activity/Activity.controller";


export const resetAdminPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { password } = req.body;

    if (!password || password.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Password is required.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      UPDATE users
      SET
        password = $1,
        approval_status = 'Approved',
        status = TRUE
      WHERE role = 'Administrator'
      RETURNING
        user_id,
        username,
        email,
        role,
        approval_status,
        status
      `,
      [hashedPassword]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Administrator account not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Administrator password reset successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to reset administrator password.",
    });
  }
};

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      first_name,
      middle_name,
      last_name,
      username,
      email,
      password,
      role,
    } = req.body;

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: "User already exists",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
            INSERT INTO users
            (
                first_name,
                middle_name,
                last_name,
                username,
                email,
                password,
                role,
                approval_status
            )
            VALUES($1,$2,$3,$4,$5,$6,$7, 'Pending')
            RETURNING *
            `,
      [
        first_name,
        middle_name,
        last_name,
        username,
        email,
        hashedPassword,
        role,
      ]
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};


export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { login, password } = req.body;

    const result = await pool.query(
      `
            SELECT *
            FROM users
            WHERE email = $1
               OR username = $2
            `,
      [login, login]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    const user = result.rows[0];

    if (!user.status) {
      res.status(403).json({
        success: false,
        message: "Your account has been deactivated.",
      });
      return;
    }


    if (user.approval_status !== "Approved") {
      res.status(403).json({
        success: false,
        message: "Your account is not yet approved.",
      });
      return;
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    // Update last login
    await pool.query(
      `
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP
            WHERE user_id = $1
            `,
      [user.user_id]
    );

    logActivity(user.user_id, "Login", null, null, req.ip ?? null);

    const permissionResult = await pool.query(
      `
            SELECT
                p.permission_id,
                p.module_name,
                p.permission_name
            FROM role_permissions rp
            INNER JOIN permissions p
                ON p.permission_id = rp.permission_id
            WHERE rp.role = $1
            ORDER BY
                p.module_name,
                p.permission_name;
            `,
      [user.role]
    );

    const permissionNames = permissionResult.rows.map(
      permission => permission.permission_name
    );

    const permissions = permissionResult.rows;

    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role,
        permissions: permissionNames,
      },
      process.env.JWT_SECRET || "secret",
      {
        expiresIn: "1d",
      }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",

      token,

      user: {
        user_id: user.user_id,
        username: user.username,
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,

        permissions: permissions,
      },

      permission_details: permissions,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};


export const createUserByAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      first_name,
      middle_name,
      last_name,
      username,
      email,
      password,
      role,
    } = req.body;

    const existing = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existing.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: "User already exists",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const result = await pool.query(
      `
    INSERT INTO users
    (
        first_name,
        middle_name,
        last_name,
        username,
        email,
        password,
        role,
        approval_status
    )
    VALUES($1,$2,$3,$4,$5,$6,$7,'Approved')
    RETURNING *
    `,
      [
        first_name,
        middle_name,
        last_name,
        username,
        email,
        hashedPassword,
        role,
      ]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

export const updateUserStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user_id } = req.params;
    const { status } = req.body;

    if (typeof status !== "boolean") {
      res.status(400).json({
        success: false,
        message: "Status must be true or false",
      });
      return;
    }

    const user = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [user_id]
    );

    if (user.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const result = await pool.query(
      `
            UPDATE users
            SET status = $1
            WHERE user_id = $2
            RETURNING user_id, first_name, last_name, email, role, status, approval_status, on_duty
            `,
      [status, user_id]
    );

    res.status(200).json({
      success: true,
      message: status
        ? "User activated successfully"
        : "User deactivated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};


export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT
        user_id,
        first_name,
        middle_name,
        last_name,
        username,
        email,
        role,
        approval_status,  
        status,
        on_duty,
        created_at,
        last_login
      FROM users
      WHERE role NOT IN (
        'Administrator',
        'IT System Administrator'
      )
      ORDER BY created_at DESC
    `);

    res.status(200).json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user_id } = req.params;

    const user = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [user_id]
    );

    if (user.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    await pool.query(
      "DELETE FROM users WHERE user_id = $1",
      [user_id]
    );

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user_id } = req.params;

    const {
      first_name,
      middle_name,
      last_name,
      username,
      email,
      role,
      password,
    } = req.body;

    const user = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [user_id]
    );

    if (user.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    let hashedPassword = user.rows[0].password;

    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        first_name = $1,
        middle_name = $2,
        last_name = $3,
        username = $4,
        email = $5,
        role = $6,
        password = $7
      WHERE user_id = $8
      RETURNING
        user_id,
        first_name,
        middle_name,
        last_name,
        username,
        email,
        role,
        approval_status,
        status,
        on_duty,
        created_at,
        last_login
      `,
      [
        first_name,
        middle_name,
        last_name,
        username,
        email,
        role,
        hashedPassword,
        user_id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};


export const changeAccountDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user_id = req.user?.user_id;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const {
      first_name,
      middle_name,
      last_name,
      email,
      password,
    } = req.body;

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [user_id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Prevent duplicate email
    const emailExists = await pool.query(
      `
      SELECT user_id
      FROM users
      WHERE email = $1
      AND user_id <> $2
      `,
      [email, user_id]
    );

    if (emailExists.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: "Email is already in use.",
      });
      return;
    }

    let hashedPassword = existingUser.rows[0].password;

    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        first_name = $1,
        middle_name = $2,
        last_name = $3,
        email = $4,
        password = $5
      WHERE user_id = $6
      RETURNING
        user_id,
        first_name,
        middle_name,
        last_name,
        username,
        email,
        role,
        status,
        on_duty
      `,
      [
        first_name,
        middle_name,
        last_name,
        email,
        hashedPassword,
        user_id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Account updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update account",
    });
  }
};

export const resetUserPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user_id } = req.params;
    const { new_password, confirm_password } = req.body;

    if (!new_password || !confirm_password) {
      res.status(400).json({
        success: false,
        message: "New password and confirm password are required.",
      });
      return;
    }

    if (new_password !== confirm_password) {
      res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
      return;
    }

    if (new_password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
      return;
    }

    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE user_id = $1",
      [user_id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE user_id = $2
      `,
      [hashedPassword, user_id]
    );

    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to reset password.",
    });
  }
};

export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user_id = req.user?.user_id;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const {
      current_password,
      new_password,
      confirm_password,
    } = req.body;

    if (
      !current_password ||
      !new_password ||
      !confirm_password
    ) {
      res.status(400).json({
        success: false,
        message: "All password fields are required.",
      });
      return;
    }

    if (new_password !== confirm_password) {
      res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
      return;
    }

    const existingUser = await pool.query(
      `
      SELECT password
      FROM users
      WHERE user_id = $1
      `,
      [user_id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    const user = existingUser.rows[0];

    // Verify current password
    const isMatch = await bcrypt.compare(
      current_password,
      user.password
    );

    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
      return;
    }

    // Prevent using the same password
    const isSamePassword = await bcrypt.compare(
      new_password,
      user.password
    );

    if (isSamePassword) {
      res.status(400).json({
        success: false,
        message: "New password must be different from your current password.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(
      new_password,
      10
    );

    await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE user_id = $2
      `,
      [
        hashedPassword,
        user_id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to change password.",
    });
  }
};

export const logout = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.user_id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid user session",
      });
      return;
    }

    const userResult = await pool.query(
      `
            SELECT
                user_id,
                first_name,
                middle_name,
                last_name,
                username,
                email,
                role,
                status,
                approval_status,
                on_duty
            FROM users
            WHERE user_id = $1
            `,
      [req.user.user_id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    const user = userResult.rows[0];

    // Get permissions assigned to the user's role
    const permissionResult = await pool.query(
      `
            SELECT
                p.permission_id,
                p.module_name,
                p.permission_name
            FROM role_permissions rp
            INNER JOIN permissions p
                ON p.permission_id = rp.permission_id
            WHERE rp.role = $1
            ORDER BY
                p.module_name,
                p.permission_name;
            `,
      [user.role]
    );

    res.status(200).json({
      success: true,

      user: {
        ...user,

        permissions: permissionResult.rows,
      },
    });
  } catch (error) {
    console.error("Error in getCurrentUser:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch current user.",
    });
  }
};
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user_id } = req.params;

    const { rows } = await pool.query(
      `
            SELECT
                user_id,
                first_name,
                middle_name,
                last_name,
                username,
                email,
                role,
                approval_status,
                status,
                on_duty,
                created_at,
                last_login
            FROM users
            WHERE user_id = $1
            `,
      [user_id]
    );

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
    });
  }
};

export const getUserStatistics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_users,

        COUNT(*) FILTER (
          WHERE status = true
        ) AS active_users,

        COUNT(*) FILTER (
          WHERE role = 'Authorized Staff'
        ) AS authorized_staff,

        COUNT(*) FILTER (
          WHERE status = false
        ) AS disabled_users

      FROM users;
    `);

    const stats = result.rows[0];

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: Number(stats.total_users),
        activeUsers: Number(stats.active_users),
        administrators: Number(stats.authorized_staff),
        disabledUsers: Number(stats.disabled_users),
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics",
    });
  }
}

export const getSecurityPersonnel = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { rows } = await pool.query(`
            SELECT
                user_id,
                first_name,
                middle_name,
                last_name,
                CONCAT(
                    first_name,
                    ' ',
                    COALESCE(middle_name || ' ', ''),
                    last_name
                ) AS full_name,
                username,
                email,
                on_duty
            FROM users
            WHERE
                role = 'Security Personnel'
                AND status = TRUE
            ORDER BY first_name, last_name
        `);

    res.status(200).json({
      success: true,
      personnel: rows,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch security personnel.",
    });
  }
};

export const updateApprovalStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user_id } = req.params;
    const { approval_status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Approved",
      "Rejected",
    ];

    if (!allowedStatuses.includes(approval_status)) {
      res.status(400).json({
        success: false,
        message:
          "Approval status must be Pending, Approved, or Rejected.",
      });
      return;
    }

    const existingUser = await pool.query(
      `
      SELECT user_id
      FROM users
      WHERE user_id = $1
      `,
      [user_id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    const result = await pool.query(
      `
      UPDATE users
      SET approval_status = $1
      WHERE user_id = $2
      RETURNING
        user_id,
        first_name,
        middle_name,
        last_name,
        username,
        email,
        role,
        approval_status,
        status,
        on_duty,
        created_at,
        last_login
      `,
      [approval_status, user_id]
    );

    let message = "";

    switch (approval_status) {
      case "Approved":
        message = "Account approved successfully.";
        break;

      case "Rejected":
        message = "Account rejected successfully.";
        break;

      default:
        message = "Approval status updated successfully.";
    }

    res.status(200).json({
      success: true,
      message,
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update approval status.",
    });
  }
};