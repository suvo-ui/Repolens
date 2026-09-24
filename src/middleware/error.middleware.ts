import { ErrorRequestHandler } from "express";

interface HttpError extends Error {
  statusCode?: number;
  status?: number;
  type?: string;
}

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  const typedError = error as HttpError;
  const isMalformedJson = typedError.type === "entity.parse.failed";
  const isNotFound =
    typedError.name === "GitHubApiError" && typedError.status === 404;
  const statusCode =
    typedError.statusCode ??
    (isMalformedJson
      ? 400
      : isNotFound
        ? 404
        : typedError.name === "GitHubApiError" ||
            typedError.name === "LlmServiceError"
          ? 502
          : typedError.name === "AnalysisRepositoryError"
            ? 503
            : typedError.name === "RepositoryAnalyzerError"
              ? 422
              : (typedError.status ?? 500));
  const provider =
    typedError.name === "GitHubApiError"
      ? "github"
      : typedError.name === "LlmServiceError"
        ? "llm"
        : typedError.name === "AnalysisRepositoryError"
          ? "mongodb"
          : "application";
  console.error(
    JSON.stringify({
      event: "api_error",
      code: typedError.name || "UnknownError",
      provider,
      status: statusCode,
    }),
  );
  const isSafeClientError =
    typedError.name === "AnalyzeRequestValidationError" ||
    typedError.name === "RepositoryAnalyzerError" ||
    typedError.name === "RepositoryQuestionError";
  const publicMessage = isMalformedJson
    ? "Invalid JSON request body"
    : isNotFound
      ? "Repository not found"
      : isSafeClientError && statusCode < 500
        ? typedError.message
        : statusCode === 429
          ? "Too many requests. Please try again later."
          : statusCode === 502
            ? "Upstream service unavailable"
            : statusCode === 503
              ? "Analysis storage unavailable"
              : statusCode >= 400 && statusCode < 500
                ? "Invalid request"
                : "Internal Server Error";
  response.status(statusCode).json({
    error: publicMessage,
  });
};
