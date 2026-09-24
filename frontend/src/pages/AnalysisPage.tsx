import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Code2,
  ExternalLink,
  FileText,
  Lightbulb,
  Network,
  Package,
  TestTube2,
  UserRound,
} from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { AskRepositoryPanel } from "../components/AskRepositoryPanel";
import { AnalysisProgress } from "../components/AnalysisProgress";
import { SectionHeading } from "../components/SectionHeading";
import { StatCard } from "../components/StatCard";
import type { AnalysisResult, Finding, Severity } from "../types/analysis";

interface AnalysisPageProps {
  result: AnalysisResult;
  onBack: () => void;
  analysisId?: string;
}

const severityStyles: Record<Severity, string> = {
  high: "bg-coral/12 text-coral border-coral/25",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-lime/30 text-ink border-lime/50",
};

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className="border border-ink/10 bg-white p-5 transition hover:border-coral/40 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${severityStyles[finding.severity]}`}
          >
            {finding.severity}
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            {finding.category}
          </span>
        </div>
        {finding.file && (
          <code className="max-w-full truncate rounded bg-paper px-2 py-1 text-xs text-muted">
            {finding.file}
          </code>
        )}
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-ink">
        {finding.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted">{finding.description}</p>
      <div className="mt-4 flex gap-2 border-t border-ink/8 pt-4 text-sm leading-6 text-ink">
        <ChevronRight size={17} className="mt-1 shrink-0 text-coral" />
        <span>
          <strong>Recommendation:</strong> {finding.recommendation}
        </span>
      </div>
    </article>
  );
}

function RepositoryOverview({
  repository,
  analyzedCount,
  selectedCount,
}: {
  repository: AnalysisResult["repository"];
  analyzedCount: number;
  selectedCount: number;
}) {
  return (
    <section
      className="border border-ink/10 bg-white p-6 sm:p-8"
      aria-labelledby="repository-overview"
    >
      <div className="flex flex-col justify-between gap-6 lg:flex-row">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-coral">
            <FileText size={15} /> Repository overview
          </div>
          <h1
            id="repository-overview"
            className="font-display text-3xl font-bold tracking-[-0.04em] text-ink sm:text-5xl"
          >
            {repository.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <UserRound size={15} /> {repository.fullName.split("/")[0]}
            </span>
            <span className="text-ink/20">/</span>
            <span>{repository.defaultBranch} branch</span>
            {repository.language && (
              <span className="rounded-full bg-lime/35 px-2.5 py-1 text-xs font-bold text-ink">
                {repository.language}
              </span>
            )}
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">
            {repository.description ??
              "No repository description was provided."}
          </p>
          <a
            href={repository.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-coral hover:underline"
          >
            View repository <ExternalLink size={15} />
          </a>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[440px] lg:self-end">
          <StatCard label="Stars" value={repository.stargazersCount} />
          <StatCard label="Forks" value={repository.forksCount} />
          <StatCard
            label="Analyzed"
            value={analyzedCount}
            detail={`of ${selectedCount}`}
          />
          <StatCard label="Open issues" value={repository.openIssuesCount} />
        </div>
      </div>
    </section>
  );
}

function TechnologyCard({ name, purpose }: { name: string; purpose: string }) {
  return (
    <div className="border border-ink/10 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-lime/40 px-2.5 py-1 text-xs font-bold text-ink">
          {name}
        </span>
        <Package size={16} className="text-coral" aria-hidden="true" />
      </div>
      <p className="text-sm leading-6 text-muted">{purpose}</p>
    </div>
  );
}

export function AnalysisPage({
  result,
  onBack,
  analysisId,
}: AnalysisPageProps) {
  const { repository, selectedFiles, analyzedFiles, analysis } = result;
  return (
    <main className="min-h-screen px-5 py-6 sm:px-10 lg:px-16">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-ink/10 pb-5">
        <BrandMark />
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white/70 px-3 py-2 text-sm font-bold text-ink transition hover:border-coral hover:text-coral"
        >
          <ArrowLeft size={16} /> New analysis
        </button>
      </header>

      <section className="mx-auto max-w-7xl pb-16 pt-8">
        <div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-coral">
          <span className="size-2 rounded-full bg-lime" /> Analysis complete
        </div>
        <RepositoryOverview
          repository={repository}
          analyzedCount={analyzedFiles.length}
          selectedCount={selectedFiles.length}
        />

        <div className="mt-6">
          <AnalysisProgress completed />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section
            className="border border-ink/10 bg-ink p-6 text-white sm:p-8"
            aria-labelledby="summary-heading"
          >
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-lime">
              Executive summary
            </div>
            <h2
              id="summary-heading"
              className="max-w-3xl font-display text-2xl font-bold leading-tight sm:text-3xl"
            >
              {analysis.summary}
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/65">
              This report is based on {analyzedFiles.length} selected source
              files from the default branch.
            </p>
          </section>
          <section
            className="border border-ink/10 bg-white p-6 sm:p-8"
            aria-labelledby="stack-heading"
          >
            <SectionHeading
              eyebrow="Detected stack"
              title="Technology stack"
              icon={<Package size={15} />}
            />
            <div
              id="stack-heading"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"
            >
              {analysis.technologies.length ? (
                analysis.technologies.map((technology) => (
                  <TechnologyCard key={technology.name} {...technology} />
                ))
              ) : (
                <p className="text-sm text-muted">
                  No technologies were identified from the supplied context.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-6">
          <AskRepositoryPanel analysisId={analysisId ?? result.analysisId} />
        </div>

        <div className="mt-14 grid gap-14 lg:grid-cols-2">
          <section>
            <SectionHeading
              eyebrow="System map"
              title="Architecture"
              icon={<Network size={15} />}
            />
            <p className="mb-5 border-l-2 border-lime bg-white/60 px-4 py-3 text-sm leading-6 text-muted">
              {analysis.architecture.overview}
            </p>
            <div className="space-y-3">
              {analysis.architecture.components.map((component, index) => (
                <div
                  key={`${component}-${index}`}
                  className="flex gap-4 border-l-2 border-lime bg-white/60 px-4 py-3 text-sm text-ink"
                >
                  <span className="font-display font-bold text-coral">
                    0{index + 1}
                  </span>
                  <span>{component}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-ink p-5 text-sm leading-6 text-white/75">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-lime">
                Data flow
              </div>
              {analysis.architecture.dataFlow.map((flow, index) => (
                <div key={`${flow}-${index}`} className="flex gap-2">
                  <span className="text-coral">{index + 1}.</span>
                  {flow}
                </div>
              ))}
            </div>
          </section>
          <section>
            <SectionHeading
              eyebrow="What works"
              title="Strengths"
              icon={<CheckCircle2 size={15} />}
            />
            <div className="space-y-3">
              {analysis.strengths.map((strength, index) => (
                <div
                  key={`${strength.category}-${index}`}
                  className="rounded-xl border border-ink/10 bg-white p-4"
                >
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-coral">
                    {strength.category}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {strength.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-14">
          <SectionHeading
            eyebrow="Engineering radar"
            title="Findings"
            icon={<CircleAlert size={15} />}
            action={
              <span className="text-sm text-muted">
                {analysis.findings.length} total
              </span>
            }
          />
          {analysis.findings.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {analysis.findings.map((finding, index) => (
                <FindingCard
                  key={`${finding.title}-${index}`}
                  finding={finding}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-lime/60 bg-lime/20 px-5 py-4 text-sm font-semibold text-ink">
              <CheckCircle2 size={18} /> No concrete issues were identified in
              the supplied files.
            </div>
          )}
        </section>

        <div className="mt-14 grid gap-14 lg:grid-cols-2">
          <section>
            <SectionHeading
              eyebrow="Forward motion"
              title="Improvements"
              icon={<Lightbulb size={15} />}
            />
            <div className="space-y-3">
              {analysis.improvements.map((improvement, index) => (
                <div
                  key={`${improvement.title}-${index}`}
                  className="flex gap-4 border-b border-ink/10 pb-4"
                >
                  <span
                    className={`mt-0.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${severityStyles[improvement.priority]}`}
                  >
                    {improvement.priority}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      {improvement.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {improvement.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <SectionHeading
              eyebrow="Confidence builder"
              title="Testing recommendations"
              icon={<TestTube2 size={15} />}
            />
            <div className="space-y-2">
              {analysis.testingRecommendations.map((recommendation, index) => (
                <div
                  key={`${recommendation}-${index}`}
                  className="flex gap-3 rounded-xl bg-white p-4 text-sm leading-6 text-muted"
                >
                  <span className="font-display font-bold text-coral">
                    0{index + 1}
                  </span>
                  {recommendation}
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-14 border-t border-ink/10 pt-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted">
            <Code2 size={15} /> Files in this analysis
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {analyzedFiles.map((path) => (
              <code
                key={path}
                className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs text-muted"
              >
                {path}
              </code>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
