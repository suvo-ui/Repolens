import express from "express";
import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/error.middleware";
import { createAnalysesRouter } from "../src/routes/analyses.routes";
import type { AnalysisRepository } from "../src/repositories/analysis.repository";
import type { RepositoryQuestionService } from "../src/services/repository-question.service";

function questionApp(questionService: Pick<RepositoryQuestionService, "ask">) {
  const repository: AnalysisRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findRecent: vi.fn().mockResolvedValue([]),
  };
  const app = express();
  app.use(express.json({ limit: "16kb" }));
  const authenticatedTestUser: RequestHandler = (request, _response, next) => {
    request.user = {
      id: "507f1f77bcf86cd799439011",
      name: "Test User",
      email: "test@example.com",
    };
    next();
  };
  app.use(
    "/api/analyses",
    createAnalysesRouter(
      repository,
      questionService as RepositoryQuestionService,
      authenticatedTestUser,
    ),
  );
  app.use(errorHandler);
  return app;
}

describe("public request protections", () => {
  it("enforces the question rate limit before calling the question service", async () => {
    const questionService = {
      ask: vi.fn().mockResolvedValue({
        answer: "The available context is insufficient.",
        relevantFiles: [],
      }),
    };
    const app = questionApp(questionService);

    const responses = await Promise.all(
      Array.from({ length: 21 }, () =>
        request(app)
          .post("/api/analyses/507f1f77bcf86cd799439011/questions")
          .send({ question: "Where is authentication implemented?" }),
      ),
    );

    expect(responses.at(-1)?.status).toBe(429);
    expect(responses.at(-1)?.headers["retry-after"]).toBeDefined();
    expect(questionService.ask).toHaveBeenCalledTimes(20);
  });
});
