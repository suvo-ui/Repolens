import axios from "axios";
import type {
  AnalysisResult,
  AnalysisHistoryItem,
  AnalyzeRepositoryRequest,
  RepositoryQuestionAnswer,
} from "../types/analysis";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

export async function analyzeRepository(
  repositoryUrl: string,
): Promise<AnalysisResult> {
  const request: AnalyzeRepositoryRequest = { repositoryUrl };
  const response = await api.post<AnalysisResult>("/analyze", request);
  return response.data;
}

export async function getAnalysisHistory(): Promise<AnalysisHistoryItem[]> {
  const response = await api.get<AnalysisHistoryItem[]>("/analyses");
  return response.data;
}

export async function getAnalysis(id: string): Promise<AnalysisResult> {
  const response = await api.get<AnalysisResult>(
    `/analyses/${encodeURIComponent(id)}`,
  );
  return response.data;
}

export async function askRepositoryQuestion(
  id: string,
  question: string,
): Promise<RepositoryQuestionAnswer> {
  const response = await api.post<RepositoryQuestionAnswer>(
    `/analyses/${encodeURIComponent(id)}/questions`,
    { question },
  );
  return response.data;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return (
      error.response?.data?.error ??
      "The analysis service could not be reached."
    );
  }
  return "Something went wrong while analyzing the repository.";
}
