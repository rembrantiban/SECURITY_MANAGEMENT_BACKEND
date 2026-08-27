"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const User_routes_1 = __importDefault(require("./modules/User/User.routes"));
const incident_routes_1 = __importDefault(require("./modules/Incidents/incident.routes"));
const Monitoring_routes_1 = __importDefault(require("./modules/Monitoring/Monitoring.routes"));
const Patrol_routes_1 = __importDefault(require("./modules/Patrol/Patrol.routes"));
const Request_routes_1 = __importDefault(require("./modules/Request/Request.routes"));
const Permissions_routes_1 = __importDefault(require("./modules/Permissions/Permissions.routes"));
const Role_Permissions_routes_1 = __importDefault(require("./modules/Role_Permissions/Role_Permissions.routes"));
const app = (0, express_1.default)();
app.use((0, cookie_parser_1.default)());
const allowedOrigins = [
    "http://localhost:5173",
    process.env.CLIENT_URL,
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        console.log("ORIGIN:", origin);
        console.log("ALLOWED:", allowedOrigins);
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use((req, res, next) => {
    console.log("REQUEST:", req.method, req.originalUrl);
    next();
});
app.use(express_1.default.json());
app.use("/api/auth", User_routes_1.default);
console.log("Auth router mounted");
app.use("/api/incidents", incident_routes_1.default);
app.use("/api/monitoring", Monitoring_routes_1.default);
app.use("/api/patrol", Patrol_routes_1.default);
app.use("/api/access-request", Request_routes_1.default);
app.use("/api/permissions", Permissions_routes_1.default);
app.use("/api/role-permissions", Role_Permissions_routes_1.default);
app.get("/api", (req, res) => {
    res.json({ message: "API is working!" });
});
exports.default = app;
