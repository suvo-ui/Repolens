import { AlertCircle, LoaderCircle, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { useRepositoryQuestion } from "../hooks/useRepositoryQuestion";

interface AskRepositoryPanelProps {
  analysisId?: string;
}

export function AskRepositoryPanel({ analysisId }: AskRepositoryPanelProps) {
  const [question, setQuestion] = useState("");
  const { answer, isLoading, error, ask } = useRepositoryQuestion(analysisId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value || isLoading) return;
    await ask(value);
  }

  return (
    <section
      className="border border-ink/10 bg-white p-6 sm:p-8"
      aria-labelledby="ask-repository-heading"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-lime text-ink">
          <MessageSquare size={18} />
        </div>
        <div>
          <h2
            id="ask-repository-heading"
            className="font-display text-xl font-bold text-ink"
          >
            Ask the repository
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Ask about the analyzed context. Answers only use the selected
            repository files and report metadata.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="repository-question" className="sr-only">
          Ask a question about this repository
        </label>
        <input
          id="repository-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Where is authentication implemented?"
          disabled={isLoading || !analysisId}
          className="h-12 min-w-0 flex-1 rounded-xl border border-ink/15 bg-paper px-4 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-coral focus:ring-4 focus:ring-coral/10 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading || !analysisId || !question.trim()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-bold text-white hover:bg-coral disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Send size={17} />
          )}{" "}
          {isLoading ? "Thinking..." : "Ask"}
        </button>
      </form>
      {!analysisId && (
        <p className="mt-3 text-xs text-muted">
          Ask is available for persisted analyses.
        </p>
      )}
      {error && (
        <div
          className="mt-4 flex items-center gap-2 rounded-lg border border-coral/25 bg-coral/8 px-4 py-3 text-sm font-medium text-coral"
          role="alert"
        >
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {answer && (
        <div className="mt-5 border-l-2 border-lime bg-paper p-4">
          <p className="text-sm leading-6 text-ink">{answer.answer}</p>
          {answer.relevantFiles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Relevant files
              </span>
              {answer.relevantFiles.map((file) => (
                <code
                  key={file}
                  className="rounded bg-white px-2 py-1 text-xs text-muted"
                >
                  {file}
                </code>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
