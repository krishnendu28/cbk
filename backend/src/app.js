import express from "express";
import cors from "cors";
import { corsOptions } from "./config/cors.js";
import healthRoutes from "./routes/healthRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

const app = express();

app.set("trust proxy", 1);
app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);

export default app;
