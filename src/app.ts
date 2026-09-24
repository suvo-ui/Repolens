import express from "express";
import cors from "cors";
import session from "express-session";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/not-found.middleware";
import { apiRouter } from "./routes";

export function createApp(store?: session.Store) {
  const app = express();

  app.use(
    cors({
      origin:
        env.nodeEnv === "production"
          ? (env.frontendUrl ?? false)
          : (env.frontendUrl ?? true),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "16kb" }));
  app.use(
    session({
      name: "repolens.sid",
      secret: env.sessionSecret,
      store,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.nodeEnv === "production",
        sameSite: "lax",
        maxAge: env.sessionMaxAgeMs,
      },
    }),
  );
  app.use("/api", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
