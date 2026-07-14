import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import apiRouter from "./routes/api.js";

const app = express();
const origins = String(process.env.FRONTEND_URL || "http://localhost:3000,http://localhost:5173")
  .split(",").map((item) => item.trim().replace(/\/$/, "")).filter(Boolean);

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || origins.includes(origin.replace(/\/$/, ""))) return callback(null, true);
    return callback(Object.assign(new Error("Origin is not allowed"), { statusCode: 403 }));
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (_req, res) => res.json({ success: true, message: "DokanDesk POS API", version: "1.0.0" }));
app.get("/health", (_req, res) => res.json({ success: true, status: "ok", uptime: Math.round(process.uptime()) }));
app.use("/api", apiRouter);

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use((error, _req, res, _next) => {
  console.error(error);
  const statusCode = error.statusCode || (error.code === "P2002" ? 409 : 500);
  const message = statusCode >= 500 && process.env.NODE_ENV === "production" ? "Internal Server Error" : error.message || "Request failed";
  res.status(statusCode).json({ success: false, message });
});

export default app;
