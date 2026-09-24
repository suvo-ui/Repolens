import "dotenv/config";

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: positiveInteger(process.env.PORT, 3000),
  frontendUrl: process.env.FRONTEND_URL?.trim() || undefined,
  sessionSecret:
    process.env.SESSION_SECRET ?? "development-only-session-secret",
  sessionMaxAgeMs: positiveInteger(
    process.env.SESSION_MAX_AGE_MS,
    7 * 24 * 60 * 60 * 1000,
  ),
  passwordHashRounds: positiveInteger(process.env.PASSWORD_HASH_ROUNDS, 12),
  githubApiUrl: process.env.GITHUB_API_URL ?? "https://api.github.com",
  githubToken: process.env.GITHUB_TOKEN,
  llmApiUrl:
    process.env.LLM_API_URL ?? "https://api.openai.com/v1/chat/completions",
  llmApiKey: process.env.LLM_API_KEY,
  llmModel: process.env.LLM_MODEL ?? "gpt-4.1-mini",
  mongoUri: process.env.MONGO_URI,
  githubRequestTimeoutMs: positiveInteger(
    process.env.GITHUB_REQUEST_TIMEOUT_MS,
    10_000,
  ),
  llmRequestTimeoutMs: positiveInteger(
    process.env.LLM_REQUEST_TIMEOUT_MS,
    30_000,
  ),
  githubFileResponseMaxBytes: positiveInteger(
    process.env.GITHUB_FILE_RESPONSE_MAX_BYTES,
    1_048_576,
  ),
  maxSourceFileBytes: positiveInteger(
    process.env.MAX_SOURCE_FILE_BYTES,
    100_000,
  ),
  maxSourceContentBytes: positiveInteger(
    process.env.MAX_SOURCE_CONTENT_BYTES,
    500_000,
  ),
  analyzeRateLimitWindowMs: positiveInteger(
    process.env.ANALYZE_RATE_LIMIT_WINDOW_MS,
    60_000,
  ),
  analyzeRateLimitMax: positiveInteger(process.env.ANALYZE_RATE_LIMIT_MAX, 5),
  questionRateLimitWindowMs: positiveInteger(
    process.env.QUESTION_RATE_LIMIT_WINDOW_MS,
    60_000,
  ),
  questionRateLimitMax: positiveInteger(
    process.env.QUESTION_RATE_LIMIT_MAX,
    20,
  ),
};
