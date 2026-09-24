import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type {
  GitHubClient,
  RepositoryFile,
  RepositoryMetadata,
} from "../src/clients/github.client";
import { errorHandler } from "../src/middleware/error.middleware";
import {
  createGetAnalysisController,
  createListAnalysesController,
} from "../src/controllers/analysis.controller";
import type {
  CodeAnalysisReport,
  LlmCodeAnalysisService,
} from "../src/services/llm.service";
import { RepositoryAnalyzerService } from "../src/services/repository-analyzer.service";
import { RepositoryFileSelectionService } from "../src/services/repository-file-selection.service";
import type { AnalysisRepository } from "../src/repositories/analysis.repository";
import type {
  PersistedAnalysis,
  PersistedAnalysisInput,
} from "../src/models/analysis.model";

const metadata: RepositoryMetadata = {
  id: 1,
  name: "repo",
  fullName: "owner/repo",
  private: false,
  htmlUrl: "https://github.com/owner/repo",
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
};
const userId = "507f1f77bcf86cd799439011";

const file: RepositoryFile = {
  path: "src/index.ts",
  sha: "sha",
  size: 12,
  url: "https://api.github.com/blob/sha",
};

const analysis: CodeAnalysisReport = {
  summary: "A small repository.",
  architecture: {
    overview: "One module.",
    components: ["src"],
    dataFlow: ["src"],
  },
  technologies: [{ name: "TypeScript", purpose: "Typing" }],
  strengths: [{ category: "quality", description: "Clear" }],
  findings: [],
  improvements: [],
  testingRecommendations: [],
};

function github(): GitHubClient {
  return {
    getRepositoryMetadata: vi.fn().mockResolvedValue(metadata),
    getRepositoryFileTree: vi.fn().mockResolvedValue([file]),
    getFileContent: vi.fn().mockResolvedValue("export const value = 1;"),
  };
}

function llm(): Pick<LlmCodeAnalysisService, "analyzeFiles"> {
  return { analyzeFiles: vi.fn().mockResolvedValue(analysis) };
}

function repository(
  create: AnalysisRepository["create"] = vi
    .fn()
    .mockResolvedValue("507f1f77bcf86cd799439011"),
): AnalysisRepository {
  return {
    create,
    findById: vi.fn().mockResolvedValue(null),
    findRecent: vi.fn().mockResolvedValue([]),
  };
}

describe("analysis persistence", () => {
  it("persists the validated result and returns its ID", async () => {
    const persistence = repository();
    const service = new RepositoryAnalyzerService(
      github(),
      new RepositoryFileSelectionService(),
      llm(),
      { info: vi.fn(), warn: vi.fn() },
      persistence,
    );

    const result = await service.analyze(
      "https://github.com/owner/repo",
      userId,
    );
    const savedInput = vi.mocked(persistence.create).mock.calls[0]?.[0];

    expect(result.analysisId).toBe("507f1f77bcf86cd799439011");
    expect(savedInput).toMatchObject({
      userId,
      repositoryUrl: "https://github.com/owner/repo",
      owner: "owner",
      repositoryName: "repo",
      commitSha: null,
      repository: metadata,
      selectedFiles: [file],
      analysis,
    });
    expect(savedInput).not.toHaveProperty("sourceFiles");
    expect(savedInput).not.toHaveProperty("content");
  });

  it("surfaces database failures after analysis without returning a fake ID", async () => {
    const persistence = repository(
      vi.fn().mockRejectedValue(new Error("Mongo unavailable")),
    );
    const service = new RepositoryAnalyzerService(
      github(),
      new RepositoryFileSelectionService(),
      llm(),
      { info: vi.fn(), warn: vi.fn() },
      persistence,
    );

    await expect(
      service.analyze("https://github.com/owner/repo", userId),
    ).rejects.toThrow("Mongo unavailable");
  });

  it("retrieves a persisted analysis by ID through the HTTP controller", async () => {
    const persisted = {
      _id: "507f1f77bcf86cd799439011",
      userId,
      repositoryUrl: "https://github.com/owner/repo",
      owner: "owner",
      repositoryName: "repo",
      commitSha: null,
      repository: metadata,
      selectedFiles: [file],
      analysis,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    } as unknown as PersistedAnalysis;
    const persistence: AnalysisRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(persisted),
      findRecent: vi.fn().mockResolvedValue([]),
    };
    const app = express();
    app.use(express.json());
    app.use((request, _response, next) => {
      request.user = {
        id: userId,
        name: "Test User",
        email: "test@example.com",
      };
      next();
    });
    app.get("/api/analyses/:id", createGetAnalysisController(persistence));
    app.use(errorHandler);

    const response = await request(app).get(
      "/api/analyses/507f1f77bcf86cd799439011",
    );

    expect(response.status).toBe(200);
    expect(response.body.repositoryName).toBe("repo");
    expect(response.body.analysis).toEqual(analysis);
  });

  it("lists lightweight history metadata without the complete analysis", async () => {
    const history = [
      {
        id: "507f1f77bcf86cd799439011",
        repositoryName: "repo",
        repositoryUrl: "https://github.com/owner/repo",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        primaryLanguage: "TypeScript",
        summary: "A small repository.",
      },
    ];
    const persistence: AnalysisRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findRecent: vi.fn().mockResolvedValue(history),
    };
    const app = express();
    app.use((request, _response, next) => {
      request.user = {
        id: userId,
        name: "Test User",
        email: "test@example.com",
      };
      next();
    });
    app.get("/api/analyses", createListAnalysesController(persistence));
    app.use(errorHandler);

    const response = await request(app).get("/api/analyses");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: history[0].id,
      repositoryName: "repo",
      primaryLanguage: "TypeScript",
      summary: "A small repository.",
    });
    expect(response.body[0].analysis).toBeUndefined();
  });
});
