import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./config";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/error.middleware";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: config.frontendUrl,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }));

  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
  app.use(limiter);
  app.use("/api/auth", authLimiter);

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  if (config.nodeEnv !== "test") {
    app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", env: config.nodeEnv, ts: new Date().toISOString() });
  });

  app.use("/api", routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
