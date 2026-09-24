import express from "express";
import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/error.middleware";
import { createAnalyzeRouter } from "../src/routes/analyze.routes";
import {
  RepositoryAnalysisResult,
  RepositoryAnalyzer,
  RepositoryAnalyzerError,
} from "../src/services/repository-analyzer.service";

const analysisResult: RepositoryAnalysisResult = {
  repository: {
    id: 1,
    name: "analyser",
    fullName: "octocat/analyser",
    private: false,
    htmlUrl: "https://github.com/octocat/analyser",
    description: null,
    defaultBranch: "main",
    language: "TypeScript",
    stargazersCount: 0,
    forksCount: 0,
    openIssuesCount: 0,
    watchersCount: 0,
    size: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    pushedAt: null,
  },
  selectedFiles: [
    {
      path: "src/index.ts",
      sha: "sha-source",
      size: 20,
      url: "https://api.github.test/blob/source",
    },
  ],
  analyzedFiles: ["src/index.ts"],
  analysis: {
    summary: "A small repository.",
    architecture: {
      overview: "A single source module.",
      components: ["src/index.ts"],
      dataFlow: ["The module exports a value."],
    },
    technologies: [{ name: "TypeScript", purpose: "Provides static typing." }],
    strengths: [
      { category: "maintainability", description: "The code is concise." },
    ],
    findings: [],
    improvements: [],
    testingRecommendations: [],
  },
};

function testApp(analyzer: RepositoryAnalyzer) {
  const testApp = express();
  testApp.use(express.json());
  const authenticatedTestUser: RequestHandler = (request, _response, next) => {
    request.user = {
      id: "507f1f77bcf86cd799439011",
      name: "Test User",
      email: "test@example.com",
    };
    next();
  };
  testApp.use(
    "/api/analyze",
    createAnalyzeRouter(analyzer, authenticatedTestUser),
  );
  testApp.use(errorHandler);
  return testApp;
}

describe("POST /api/analyze", () => {
  it("rejects an invalid request body with 400", async () => {
    const analyzer: RepositoryAnalyzer = { analyze: vi.fn() };

    const response = await request(testApp(analyzer))
      .post("/api/analyze")
      .send({ repositoryUrl: "not-a-url" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Request body must contain a valid repositoryUrl",
    });
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });

  it("returns metadata, files, and structured analysis", async () => {
    const analyzer: RepositoryAnalyzer = {
      analyze: vi.fn().mockResolvedValue(analysisResult),
    };

    const response = await request(testApp(analyzer))
      .post("/api/analyze")
      .send({ repositoryUrl: "https://github.com/octocat/analyser" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(analysisResult);
    expect(analyzer.analyze).toHaveBeenCalledWith(
      "https://github.com/octocat/analyser",
      "507f1f77bcf86cd799439011",
    );
  });

  it("enforces the analysis rate limit before calling the analyzer", async () => {
    const analyzer: RepositoryAnalyzer = {
      analyze: vi.fn().mockResolvedValue(analysisResult),
    };
    const api = testApp(analyzer);

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        request(api)
          .post("/api/analyze")
          .send({ repositoryUrl: "https://github.com/octocat/analyser" }),
      ),
    );

    expect(responses.at(-1)?.status).toBe(429);
    expect(responses.at(-1)?.headers["retry-after"]).toBeDefined();
    expect(analyzer.analyze).toHaveBeenCalledTimes(5);
  });

  it("uses the existing error middleware for analyzer failures", async () => {
    const analyzer: RepositoryAnalyzer = {
      analyze: vi
        .fn()
        .mockRejectedValue(new RepositoryAnalyzerError("No analyzable files")),
    };

    const response = await request(testApp(analyzer))
      .post("/api/analyze")
      .send({ repositoryUrl: "https://github.com/octocat/analyser" });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: "No analyzable files" });
    expect(response.body.stack).toBeUndefined();
  });

  it("does not expose unknown internal error messages", async () => {
    const analyzer: RepositoryAnalyzer = {
      analyze: vi.fn().mockRejectedValue(new Error("database password=secret")),
    };

    const response = await request(testApp(analyzer))
      .post("/api/analyze")
      .send({ repositoryUrl: "https://github.com/octocat/analyser" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
    expect(JSON.stringify(response.body)).not.toContain("secret");
  });
});
