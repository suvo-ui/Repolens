import { Check, Circle, LoaderCircle } from "lucide-react";

const stages = [
  "Repository validated",
  "Repository structure retrieved",
  "Relevant files selected",
  "Source files retrieved",
  "Repository analyzed",
  "Report ready",
];

interface AnalysisProgressProps {
  completed?: boolean;
}

export function AnalysisProgress({ completed = false }: AnalysisProgressProps) {
  return (
    <section
      className="border border-ink/10 bg-white p-5 sm:p-6"
      aria-label={
        completed ? "Analysis pipeline complete" : "Analysis in progress"
      }
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            {completed
              ? "Analysis pipeline complete"
              : "Working through the repository"}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
            {completed
              ? "The report below was returned after the full repository analysis completed."
              : "The backend returns one response when this process completes, so intermediate stages are not estimated."}
          </p>
        </div>
        {!completed && (
          <LoaderCircle
            className="shrink-0 animate-spin text-coral"
            size={20}
            aria-label="Analysis in progress"
          />
        )}
      </div>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stages.map((stage, index) => {
          const isActive = !completed && index === 0;
          return (
            <li
              key={stage}
              className={`flex items-center gap-3 text-sm ${completed ? "text-ink" : isActive ? "font-bold text-ink" : "text-muted"}`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full border ${completed ? "border-lime bg-lime text-ink" : isActive ? "border-coral text-coral" : "border-ink/15 text-muted"}`}
              >
                {completed ? (
                  <Check size={14} strokeWidth={3} />
                ) : isActive ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Circle size={9} fill="currentColor" />
                )}
              </span>
              {stage}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
