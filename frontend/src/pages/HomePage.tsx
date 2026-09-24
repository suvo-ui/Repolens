import {
  ArrowRight,
  GitBranch,
  Link2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { AnalysisProgress } from "../components/AnalysisProgress";
import { BrandMark } from "../components/BrandMark";

interface HomePageProps {
  isLoading: boolean;
  error: string | null;
  onAnalyze: (repositoryUrl: string) => Promise<void>;
  onHistory: () => void;
}

export function HomePage({
  isLoading,
  error,
  onAnalyze,
  onHistory,
}: HomePageProps) {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = repositoryUrl.trim();
    if (!/^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+\/?$/.test(value)) {
      setValidationError(
        "Enter a repository URL like https://github.com/owner/repository",
      );
      return;
    }
    setValidationError(null);
    await onAnalyze(value);
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-6 sm:px-10 lg:px-16">
      <div className="pointer-events-none absolute -right-24 top-24 size-72 rounded-full border-[36px] border-coral/15" />
      <div className="pointer-events-none absolute bottom-[-10rem] left-[-7rem] size-80 rounded-full bg-lime/35 blur-3xl" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between">
        <BrandMark />
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">
          <button
            onClick={onHistory}
            className="rounded-lg px-2 py-1 hover:text-coral"
          >
            History
          </button>
          <span className="hidden items-center gap-2 sm:flex">
            <span className="size-2 rounded-full bg-lime" /> Private by design
          </span>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 pb-14 pt-20 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20 lg:pb-24 lg:pt-28">
        <div className="animate-rise">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
            <Sparkles size={14} className="text-coral" />
            AI-powered repository intelligence
          </div>
          <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.95] tracking-[-0.055em] text-ink sm:text-7xl lg:text-[5.6rem]">
            See the shape of your code.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg">
            RepoLens turns a GitHub repository into a clear engineering brief:
            architecture, technologies, strengths, risks, and the next best
            improvements.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 max-w-2xl">
            <label
              htmlFor="repository-url"
              className="mb-2 block text-sm font-bold text-ink"
            >
              GitHub repository URL
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <GitBranch
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                  size={19}
                />
                <input
                  id="repository-url"
                  value={repositoryUrl}
                  onChange={(event) => setRepositoryUrl(event.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="h-14 w-full rounded-2xl border border-ink/15 bg-white pl-12 pr-4 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-coral focus:ring-4 focus:ring-coral/10"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink px-6 text-sm font-bold text-white transition hover:bg-coral disabled:cursor-wait disabled:opacity-60"
              >
                {isLoading ? "Reading repository..." : "Analyze repository"}
                {!isLoading && <ArrowRight size={18} />}
              </button>
            </div>
            {(validationError || error) && (
              <p
                className="mt-3 rounded-xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm font-medium text-coral"
                role="alert"
              >
                {validationError ?? error}
              </p>
            )}
          </form>

          {isLoading && (
            <div className="mt-6 max-w-2xl">
              <AnalysisProgress />
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-muted">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={15} className="text-coral" /> No code stored
            </span>
            <span className="inline-flex items-center gap-2">
              <Link2 size={15} className="text-coral" /> Read-only analysis
            </span>
          </div>
        </div>

        <div className="animate-rise-delayed relative mx-auto w-full max-w-lg lg:pt-8">
          <div className="absolute -left-5 top-4 z-10 rotate-[-6deg] border border-ink/10 bg-coral px-4 py-3 shadow-[5px_5px_0_#20241f]">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
              Signal over noise
            </div>
            <div className="mt-1 font-display text-lg font-bold text-white">
              One clear brief
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-ink/10 bg-ink p-5 shadow-[12px_16px_0_rgba(32,36,31,0.12)] sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-lime text-ink">
                  <GitBranch size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    octocat / analyser
                  </div>
                  <div className="text-xs text-white/45">
                    main branch · TypeScript
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-lime/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-lime">
                scanned
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-white/10 py-6">
              <div>
                <div className="font-display text-2xl font-bold text-white">
                  24
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/45">
                  files
                </div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-white">
                  08
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/45">
                  findings
                </div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-white">
                  A−
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/45">
                  signal
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-5">
              {[
                [
                  "Architecture",
                  "Modular API with clear service boundaries",
                  "bg-lime",
                ],
                [
                  "Maintainability",
                  "Strong conventions, a few rough edges",
                  "bg-coral",
                ],
                [
                  "Next move",
                  "Add contract tests around analysis flow",
                  "bg-white/70",
                ],
              ].map(([label, text, color]) => (
                <div
                  key={label}
                  className="flex gap-3 rounded-xl bg-white/5 p-3"
                >
                  <span
                    className={`mt-1 size-2 shrink-0 rounded-full ${color}`}
                  />
                  <div>
                    <div className="text-xs font-bold text-white/60">
                      {label}
                    </div>
                    <div className="mt-1 text-sm text-white/90">{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-7 -right-3 flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-3 text-xs font-bold text-ink shadow-lg">
            <span className="size-2 rounded-full bg-lime" /> Built for engineers
          </div>
        </div>
      </section>
    </main>
  );
}
