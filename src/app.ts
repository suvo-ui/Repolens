import express from "express";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/not-found.middleware";
import { apiRouter } from "./routes";

export const app = express();

app.use(express.json({ limit: "16kb" }));
app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
