import { LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { BrandMark } from "./components/BrandMark";
import { AnalysisPage } from "./pages/AnalysisPage";
import { HomePage } from "./pages/HomePage";
import { HistoryPage } from "./pages/HistoryPage";
import { SavedAnalysisPage } from "./pages/SavedAnalysisPage";
import { useAuth } from "./hooks/useAuth";
import { useRepositoryAnalysis } from "./hooks/useRepositoryAnalysis";

export default function App() {
  const { status, isUnexpectedError, retry } = useAuth();
  const analysis = useRepositoryAnalysis();

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div
          className="flex items-center gap-3 text-sm font-semibold text-muted"
          role="status"
        >
          <LoaderCircle className="animate-spin text-coral" size={20} />
          Checking your session...
        </div>
      </main>
    );
  }

  // No valid server session: show the login/register experience for every
  // route instead of letting analysis/history calls fail with a raw 401.
  // Both /login and /register deep-link correctly on a browser refresh.
  if (status === "unauthenticated") {
    const initialMode =
      window.location.pathname === "/register" ? "register" : "login";
    return <AuthScreen initialMode={initialMode} />;
  }

  if (status === "error" || isUnexpectedError) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <section
          className="max-w-md border border-coral/25 bg-white p-8 text-center"
          role="alert"
        >
          <BrandMark />
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">
            Could not reach RepoLens
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            We could not verify your session. Please try again in a moment.
          </p>
          <button
            onClick={retry}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-coral"
          >
            <RefreshCw size={15} /> Try again
          </button>
        </section>
      </main>
    );
  }

  return <RepoLensApp analysis={analysis} />;
}

interface RepoLensAppProps {
  analysis: ReturnType<typeof useRepositoryAnalysis>;
}

function RepoLensApp({ analysis }: RepoLensAppProps) {
  const [path, setPath] = useState(window.location.pathname);
  // An authenticated user who lands on /login or /register (bookmark,
  // back button, or a stale link) goes straight into the application.
  const isAuthRoute = path === "/login" || path === "/register";
  const appPath = isAuthRoute ? "/" : path;

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextPath: string) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  async function handleAnalyze(repositoryUrl: string) {
    const result = await analysis.runAnalysis(repositoryUrl);
    if (result?.analysisId) navigate(`/analysis/${result.analysisId}`);
  }

  const savedAnalysisMatch = appPath.match(/^\/analysis\/([^/]+)$/);
  if (savedAnalysisMatch) {
    return (
      <SavedAnalysisPage
        id={decodeURIComponent(savedAnalysisMatch[1])}
        onBack={() => navigate("/history")}
      />
    );
  }

  if (appPath === "/history") {
    return (
      <HistoryPage
        onBack={() => navigate("/")}
        onOpen={(id) => navigate(`/analysis/${id}`)}
      />
    );
  }

  if (analysis.result) {
    return (
      <AnalysisPage
        result={analysis.result}
        onBack={() => {
          analysis.reset();
          navigate("/");
        }}
      />
    );
  }

  return (
    <HomePage
      isLoading={analysis.isLoading}
      error={analysis.error}
      onAnalyze={handleAnalyze}
      onHistory={() => navigate("/history")}
    />
  );
}
