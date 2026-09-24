import { z } from "zod";
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
  ): Promise<RepositoryQuestionAnswer> {
    const parsedQuestion = questionSchema.safeParse(question);
    if (!parsedQuestion.success) {
      throw new RepositoryQuestionError(
        "Question must be between 1 and 1000 characters",
      );
    }

    const savedAnalysis = await this.analysisRepository.findById(analysisId);
    if (!savedAnalysis) {
      throw new RepositoryQuestionError("Analysis not found", 404);
    }

    const sourceFiles = await Promise.all(
      savedAnalysis.selectedFiles.map(
        async (file): Promise<SelectedSourceFile | null> => {
          try {
            return {
              path: file.path,
              content: await this.githubClient.getFileContent(
                savedAnalysis.owner,
                savedAnalysis.repositoryName,
                file.path,
              ),
            };
          } catch {
            return null;
          }
        },
      ),
    );

    return this.llmService.answerQuestion(
      parsedQuestion.data,
      sourceFiles.filter((file): file is SelectedSourceFile => file !== null),
      {
        repository: savedAnalysis.repository,
        analysisSummary: savedAnalysis.analysis.summary,
        architectureOverview: savedAnalysis.analysis.architecture.overview,
        selectedFilePaths: savedAnalysis.selectedFiles.map((file) => file.path),
      },
    );
  }
}
