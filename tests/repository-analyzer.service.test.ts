import { describe, expect, it, vi } from "vitest";
import {
  GitHubClient,
  RepositoryFile,
  RepositoryMetadata,
} from "../src/clients/github.client";
import {
  CodeAnalysisReport,
  LlmCodeAnalysisService,
} from "../src/services/llm.service";
import {
  RepositoryAnalyzerError,
  RepositoryAnalyzerLogger,
  RepositoryAnalyzerService,
} from "../src/services/repository-analyzer.service";
import { RepositoryFileSelectionService } from "../src/services/repository-file-selection.service";

const metadata: RepositoryMetadata = {
  id: 1,
  name: "analyser",
  fullName: "octocat/analyser",
  private: false,
  htmlUrl: "https://github.com/octocat/analyser",
  description: "Test repository",
  defaultBranch: "main",
  language: "TypeScript",
  stargazersCount: 1,
  forksCount: 2,
  openIssuesCount: 0,
  watchersCount: 1,
  size: 10,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  pushedAt: "2026-01-01T00:00:00Z",
};

const report: CodeAnalysisReport = {
  summary: "Looks good.",
  architecture: {
    overview: "A small test repository.",
    components: ["src/index.ts"],
    dataFlow: ["The entry point exports a value."],
  },
  technologies: [{ name: "TypeScript", purpose: "Provides static typing." }],
  strengths: [
    { category: "maintainability", description: "The code is clear." },
  ],
  findings: [],
  improvements: [],
  testingRecommendations: ["Add more tests"],
};

function file(path: string, size = 20): RepositoryFile {
  return {
    path,
    sha: `sha-${path}`,
    size,
    url: `https://api.github.test/blob/${path}`,
  };
}

function logger(): RepositoryAnalyzerLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
  };
}

function client(overrides: Partial<GitHubClient> = {}): GitHubClient {
  return {
    getRepositoryMetadata: vi.fn().mockResolvedValue(metadata),
    getRepositoryFileTree: vi.fn().mockResolvedValue([file("src/index.ts")]),
    getFileContent: vi.fn().mockResolvedValue("export const value = 1;"),
    ...overrides,
  };
}

function llm(
  overrides: Partial<LlmCodeAnalysisService> = {},
): Pick<LlmCodeAnalysisService, "analyzeFiles"> {
  return {
    analyzeFiles: vi.fn().mockResolvedValue(report),
    ...overrides,
  };
}

describe("RepositoryAnalyzerService", () => {
  it("rejects invalid GitHub repository URLs before making requests", async () => {
    const github = client();
    const analyzer = new RepositoryAnalyzerService(
      github,
      new RepositoryFileSelectionService(),
      llm(),
      logger(),
    );

    await expect(
      analyzer.analyze("https://gitlab.com/octocat/analyser"),
    ).rejects.toBeInstanceOf(RepositoryAnalyzerError);
    expect(github.getRepositoryMetadata).not.toHaveBeenCalled();
  });

  it.each([
    "https://user:password@github.com/octocat/analyser",
    "https://github.com:444/octocat/analyser",
    "https://github.com/octocat%2Fanalyser",
    "https://github.com/octocat/analyser/extra",
  ])("rejects unsafe repository URL %s", async (repositoryUrl) => {
    const github = client();
    const analyzer = new RepositoryAnalyzerService(
      github,
      new RepositoryFileSelectionService(),
      llm(),
      logger(),
    );

    await expect(analyzer.analyze(repositoryUrl)).rejects.toThrow(
      "Invalid GitHub repository URL",
    );
    expect(github.getRepositoryMetadata).not.toHaveBeenCalled();
  });

  it("runs the complete pipeline and passes repository context to the LLM", async () => {
    const github = client({
      getRepositoryFileTree: vi
        .fn()
        .mockResolvedValue([
          file("README.md"),
          file("package.json"),
          file("src/index.ts"),
        ]),
      getFileContent: vi.fn((_, __, path) =>
        Promise.resolve(
          path === "package.json"
            ? '{"name":"analyser","dependencies":{"express":"1.0.0"}}'
            : `content for ${path}`,
        ),
      ),
    });
    const llmService = llm();
    const analyzer = new RepositoryAnalyzerService(
      github,
      new RepositoryFileSelectionService(),
      llmService,
      logger(),
    );

    await expect(
      analyzer.analyze("https://github.com/octocat/analyser.git"),
    ).resolves.toMatchObject({
      repository: metadata,
      analyzedFiles: ["README.md", "package.json", "src/index.ts"],
      analysis: report,
    });

    expect(llmService.analyzeFiles).toHaveBeenCalledOnce();
    const [sourceFiles, context] =
      vi.mocked(llmService.analyzeFiles).mock.calls[0] ?? [];
    expect(sourceFiles?.map(({ path }) => path)).toEqual([
      "README.md",
      "package.json",
      "src/index.ts",
    ]);
    expect(context).toMatchObject({
      metadata,
      selectedFilePaths: ["README.md", "package.json", "src/index.ts"],
      repositoryStructure: ["README.md", "package.json", "src/index.ts"],
      technology: {
        primaryLanguage: "TypeScript",
        packageJson: {
          name: "analyser",
        },
        configurationFiles: ["package.json"],
      },
    });
  });

  it("propagates GitHub failures without calling the LLM", async () => {
    const github = client({
      getRepositoryMetadata: vi
        .fn()
        .mockRejectedValue(new Error("GitHub unavailable")),
    });
    const llmService = llm();
    const analyzer = new RepositoryAnalyzerService(
      github,
      new RepositoryFileSelectionService(),
      llmService,
      logger(),
    );

    await expect(
      analyzer.analyze("https://github.com/octocat/analyser"),
    ).rejects.toThrow("GitHub unavailable");
    expect(llmService.analyzeFiles).not.toHaveBeenCalled();
  });

  it("continues when one selected file cannot be retrieved", async () => {
    const warnings = logger();
    const github = client({
      getRepositoryFileTree: vi
        .fn()
        .mockResolvedValue([file("src/a.ts"), file("src/b.ts")]),
      getFileContent: vi.fn((_, __, path) =>
        path === "src/a.ts"
          ? Promise.reject(new Error("file unavailable"))
          : Promise.resolve("export const b = 1;"),
      ),
    });
    const llmService = llm();
    const analyzer = new RepositoryAnalyzerService(
      github,
      new RepositoryFileSelectionService(),
      llmService,
      warnings,
    );

    await expect(
      analyzer.analyze("https://github.com/octocat/analyser"),
    ).resolves.toMatchObject({
      repository: metadata,
      analyzedFiles: ["src/b.ts"],
      analysis: report,
    });
    expect(llmService.analyzeFiles).toHaveBeenCalledWith(
      [
        {
          path: "src/b.ts",
          content: "export const b = 1;",
          language: "typescript",
        },
      ],
      expect.any(Object),
    );
    expect(warnings.warn).toHaveBeenCalledWith(
      "Skipping src/a.ts because its content could not be retrieved",
    );
  });

  it("does not send oversized decoded content to the LLM", async () => {
    const llmService = llm();
    const analyzer = new RepositoryAnalyzerService(
      client({
        getFileContent: vi.fn().mockResolvedValue("x".repeat(100_001)),
      }),
      new RepositoryFileSelectionService(),
      llmService,
      logger(),
    );

    await expect(
      analyzer.analyze("https://github.com/octocat/analyser"),
    ).rejects.toThrow("Unable to retrieve any analyzable repository files");
    expect(llmService.analyzeFiles).not.toHaveBeenCalled();
  });

  it("propagates LLM failures after building the context", async () => {
    const llmService = llm({
      analyzeFiles: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
    });
    const analyzer = new RepositoryAnalyzerService(
      client(),
      new RepositoryFileSelectionService(),
      llmService,
      logger(),
    );

    await expect(
      analyzer.analyze("https://github.com/octocat/analyser"),
    ).rejects.toThrow("LLM unavailable");
  });

  it("rejects an empty repository before calling the LLM", async () => {
    const github = client({
      getRepositoryFileTree: vi.fn().mockResolvedValue([]),
    });
    const llmService = llm();
    const analyzer = new RepositoryAnalyzerService(
      github,
      new RepositoryFileSelectionService(),
      llmService,
      logger(),
    );

    await expect(
      analyzer.analyze("https://github.com/octocat/analyser"),
    ).rejects.toThrow("Repository contains no analyzable files");
    expect(llmService.analyzeFiles).not.toHaveBeenCalled();
  });

  it("rejects a repository with only ignored files", async () => {
    const github = client({
      getRepositoryFileTree: vi
        .fn()
        .mockResolvedValue([
          file("node_modules/dependency/index.js"),
          file("logo.png"),
        ]),
    });
    const llmService = llm();
    const analyzer = new RepositoryAnalyzerService(
      github,
      new RepositoryFileSelectionService(),
      llmService,
      logger(),
    );

    await expect(
      analyzer.analyze("https://github.com/octocat/analyser"),
    ).rejects.toThrow("Repository contains no analyzable files");
    expect(llmService.analyzeFiles).not.toHaveBeenCalled();
  });
});
