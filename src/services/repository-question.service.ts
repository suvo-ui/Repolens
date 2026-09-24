import { z } from "zod";
import { env } from "../config/env";
import type { GitHubClient } from "../clients/github.client";
import type { AnalysisRepository } from "../repositories/analysis.repository";
import {
  LlmCodeAnalysisService,
  type RepositoryQuestionAnswer,
  type SelectedSourceFile,
} from "./llm.service";

const questionSchema = z.string().trim().min(1).max(1000);

export class RepositoryQuestionError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 422, options?: ErrorOptions) {
    super(message, options);
    this.name = "RepositoryQuestionError";
    this.statusCode = statusCode;
  }
}

export class RepositoryQuestionService {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly githubClient: GitHubClient,
    private readonly llmService: Pick<LlmCodeAnalysisService, "answerQuestion">,
  ) {}

  async ask(
    analysisId: string,
    question: string,
    userId: string,
  ): Promise<RepositoryQuestionAnswer> {
    const parsedQuestion = questionSchema.safeParse(question);
    if (!parsedQuestion.success) {
      throw new RepositoryQuestionError(
        "Question must be between 1 and 1000 characters",
      );
    }

    const savedAnalysis = await this.analysisRepository.findById(
      analysisId,
      userId,
    );
    if (!savedAnalysis) {
      throw new RepositoryQuestionError("Analysis not found", 404);
    }

    const sourceFiles: SelectedSourceFile[] = [];
    let totalBytes = 0;
    for (const file of savedAnalysis.selectedFiles) {
      try {
        const content = await this.githubClient.getFileContent(
          savedAnalysis.owner,
          savedAnalysis.repositoryName,
          file.path,
        );
        const contentBytes = Buffer.byteLength(content, "utf8");
        if (
          contentBytes > env.maxSourceFileBytes ||
          totalBytes + contentBytes > env.maxSourceContentBytes
        ) {
          continue;
        }
        sourceFiles.push({ path: file.path, content });
        totalBytes += contentBytes;
      } catch {
        continue;
      }
    }

    return this.llmService.answerQuestion(parsedQuestion.data, sourceFiles, {
      repository: savedAnalysis.repository,
      analysisSummary: savedAnalysis.analysis.summary,
      architectureOverview: savedAnalysis.analysis.architecture.overview,
      selectedFilePaths: savedAnalysis.selectedFiles.map((file) => file.path),
    });
  }
}
