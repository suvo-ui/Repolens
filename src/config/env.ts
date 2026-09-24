import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  githubApiUrl: process.env.GITHUB_API_URL ?? "https://api.github.com",
  githubToken: process.env.GITHUB_TOKEN,
  llmApiUrl:
    process.env.LLM_API_URL ?? "https://api.openai.com/v1/chat/completions",
  llmApiKey: process.env.LLM_API_KEY,
  llmModel: process.env.LLM_MODEL ?? "gpt-4.1-mini",
  mongoUri: process.env.MONGO_URI,
  githubRequestTimeoutMs: Number(
    process.env.GITHUB_REQUEST_TIMEOUT_MS ?? 10_000,
  ),
  llmRequestTimeoutMs: Number(process.env.LLM_REQUEST_TIMEOUT_MS ?? 30_000),
  githubFileResponseMaxBytes: Number(
    process.env.GITHUB_FILE_RESPONSE_MAX_BYTES ?? 1_048_576,
  ),
  analyzeRateLimitWindowMs: Number(
    process.env.ANALYZE_RATE_LIMIT_WINDOW_MS ?? 60_000,
  ),
  analyzeRateLimitMax: Number(process.env.ANALYZE_RATE_LIMIT_MAX ?? 5),
  questionRateLimitWindowMs: Number(
    process.env.QUESTION_RATE_LIMIT_WINDOW_MS ?? 60_000,
  ),
  questionRateLimitMax: Number(process.env.QUESTION_RATE_LIMIT_MAX ?? 20),
};
