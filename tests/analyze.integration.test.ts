import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  GitHubApiError,
  GitHubClient,
  RepositoryFile,
  RepositoryMetadata,
} from "../src/clients/github.client";
import { errorHandler } from "../src/middleware/error.middleware";
import { createAnalyzeRouter } from "../src/routes/analyze.routes";
import {
  LlmCodeAnalysisService,
  LlmServiceError,
} from "../src/services/llm.service";
import { RepositoryAnalyzerService } from "../src/services/repository-analyzer.service";
import { RepositoryFileSelectionService } from "../src/services/repository-file-selection.service";

const metadata: RepositoryMetadata = {
  id: 1,
  name: "analyser",
  fullName: "octocat/analyser",
  private: false,
  htmlUrl: "https://github.com/octocat/analyser",
  description: "Integration test repository",
  defaultBranch: "main",
  language: "TypeScript",
  stargazersCount: 2,
  forksCount: 1,
  openIssuesCount: 0,
  watchersCount: 2,
  size: 20,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  pushedAt: "2026-01-01T00:00:00Z",
};

const validAnalysis = {
  summary: "The repository has a small TypeScript structure.",
  architecture: {
    overview: "A source entry point with package metadata.",
    components: ["src/index.ts"],
    dataFlow: ["The entry point exports a value."],
  },
  technologies: [{ name: "TypeScript", purpose: "Provides static typing." }],
  strengths: [
    { category: "maintainability", description: "The structure is clear." },
  ],
  findings: [],
  improvements: [],
  testingRecommendations: ["Add more unit tests."],
};

function file(path: string, size = 20): RepositoryFile {
  return {
    path,
    sha: `sha-${path}`,
    size,
    url: `https://api.github.test/blob/${path}`,
  };
}

function githubClient(overrides: Partial<GitHubClient> = {}): GitHubClient {
  return {
    getRepositoryMetadata: vi.fn().mockResolvedValue(metadata),
    getRepositoryFileTree: vi
      .fn()
      .mockResolvedValue([file("README.md"), file("src/index.ts")]),
    getFileContent: vi.fn().mockResolvedValue("export const value = 1;"),
    ...overrides,
  };
}

function mockedLlmService(
  response: unknown = validAnalysis,
): LlmCodeAnalysisService {
  const request = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(response) } }],
      }),
      { status: 200 },
    ),
  );
  const service = new LlmCodeAnalysisService(
    "https://llm.example.test/v1/chat/completions",
    "test-key",
    "test-model",
    request,
  );
  vi.spyOn(service, "analyzeFiles");
  return service;
}

function integrationApp(
  github: GitHubClient,
  llm: Pick<LlmCodeAnalysisService, "analyzeFiles">,
) {
  const analyzer = new RepositoryAnalyzerService(
    github,
    new RepositoryFileSelectionService(),
    llm,
    { info: vi.fn(), warn: vi.fn() },
  );
  const testApp = express();
  testApp.use(express.json());
  testApp.use("/api/analyze", createAnalyzeRouter(analyzer));
  testApp.use(errorHandler);
  return testApp;
}

describe("repository analysis integration flow", () => {
  it("runs URL validation, GitHub retrieval, selection, content retrieval, and LLM validation", async () => {
    const github = githubClient();
    const llm = mockedLlmService();

    const response = await request(integrationApp(github, llm))
      .post("/api/analyze")
      .send({ repositoryUrl: "https://github.com/octocat/analyser" });

    expect(response.status).toBe(200);
    expect(response.body.repository).toEqual(metadata);
    expect(
      response.body.selectedFiles.map(({ path }: RepositoryFile) => path),
    ).toEqual(["README.md", "src/index.ts"]);
    expect(response.body.analyzedFiles).toEqual(["README.md", "src/index.ts"]);
    expect(response.body.analysis).toEqual(validAnalysis);
    expect(github.getRepositoryMetadata).toHaveBeenCalledWith(
      "octocat",
      "analyser",
    );
    expect(github.getRepositoryFileTree).toHaveBeenCalledWith(
      "octocat",
      "analyser",
    );
    expect(github.getFileContent).toHaveBeenCalledTimes(2);
    expect(vi.mocked(llm.analyzeFiles)).toHaveBeenCalledOnce();
  });

  it("rejects a non-GitHub repository URL before calling GitHub", async () => {
    const github = githubClient();
    const llm = mockedLlmService();

    const response = await request(integrationApp(github, llm))
      .post("/api/analyze")
      .send({ repositoryUrl: "https://gitlab.com/octocat/analyser" });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: "Invalid GitHub repository URL" });
    expect(github.getRepositoryMetadata).not.toHaveBeenCalled();
  });

  it("returns 404 when GitHub cannot find the repository", async () => {
    const github = githubClient({
      getRepositoryMetadata: vi
        .fn()
        .mockRejectedValue(new GitHubApiError("Not Found", 404)),
    });

    const response = await request(integrationApp(github, mockedLlmService()))
      .post("/api/analyze")
      .send({ repositoryUrl: "https://github.com/octocat/missing" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Repository not found" });
  });

  it("returns 502 for other GitHub API failures", async () => {
    const github = githubClient({
      getRepositoryFileTree: vi
        .fn()
        .mockRejectedValue(new GitHubApiError("Rate limited", 429)),
    });

    const response = await request(integrationApp(github, mockedLlmService()))
      .post("/api/analyze")
      .send({ repositoryUrl: "https://github.com/octocat/analyser" });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: "Upstream service unavailable" });
  });

  it("rejects a repository with no suitable source files", async () => {
    const github = githubClient({
      getRepositoryFileTree: vi
        .fn()
        .mockResolvedValue([
          file("node_modules/library/index.js"),
          file("logo.png"),
        ]),
    });
    const llm = mockedLlmService();

    const response = await request(integrationApp(github, llm))
      .post("/api/analyze")
      .send({ repositoryUrl: "https://github.com/octocat/analyser" });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: "Repository contains no analyzable files",
    });
    expect(vi.mocked(llm.analyzeFiles)).not.toHaveBeenCalled();
  });

  it("returns 502 when the LLM fails", async () => {
    const llm: Pick<LlmCodeAnalysisService, "analyzeFiles"> = {
      analyzeFiles: vi
        .fn()
        .mockRejectedValue(new LlmServiceError("Provider failed")),
    };

    const response = await request(integrationApp(githubClient(), llm))
      .post("/api/analyze")
      .send({ repositoryUrl: "https://github.com/octocat/analyser" });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: "Upstream service unavailable" });
  });

  it("returns 502 when the LLM returns invalid structured output", async () => {
    const llm = mockedLlmService({
      ...validAnalysis,
      findings: [{ ...validAnalysis.findings, severity: "critical" }],
    });

    const response = await request(integrationApp(githubClient(), llm))
      .post("/api/analyze")
      .send({ repositoryUrl: "https://github.com/octocat/analyser" });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: "Upstream service unavailable" });
  });

  it("rejects an oversized repository before retrieving file contents", async () => {
    const github = githubClient({
      getRepositoryFileTree: vi
        .fn()
        .mockResolvedValue([file("src/large.ts", 100_001)]),
    });
    const llm = mockedLlmService();

    const response = await request(integrationApp(github, llm))
      .post("/api/analyze")
      .send({ repositoryUrl: "https://github.com/octocat/analyser" });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: "Repository contains no analyzable files",
    });
    expect(github.getFileContent).not.toHaveBeenCalled();
    expect(vi.mocked(llm.analyzeFiles)).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON request bodies with 400", async () => {
    const github = githubClient();
    const llm = mockedLlmService();

    const response = await request(integrationApp(github, llm))
      .post("/api/analyze")
      .set("Content-Type", "application/json")
      .send('{"repositoryUrl":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid JSON request body" });
    expect(github.getRepositoryMetadata).not.toHaveBeenCalled();
  });
});
