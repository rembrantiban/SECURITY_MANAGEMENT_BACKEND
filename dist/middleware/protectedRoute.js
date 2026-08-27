"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const verifyToken = (req, res, next) => {
    try {
        const token = req.cookies?.token ||
            req.headers.authorization?.split(" ")[1];
        if (!token) {
            res.status(401).json({
                success: false,
                message: "Unauthorized: No token provided",
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }
};
exports.verifyToken = verifyToken;
