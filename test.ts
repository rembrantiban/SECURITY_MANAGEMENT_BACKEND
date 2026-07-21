import express from "express";

const app = express();

app.get("/", (_, res) => {
    res.send("Hello");
});

app.get("/api", (_, res) => {
    res.send("API Working");
});

app.listen(4000, () => {
    console.log("Listening on 4000");
});