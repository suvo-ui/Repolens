import { describe, expect, it, vi } from "vitest";
import type {
  GitHubClient,
  RepositoryFile,
  RepositoryMetadata,
} from "../src/clients/github.client";
import type { AnalysisRepository } from "../src/repositories/analysis.repository";
import type { PersistedAnalysis } from "../src/models/analysis.model";
import type {
  CodeAnalysisReport,
  LlmCodeAnalysisService,
} from "../src/services/llm.service";
import { RepositoryQuestionService } from "../src/services/repository-question.service";

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
const selectedFile: RepositoryFile = {
  path: "src/auth.ts",
  sha: "sha",
  size: 10,
  url: "https://api.github.com/blob/sha",
};
const userId = "507f1f77bcf86cd799439011";
const analysis: CodeAnalysisReport = {
  summary: "A repository with authentication code.",
  architecture: {
    overview: "A small service.",
    components: ["src/auth.ts"],
    dataFlow: ["Request to auth service"],
  },
  technologies: [],
  strengths: [],
  findings: [],
  improvements: [],
  testingRecommendations: [],
};

function savedAnalysis(): PersistedAnalysis {
  return {
    _id: "507f1f77bcf86cd799439011" as unknown as PersistedAnalysis["_id"],
    userId,
    repositoryUrl: "https://github.com/owner/repo",
    owner: "owner",
    repositoryName: "repo",
    commitSha: null,
    repository: metadata,
    selectedFiles: [selectedFile],
    analysis,
    createdAt: new Date(),
  };
}

describe("RepositoryQuestionService", () => {
  it("refetches selected files and asks the LLM with saved context", async () => {
    const answerQuestion = vi.fn().mockResolvedValue({
      answer: "Authentication is implemented in src/auth.ts.",
      relevantFiles: ["src/auth.ts"],
    });
    const repository: AnalysisRepository = {
      create: vi.fn(),
      findRecent: vi.fn(),
      findById: vi.fn().mockResolvedValue(savedAnalysis()),
    };
    const github: GitHubClient = {
      getRepositoryMetadata: vi.fn(),
      getRepositoryFileTree: vi.fn(),
      getFileContent: vi
        .fn()
        .mockResolvedValue("export function authenticate() {}"),
    };
    const service = new RepositoryQuestionService(repository, github, {
      answerQuestion,
    } as Pick<LlmCodeAnalysisService, "answerQuestion">);

    await expect(
      service.ask(
        "analysis-id",
        "Where is authentication implemented?",
        userId,
      ),
    ).resolves.toEqual({
      answer: "Authentication is implemented in src/auth.ts.",
      relevantFiles: ["src/auth.ts"],
    });
    expect(github.getFileContent).toHaveBeenCalledWith(
      "owner",
      "repo",
      "src/auth.ts",
    );
    expect(answerQuestion).toHaveBeenCalledWith(
      "Where is authentication implemented?",
      [{ path: "src/auth.ts", content: "export function authenticate() {}" }],
      expect.objectContaining({ selectedFilePaths: ["src/auth.ts"] }),
    );
  });

  it("rejects blank questions before retrieving context", async () => {
    const repository: AnalysisRepository = {
      create: vi.fn(),
      findRecent: vi.fn(),
      findById: vi.fn(),
    };
    const service = new RepositoryQuestionService(
      repository,
      {} as GitHubClient,
      {} as Pick<LlmCodeAnalysisService, "answerQuestion">,
    );

    await expect(service.ask("analysis-id", "  ", userId)).rejects.toThrow(
      "Question must be",
    );
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it("returns an insufficient-context answer when source refetches fail", async () => {
    const answerQuestion = vi.fn().mockResolvedValue({
      answer: "The available repository context is insufficient.",
      relevantFiles: [],
    });
    const repository: AnalysisRepository = {
      create: vi.fn(),
      findRecent: vi.fn(),
      findById: vi.fn().mockResolvedValue(savedAnalysis()),
    };
    const github = {
      getRepositoryMetadata: vi.fn(),
      getRepositoryFileTree: vi.fn(),
      getFileContent: vi
        .fn()
        .mockRejectedValue(new Error("GitHub unavailable")),
    } as GitHubClient;
    const service = new RepositoryQuestionService(repository, github, {
      answerQuestion,
    } as Pick<LlmCodeAnalysisService, "answerQuestion">);

    await expect(
      service.ask("analysis-id", "Where is billing implemented?", userId),
    ).resolves.toEqual({
      answer: "The available repository context is insufficient.",
      relevantFiles: [],
    });
    expect(answerQuestion).toHaveBeenCalledWith(
      "Where is billing implemented?",
      [],
      expect.any(Object),
    );
  });
});
