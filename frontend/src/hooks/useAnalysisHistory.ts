import { useCallback, useEffect, useState } from "react";
import { getAnalysisHistory, getApiErrorMessage } from "../services/api";
import type { AnalysisHistoryItem } from "../types/analysis";

export function useAnalysisHistory() {
  const [analyses, setAnalyses] = useState<AnalysisHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setAnalyses(await getAnalysisHistory());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { analyses, isLoading, error, reload: load };
}
