import { Router } from "express";
import { analyzeRouter } from "./analyze.routes";
import { analysesRouter } from "./analyses.routes";
import { healthRouter } from "./health.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/analyze", analyzeRouter);
apiRouter.use("/analyses", analysesRouter);
