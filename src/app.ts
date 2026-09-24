import express from "express";
import cors from "cors";
import session from "express-session";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/not-found.middleware";
import { apiRouter } from "./routes";

export const SESSION_COOKIE_NAME = "repolens.sid";

/**
 * The deployed architecture runs the frontend (Vercel) and API (Render) on
 * different origins, so the session cookie must be SameSite=None + Secure in
 * production. Render terminates TLS in front of the app, so trust the first
 * proxy for secure cookies and rate limiting to behave correctly.
 */
export function createApp(store?: session.Store) {
  const app = express();

  if (env.nodeEnv === "production") {
    app.set("trust proxy", 1);
  }

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
        sameSite: env.nodeEnv === "production" ? "none" : "lax",
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
