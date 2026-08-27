import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./modules/User/User.routes"
import incidentRouter from "./modules/Incidents/incident.routes"
import motoringRoutes from "./modules/Monitoring/Monitoring.routes"
import PatrolRoutes from "./modules/Patrol/Patrol.routes"
import RequestRoutes from "./modules/Request/Request.routes"
import PermissionsRoutes from "./modules/Permissions/Permissions.routes"
import RolePermissionRoutes from "./modules/Role_Permissions/Role_Permissions.routes"
import BlacklistRoutes from "./modules/Blacklist/Blacklist.routes"

const app = express();

app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL!,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      console.log("ORIGIN:", origin);
      console.log("ALLOWED:", allowedOrigins);
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },


    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.originalUrl);
  next();
});

app.use(express.json());
app.use("/api/auth", userRouter);
console.log("Auth router mounted");
app.use("/api/incidents", incidentRouter);
app.use("/api/monitoring", motoringRoutes);
app.use("/api/patrol", PatrolRoutes);
app.use("/api/access-request", RequestRoutes);
app.use("/api/permissions", PermissionsRoutes);
app.use("/api/role-permissions", RolePermissionRoutes);
app.use("/api/blacklist", BlacklistRoutes);
app.get("/api", (req, res) => {
  res.json({ message: "API is working!" });
});
export default app;
