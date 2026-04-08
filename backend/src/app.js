import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { corsOptions } from "./config/cors.js";
import healthRoutes from "./routes/healthRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { requestContext } from "./middlewares/request-context.js";
import { requestLogger } from "./middlewares/request-logger.js";

const app = express();

const apiRateLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 300,
	standardHeaders: true,
	legacyHeaders: false,
});

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(requestContext);
app.use(requestLogger);
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(apiRateLimiter);

app.use("/api/health", healthRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/shop", shopRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
