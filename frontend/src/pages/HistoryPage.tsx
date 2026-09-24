import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  History as HistoryIcon,
  RefreshCw,
} from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { UserMenu } from "../components/UserMenu";
import { useAnalysisHistory } from "../hooks/useAnalysisHistory";

interface HistoryPageProps {
  onBack: () => void;
  onOpen: (id: string) => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function HistoryPage({ onBack, onOpen }: HistoryPageProps) {
  const { analyses, isLoading, error, reload } = useAnalysisHistory();

  return (
    <main className="min-h-screen px-5 py-6 sm:px-10 lg:px-16">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-ink/10 pb-5">
        <BrandMark />
        <div className="flex items-center gap-4">
          <UserMenu />
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white/70 px-3 py-2 text-sm font-bold text-ink transition hover:border-coral hover:text-coral"
          >
            <ArrowLeft size={16} /> New analysis
          </button>
        </div>
      </header>
      <section className="mx-auto max-w-7xl pb-16 pt-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-coral">
              <HistoryIcon size={15} /> Workspace history
            </div>
            <h1 className="font-display text-4xl font-bold tracking-[-0.04em] text-ink sm:text-5xl">
              Previous analyses
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Revisit the repository reports already generated in RepoLens.
            </p>
          </div>
          {!isLoading && !error && (
            <span className="text-sm font-semibold text-muted">
              {analyses.length}{" "}
              {analyses.length === 1 ? "analysis" : "analyses"}
            </span>
          )}
        </div>

        {isLoading && (
          <div
            className="border border-ink/10 bg-white p-8 text-sm text-muted"
            role="status"
          >
            Loading analysis history...
          </div>
        )}
        {error && (
          <div
            className="flex flex-col gap-4 border border-coral/25 bg-coral/8 p-6 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <div className="flex items-center gap-3 text-sm font-semibold text-coral">
              <AlertCircle size={18} /> {error}
            </div>
            <button
              onClick={() => void reload()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-bold text-white hover:bg-coral"
            >
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        )}
        {!isLoading && !error && analyses.length === 0 && (
          <div className="border border-dashed border-ink/20 bg-white/60 p-10 text-center">
            <Clock3 className="mx-auto text-muted" size={28} />
            <h2 className="mt-4 font-display text-xl font-bold text-ink">
              No analyses yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Run your first repository analysis and it will appear here.
            </p>
            <button
              onClick={onBack}
              className="mt-5 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-coral"
            >
              Analyze a repository
            </button>
          </div>
        )}
        {!isLoading && !error && analyses.length > 0 && (
          <div className="overflow-hidden border border-ink/10 bg-white">
            <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_2fr_auto] gap-4 border-b border-ink/10 bg-paper px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted md:grid">
              <span>Repository</span>
              <span>Language</span>
              <span>Created</span>
              <span>Summary</span>
              <span />
            </div>
            <div className="divide-y divide-ink/8">
              {analyses.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onOpen(item.id)}
                  className="grid w-full gap-3 px-5 py-5 text-left transition hover:bg-paper md:grid-cols-[1.2fr_1fr_0.8fr_2fr_auto] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-display text-base font-bold text-ink">
                      {item.repositoryName}
                    </div>
                    <a
                      href={item.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-muted hover:text-coral"
                    >
                      <span className="truncate">{item.repositoryUrl}</span>
                      <ExternalLink size={12} className="shrink-0" />
                    </a>
                  </div>
                  <div>
                    <span className="rounded-full bg-lime/35 px-2.5 py-1 text-xs font-bold text-ink">
                      {item.primaryLanguage ?? "Unknown"}
                    </span>
                  </div>
                  <div className="text-xs text-muted">
                    {formatDate(item.createdAt)}
                  </div>
                  <div className="line-clamp-2 text-sm leading-5 text-muted">
                    {item.summary}
                  </div>
                  <ChevronRight
                    className="hidden text-coral md:block"
                    size={18}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
