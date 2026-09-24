import { Router } from "express";
import { GitHubApiClient } from "../clients/github.client";
import { env } from "../config/env";
import { createAnalyzeController } from "../controllers/analyze.controller";
import { createRateLimiter } from "../middleware/rate-limit.middleware";
import { MongooseAnalysisRepository } from "../repositories/analysis.repository";
import { LlmCodeAnalysisService } from "../services/llm.service";
import {
  RepositoryAnalyzer,
  RepositoryAnalyzerService,
} from "../services/repository-analyzer.service";
import { RepositoryFileSelectionService } from "../services/repository-file-selection.service";

export function createAnalyzeRouter(analyzer: RepositoryAnalyzer): Router {
  const router = Router();
  router.post(
    "/",
    createRateLimiter({
      windowMs: env.analyzeRateLimitWindowMs,
      maxRequests: env.analyzeRateLimitMax,
    }),
    createAnalyzeController(analyzer),
  );
  return router;
}

const analyzer = new RepositoryAnalyzerService(
  new GitHubApiClient(),
  new RepositoryFileSelectionService(),
  new LlmCodeAnalysisService(),
  console,
  new MongooseAnalysisRepository(),
);

export const analyzeRouter = createAnalyzeRouter(analyzer);
