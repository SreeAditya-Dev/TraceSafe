import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import iotRouter from "./routes/iot";
import pool from "./db";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/iot", iotRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
