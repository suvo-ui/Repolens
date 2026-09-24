import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  isAuthenticationError,
  login as loginRequest,
  logout as logoutRequest,
  registerUser,
  subscribeToUnauthorized,
} from "../services/api";
import type { AuthUser, LoginRequest, RegisterRequest } from "../types/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** True only when /auth/me failed with something other than 401. */
  isUnexpectedError: boolean;
  login: (input: LoginRequest) => Promise<AuthUser>;
  register: (input: RegisterRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isUnexpectedError, setIsUnexpectedError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setStatus("loading");
      setIsUnexpectedError(false);
      try {
        const currentUser = await getCurrentUser();
        if (cancelled) return;
        setUser(currentUser);
        setStatus("authenticated");
      } catch (error) {
        if (cancelled) return;
        setUser(null);
        if (isAuthenticationError(error) || axios.isAxiosError(error)) {
          // 401 (or a network-shaped response) means "no valid session",
          // not an application failure.
          setStatus("unauthenticated");
        } else {
          setStatus("error");
          setIsUnexpectedError(true);
        }
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const login = useCallback(async (input: LoginRequest) => {
    const loggedIn = await loginRequest(input);
    setUser(loggedIn);
    setStatus("authenticated");
    return loggedIn;
  }, []);

  const register = useCallback(async (input: RegisterRequest) => {
    const created = await registerUser(input);
    setUser(created);
    setStatus("authenticated");
    return created;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      // The session is gone (or the endpoint failed); drop local state either
      // way so the user sees the login experience.
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(
    () =>
      // A 401 on any protected request means the server session expired.
      // Invalidate immediately so the app shows login instead of an
      // "analysis service could not be reached" style error.
      subscribeToUnauthorized(() => {
        setUser(null);
        setStatus("unauthenticated");
        setIsUnexpectedError(false);
      }),
    [],
  );

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      isUnexpectedError,
      login,
      register,
      logout,
      retry,
    }),
    [status, user, isUnexpectedError, login, register, logout, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
