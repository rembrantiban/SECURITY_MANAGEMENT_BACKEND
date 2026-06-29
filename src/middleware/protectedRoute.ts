import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "secret";

interface JwtPayload {
  user_id: number;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as JwtPayload;

    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};