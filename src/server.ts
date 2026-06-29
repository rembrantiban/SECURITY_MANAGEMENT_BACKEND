import dotenv from "dotenv";
import app from "./app";
import "./jobs/dutySchedular";
dotenv.config();

const Port = process.env.PORT || 3000;

app.listen(Port, () => {
  console.log(
    `Server is running on http://localhost:${Port}`
  );
});