import { AnalysisModel } from "../models/analysis.model";
import type {
  AnalysisHistoryItem,
  PersistedAnalysis,
  PersistedAnalysisInput,
} from "../models/analysis.model";

export interface AnalysisRepository {
  create(input: PersistedAnalysisInput): Promise<string>;
  findById(id: string, userId: string): Promise<PersistedAnalysis | null>;
  findRecent(userId: string, limit?: number): Promise<AnalysisHistoryItem[]>;
}

export class AnalysisRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AnalysisRepositoryError";
  }
}

export class MongooseAnalysisRepository implements AnalysisRepository {
  async create(input: PersistedAnalysisInput): Promise<string> {
    try {
      const analysis = await AnalysisModel.create(input);
      return analysis._id.toString();
    } catch (error) {
      throw new AnalysisRepositoryError(
        "Unable to persist repository analysis",
        { cause: error },
      );
    }
  }

  async findById(
    id: string,
    userId: string,
  ): Promise<PersistedAnalysis | null> {
    try {
      return await AnalysisModel.findOne({ _id: id, userId })
        .lean<PersistedAnalysis>()
        .exec();
    } catch (error) {
      throw new AnalysisRepositoryError(
        "Unable to retrieve repository analysis",
        { cause: error },
      );
    }
  }

  async findRecent(userId: string, limit = 25): Promise<AnalysisHistoryItem[]> {
    try {
      const analyses = await AnalysisModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select({
          repositoryName: 1,
          repositoryUrl: 1,
          createdAt: 1,
          "repository.language": 1,
          "analysis.summary": 1,
        })
        .lean()
        .exec();

      return analyses.map((analysis) => ({
        id: analysis._id.toString(),
        repositoryName: analysis.repositoryName,
        repositoryUrl: analysis.repositoryUrl,
        createdAt: analysis.createdAt,
        primaryLanguage: analysis.repository?.language ?? null,
        summary: analysis.analysis?.summary ?? "",
      }));
    } catch (error) {
      throw new AnalysisRepositoryError("Unable to list repository analyses", {
        cause: error,
      });
    }
  }
}
