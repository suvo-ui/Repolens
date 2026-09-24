import { LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/api";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleLogout() {
    setIsLoggingOut(true);
    setError(null);
    try {
      await logout();
    } catch (logoutError) {
      setError(getApiErrorMessage(logoutError));
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
      {error && (
        <span className="normal-case tracking-normal text-coral" role="alert">
          {error}
        </span>
      )}
      <span className="hidden items-center gap-2 normal-case tracking-normal sm:flex">
        <span className="grid size-7 place-items-center rounded-full bg-ink text-[11px] font-bold text-lime">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="text-ink">{user.name}</span>
      </span>
      <button
        onClick={() => void handleLogout()}
        disabled={isLoggingOut}
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 transition hover:text-coral disabled:opacity-50"
      >
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
}
