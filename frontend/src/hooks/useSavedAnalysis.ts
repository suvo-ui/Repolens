import { useEffect, useState } from "react";
import { getAnalysis, getApiErrorMessage } from "../services/api";
import type { AnalysisResult } from "../types/analysis";

export function useSavedAnalysis(id: string | null) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    void getAnalysis(id)
      .then((analysis) => {
        if (active) setResult(analysis);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return { result, isLoading, error };
}
