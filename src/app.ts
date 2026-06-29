import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter  from "./modules/User/User.routes"
import incidentRouter from "./modules/Incidents/incident.routes"

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
app.use(express.json());
app.use("/api/auth", userRouter);
app.use("/api/incidents", incidentRouter);


app.get("/api", (req, res) => {
  res.json({ message: "API is working!" });
});
export default app;
