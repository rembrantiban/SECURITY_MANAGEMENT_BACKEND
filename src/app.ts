import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter  from "./modules/User/User.routes"
import incidentRouter from "./modules/Incidents/incident.routes"
import motoringRoutes  from "./modules/Monitoring/Monitoring.routes"
import PatrolRoutes from "./modules/Patrol/Patrol.routes"
import RequestRoutes from "./modules/Request/Request.routes"
import PermissionsRoutes from "./modules/Permissions/Permissions.routes"
import RolePermissionRoutes from "./modules/Role_Permissions/Role_Permissions.routes"

const app = express();

app.use(cookieParser());
app.use(cors(
    {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders:["Content-Type", "Authorization"]
    }
));

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
app.get("/api", (req, res) => {
  res.json({ message: "API is working!" });
});
export default app;
