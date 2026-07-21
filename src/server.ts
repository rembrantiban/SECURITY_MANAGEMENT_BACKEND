import dotenv from "dotenv";
dotenv.config();
import app from "./app";
//import "./jobs/dutySchedular";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});