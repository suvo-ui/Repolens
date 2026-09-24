import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { RepositoryAnalyzer } from "../services/repository-analyzer.service";

const analyzeRequestSchema = z
  .object({
    repositoryUrl: z.string().trim().url().max(2048),
  })
  .strict();

export class AnalyzeRequestValidationError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "AnalyzeRequestValidationError";
  }
}

export function createAnalyzeController(analyzer: RepositoryAnalyzer) {
  return async function postAnalyze(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const parsedRequest = analyzeRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      next(
        new AnalyzeRequestValidationError(
          "Request body must contain a valid repositoryUrl",
        ),
      );
      return;
    }

    try {
      const result = await analyzer.analyze(
        parsedRequest.data.repositoryUrl,
        request.user?.id,
      );
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
