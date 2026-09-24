import { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import type { AnalysisRepository } from "../repositories/analysis.repository";
import { z } from "zod";
import { RepositoryQuestionService } from "../services/repository-question.service";

const questionRequestSchema = z
  .object({ question: z.string().trim().min(1).max(1000) })
  .strict();

export function createAskQuestionController(
  questionService: RepositoryQuestionService,
) {
  return async function askQuestion(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const parsedBody = questionRequestSchema.safeParse(request.body);
    if (!parsedBody.success) {
      response.status(400).json({
        error: "Request body must contain a question of 1 to 1000 characters",
      });
      return;
    }

    try {
      response
        .status(200)
        .json(
          await questionService.ask(
            request.params.id as string,
            parsedBody.data.question,
            request.user!.id,
          ),
        );
    } catch (error) {
      next(error);
    }
  };
}

export function createListAnalysesController(repository: AnalysisRepository) {
  return async function listAnalyses(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      response.status(200).json(await repository.findRecent(request.user!.id));
    } catch (error) {
      next(error);
    }
  };
}

export function createGetAnalysisController(repository: AnalysisRepository) {
  return async function getAnalysis(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    if (!id) {
      response.status(400).json({ error: "Invalid analysis ID" });
      return;
    }
    if (!isValidObjectId(id)) {
      response.status(400).json({ error: "Invalid analysis ID" });
      return;
    }

    try {
      const analysis = await repository.findById(id, request.user!.id);
      if (!analysis) {
        response.status(404).json({ error: "Analysis not found" });
        return;
      }

      response.status(200).json(analysis);
    } catch (error) {
      next(error);
    }
  };
}
