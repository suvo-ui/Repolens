import axios from "axios";
import type {
  AnalysisResult,
  AnalysisHistoryItem,
  AnalyzeRepositoryRequest,
  RepositoryQuestionAnswer,
} from "../types/analysis";
import type {
  AuthResponse,
  LoginRequest,
  MeResponse,
  AuthUser,
  RegisterRequest,
} from "../types/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
  // The backend uses cookie-based express-session authentication.
  withCredentials: true,
});

export async function registerUser(
  input: RegisterRequest,
): Promise<AuthUser> {
  const response = await api.post<AuthResponse>("/auth/register", input);
  return response.data.user;
}

export async function login(input: LoginRequest): Promise<AuthUser> {
  const response = await api.post<AuthResponse>("/auth/login", input);
  return response.data.user;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await api.get<MeResponse>("/auth/me");
  return response.data.user;
}

/** True when the API answered with an authentication failure (401/403). */
export function isAuthenticationError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 401 || error.response?.status === 403)
  );
}

/*
 * Global 401 handling: when an authenticated request (analyze, history,
 * saved analysis, questions) is rejected because the server session is gone,
 * notify listeners so the app invalidates its auth state and shows login —
 * instead of surfacing a generic "service unreachable" message.
 * Auth endpoints themselves are excluded so a failed /auth/me or /auth/login
 * renders normally.
 */
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

api.interceptors.response.use(undefined, (error: unknown) => {
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    !error.config?.url?.startsWith("/auth/")
  ) {
    for (const listener of unauthorizedListeners) listener();
  }
  return Promise.reject(error);
});

export function subscribeToUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

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
