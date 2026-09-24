import { useState } from "react";
import { analyzeRepository, getApiErrorMessage } from "../services/api";
import type { AnalysisResult } from "../types/analysis";

export function useRepositoryAnalysis() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis(
    repositoryUrl: string,
  ): Promise<AnalysisResult | undefined> {
    setIsLoading(true);
    setError(null);
    try {
      const analysis = await analyzeRepository(repositoryUrl);
      setResult(analysis);
      return analysis;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return { result, isLoading, error, runAnalysis, reset };
}
