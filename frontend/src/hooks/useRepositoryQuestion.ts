import { useState } from "react";
import { askRepositoryQuestion, getApiErrorMessage } from "../services/api";
import type { RepositoryQuestionAnswer } from "../types/analysis";

export function useRepositoryQuestion(analysisId: string | undefined) {
  const [answer, setAnswer] = useState<RepositoryQuestionAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string) {
    if (!analysisId) {
      setError("This analysis has no saved ID yet.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnswer(null);
    try {
      setAnswer(await askRepositoryQuestion(analysisId, question));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  return { answer, isLoading, error, ask };
}
