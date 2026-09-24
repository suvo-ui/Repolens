import {
  GitHubClient,
  RepositoryFile,
  RepositoryMetadata,
} from "../clients/github.client";
import {
  CodeAnalysisReport,
  LlmCodeAnalysisService,
  RepositoryAnalysisContext,
  SelectedSourceFile,
} from "./llm.service";
import { RepositoryFileSelectionService } from "./repository-file-selection.service";
import {
  persistedAnalysisSchema,
  type PersistedAnalysisInput,
} from "../models/analysis.model";
import type { AnalysisRepository } from "../repositories/analysis.repository";

export interface RepositoryAnalyzer {
  analyze(repositoryUrl: string): Promise<RepositoryAnalysisResult>;
}

export interface RepositoryAnalysisResult {
  analysisId?: string;
  repository: RepositoryMetadata;
  selectedFiles: RepositoryFile[];
  analyzedFiles: string[];
  analysis: CodeAnalysisReport;
}

export interface RepositoryAnalyzerLogger {
  info(message: string): void;
  warn(message: string): void;
}

export class RepositoryAnalyzerError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RepositoryAnalyzerError";
  }
}

export class RepositoryAnalyzerService implements RepositoryAnalyzer {
  constructor(
    private readonly githubClient: GitHubClient,
    private readonly fileSelectionService: RepositoryFileSelectionService,
    private readonly llmService: Pick<LlmCodeAnalysisService, "analyzeFiles">,
    private readonly logger: RepositoryAnalyzerLogger = console,
    private readonly analysisRepository?: AnalysisRepository,
  ) {}

  async analyze(repositoryUrl: string): Promise<RepositoryAnalysisResult> {
    if (repositoryUrl.length > 2048) {
      throw new RepositoryAnalyzerError("Invalid GitHub repository URL");
    }
    const { owner, repository } = this.parseRepositoryUrl(repositoryUrl);
    this.logger.info(`Starting repository analysis for ${owner}/${repository}`);

    const metadata = await this.githubClient.getRepositoryMetadata(
      owner,
      repository,
    );
    const fileTree = await this.githubClient.getRepositoryFileTree(
      owner,
      repository,
    );
    const selectedFiles = this.fileSelectionService.selectFiles(fileTree);

    if (selectedFiles.length === 0) {
      throw new RepositoryAnalyzerError(
        "Repository contains no analyzable files",
      );
    }

    const sourceFiles = await this.retrieveSourceFiles(
      owner,
      repository,
      selectedFiles,
    );
    if (sourceFiles.length === 0) {
      throw new RepositoryAnalyzerError(
        "Unable to retrieve any analyzable repository files",
      );
    }

    const context = this.buildContext(
      metadata,
      fileTree,
      selectedFiles,
      sourceFiles,
    );
    this.logger.info(
      `Analyzing ${sourceFiles.length} of ${selectedFiles.length} selected repository files`,
    );

    const analysis = await this.llmService.analyzeFiles(sourceFiles, context);
    let analysisId: string | undefined;
    if (this.analysisRepository) {
      const persistenceInput: PersistedAnalysisInput = {
        repositoryUrl,
        owner,
        repositoryName: metadata.name,
        commitSha: null,
        repository: metadata,
        selectedFiles,
        analysis,
        createdAt: new Date(),
      };

      try {
        const validatedInput = persistedAnalysisSchema.parse(persistenceInput);
        analysisId = await this.analysisRepository.create(validatedInput);
      } catch (error) {
        this.logger.warn("Analysis completed but could not be persisted");
        throw error;
      }
    }

    return {
      analysisId,
      repository: metadata,
      selectedFiles,
      analyzedFiles: sourceFiles.map((file) => file.path),
      analysis,
    };
  }

  private async retrieveSourceFiles(
    owner: string,
    repository: string,
    selectedFiles: RepositoryFile[],
  ): Promise<SelectedSourceFile[]> {
    const results: Array<SelectedSourceFile | null> = await Promise.all(
      selectedFiles.map(async (file) => {
        try {
          const sourceFile: SelectedSourceFile = {
            path: file.path,
            content: await this.githubClient.getFileContent(
              owner,
              repository,
              file.path,
            ),
          };
          const language = this.getLanguage(file.path);
          if (language) {
            sourceFile.language = language;
          }
          return sourceFile;
        } catch (error) {
          this.logger.warn(
            `Skipping ${file.path} because its content could not be retrieved`,
          );
          return null;
        }
      }),
    );

    return results.filter(
      (sourceFile): sourceFile is SelectedSourceFile => sourceFile !== null,
    );
  }

  private buildContext(
    metadata: RepositoryMetadata,
    fileTree: RepositoryFile[],
    selectedFiles: RepositoryFile[],
    sourceFiles: SelectedSourceFile[],
  ): RepositoryAnalysisContext {
    const packageFile = sourceFiles.find(
      (file) => file.path === "package.json",
    );
    let packageJson: Record<string, unknown> | null = null;
    if (packageFile) {
      try {
        const parsedPackage = JSON.parse(packageFile.content) as unknown;
        if (parsedPackage && typeof parsedPackage === "object") {
          packageJson = parsedPackage as Record<string, unknown>;
        }
      } catch {
        this.logger.warn(
          "Ignoring malformed package.json in repository context",
        );
      }
    }

    return {
      metadata,
      technology: {
        primaryLanguage: metadata.language,
        packageJson,
        configurationFiles: selectedFiles
          .map((file) => file.path)
          .filter((path) => this.isConfigurationFile(path)),
      },
      selectedFilePaths: sourceFiles.map((file) => file.path),
      repositoryStructure: fileTree.map((file) => file.path),
    };
  }

  private parseRepositoryUrl(repositoryUrl: string): {
    owner: string;
    repository: string;
  } {
    let url: URL;
    try {
      url = new URL(repositoryUrl);
    } catch (error) {
      throw new RepositoryAnalyzerError("Invalid GitHub repository URL", {
        cause: error,
      });
    }

    if (
      !["http:", "https:"].includes(url.protocol) ||
      !["github.com", "www.github.com"].includes(url.hostname.toLowerCase()) ||
      url.search ||
      url.hash
    ) {
      throw new RepositoryAnalyzerError("Invalid GitHub repository URL");
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 2) {
      throw new RepositoryAnalyzerError("Invalid GitHub repository URL");
    }

    const owner = decodeURIComponent(segments[0] ?? "").trim();
    const repository = decodeURIComponent(segments[1] ?? "")
      .replace(/\.git$/, "")
      .trim();
    if (!owner || !repository) {
      throw new RepositoryAnalyzerError("Invalid GitHub repository URL");
    }

    return { owner, repository };
  }

  private getLanguage(path: string): string | undefined {
    const extension = path.split(".").at(-1)?.toLowerCase();
    const languages: Record<string, string> = {
      css: "css",
      go: "go",
      html: "html",
      java: "java",
      js: "javascript",
      json: "json",
      jsx: "javascript",
      md: "markdown",
      py: "python",
      rb: "ruby",
      rs: "rust",
      ts: "typescript",
      tsx: "typescript",
      yaml: "yaml",
      yml: "yaml",
    };
    return extension ? languages[extension] : undefined;
  }

  private isConfigurationFile(path: string): boolean {
    const fileName = path.split("/").at(-1)?.toLowerCase() ?? "";
    return (
      fileName.startsWith(".") ||
      fileName.includes("config") ||
      /\.(?:json|toml|ini|yaml|yml|xml)$/.test(fileName)
    );
  }
}
