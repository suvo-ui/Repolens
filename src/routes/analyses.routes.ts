import { Router } from "express";
import type { RequestHandler } from "express";
import {
  createAskQuestionController,
  createGetAnalysisController,
  createListAnalysesController,
} from "../controllers/analysis.controller";
import {
  AnalysisRepository,
  MongooseAnalysisRepository,
} from "../repositories/analysis.repository";
import { GitHubApiClient } from "../clients/github.client";
import { env } from "../config/env";
import { createRateLimiter } from "../middleware/rate-limit.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { LlmCodeAnalysisService } from "../services/llm.service";
import { RepositoryQuestionService } from "../services/repository-question.service";

export function createAnalysesRouter(
  repository: AnalysisRepository,
  questionService = new RepositoryQuestionService(
    repository,
    new GitHubApiClient(),
    new LlmCodeAnalysisService(),
  ),
  authentication: RequestHandler = requireAuth,
): Router {
  const router = Router();
  router.use(authentication);
  router.get("/", createListAnalysesController(repository));
  router.post(
    "/:id/questions",
    createRateLimiter({
      windowMs: env.questionRateLimitWindowMs,
      maxRequests: env.questionRateLimitMax,
    }),
    createAskQuestionController(questionService),
  );
  router.get("/:id", createGetAnalysisController(repository));
  return router;
}

export const analysesRouter = createAnalysesRouter(
  new MongooseAnalysisRepository(),
);
