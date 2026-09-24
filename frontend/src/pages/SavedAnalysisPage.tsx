import { AlertCircle, ArrowLeft, LoaderCircle } from "lucide-react";
import { AnalysisPage } from "./AnalysisPage";
import { useSavedAnalysis } from "../hooks/useSavedAnalysis";

interface SavedAnalysisPageProps {
  id: string;
  onBack: () => void;
}

export function SavedAnalysisPage({ id, onBack }: SavedAnalysisPageProps) {
  const { result, isLoading, error } = useSavedAnalysis(id);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div
          className="flex items-center gap-3 text-sm font-semibold text-muted"
          role="status"
        >
          <LoaderCircle className="animate-spin text-coral" size={20} /> Loading
          saved analysis...
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <section
          className="max-w-md border border-coral/25 bg-white p-8 text-center"
          role="alert"
        >
          <AlertCircle className="mx-auto text-coral" size={28} />
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">
            Could not load analysis
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {error ?? "This analysis is no longer available."}
          </p>
          <button
            onClick={onBack}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-coral"
          >
            <ArrowLeft size={16} /> Back to history
          </button>
        </section>
      </main>
    );
  }

  return <AnalysisPage result={result} analysisId={id} onBack={onBack} />;
}
