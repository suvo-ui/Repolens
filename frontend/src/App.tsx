import { useEffect, useState } from "react";
import { AnalysisPage } from "./pages/AnalysisPage";
import { HomePage } from "./pages/HomePage";
import { HistoryPage } from "./pages/HistoryPage";
import { SavedAnalysisPage } from "./pages/SavedAnalysisPage";
import { useRepositoryAnalysis } from "./hooks/useRepositoryAnalysis";

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const analysis = useRepositoryAnalysis();

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

  const savedAnalysisMatch = path.match(/^\/analysis\/([^/]+)$/);
  if (savedAnalysisMatch) {
    return (
      <SavedAnalysisPage
        id={decodeURIComponent(savedAnalysisMatch[1])}
        onBack={() => navigate("/history")}
      />
    );
  }

  if (path === "/history") {
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
