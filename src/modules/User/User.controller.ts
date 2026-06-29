import { Request, Response } from "express";
import { pool } from "../../config/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


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
                role
            )
            VALUES($1,$2,$3,$4,$5,$6,$7)
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
            "SELECT * FROM users WHERE email = $1 OR username = $2",
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

        if(!user.status) {
            res.status(403).json({
                success: false,
                message: "Your account has been deactivated",
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

        await pool.query(
            `
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP
            WHERE user_id = $1
            `,
            [user.user_id]
        );


        const token = jwt.sign(
            {
                user_id: user.user_id,
                role: user.role,
            },
            process.env.JWT_SECRET || "secret",
            {
                expiresIn: "1d",
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                user_id: user.user_id,
                username: user.username,
                first_name: user.first_name,
                middle_name: user.middle_name,
                email: user.email,
                last_name: user.last_name,
                role: user.role,
            },
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
                role
            )
            VALUES($1,$2,$3,$4,$5,$6,$7)
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
            RETURNING user_id, first_name, last_name, email, role, status, on_duty, duty_start, duty_end
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
        status,
        on_duty,
        duty_start,
        duty_end,
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
        status,
        on_duty,
        duty_start,
        duty_end,
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
      username,
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
        username = $4,
        email = $5,
        password = $6
      WHERE user_id = $7
      RETURNING
        user_id,
        first_name,
        middle_name,
        last_name,
        username,
        email,
        role,
        status,
        on_duty,
        duty_start,
        duty_end
      `,
      [
        first_name,
        middle_name,
        last_name,
        username,
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

export const logout = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
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
     console.log("GET CURRENT USER HIT");

    // Validate that user_id exists (should be set by middleware)
    if (!req.user?.user_id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid user session",
      });
      return;
    }

    const result = await pool.query(
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
        on_duty,
        duty_start,
        duty_end
      FROM users
      WHERE user_id = $1
      `,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found in database",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
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
                status,
                on_duty,
                duty_start,
                duty_end,
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
          WHERE role IN (
            'Administrator',
            'IT System Administrator'
          )
        ) AS administrators,

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
        administrators: Number(stats.administrators),
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
        const { onDuty } = req.query;

        let query = `
            SELECT
                user_id,
                first_name,
                middle_name,
                last_name,
                username,
                email,
                on_duty,
                duty_start,
                duty_end
            FROM users
            WHERE
                role = 'Security Personnel'
                AND status = true
        `;

        if (onDuty === "true") {
            query += " AND on_duty = true";
        }

        query += " ORDER BY first_name, last_name";

        const { rows } = await pool.query(query);

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

export const setDutySchedule = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { user_id } = req.params;
        const { duty_start, duty_end } = req.body;

        if (!duty_start || !duty_end) {
            res.status(400).json({
                success: false,
                message: "Duty start and duty end are required.",
            });
            return;
        }

        const { rows } = await pool.query(
            `
            SELECT
                user_id,
                role,
                duty_start,
                duty_end
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

        const user = rows[0];

        if (user.role !== "Security Personnel") {
            res.status(400).json({
                success: false,
                message: "Only Security Personnel can have a duty schedule.",
            });
            return;
        }

        if (user.duty_start || user.duty_end) {
            res.status(400).json({
                success: false,
                message: "Duty schedule has already been assigned.",
            });
            return;
        }

        const result = await pool.query(
            `
            UPDATE users
            SET
                duty_start = $1,
                duty_end = $2
            WHERE user_id = $3
            RETURNING
                user_id,
                first_name,
                last_name,
                duty_start,
                duty_end,
                on_duty;
            `,
            [
                duty_start,
                duty_end,
                user_id,
            ]
        );

        res.status(200).json({
            success: true,
            message: "Duty schedule assigned successfully.",
            user: result.rows[0],
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to assign duty schedule.",
        });
    }
};