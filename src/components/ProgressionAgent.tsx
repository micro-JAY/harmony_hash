import { useEffect, useState } from "react";
import type { IndexedChord, ParseError } from "../lib/types";
import { lookupChord } from "../lib/chordData";
import { checkHealth, generateProgression } from "../lib/progressionClient";

type HealthStatus = "checking" | "ready" | "unavailable";

interface DisplayChord {
  input: string;
  chord: IndexedChord;
}

interface ProgressionAgentProps {
  onResult: (chords: DisplayChord[], errors: ParseError[]) => void;
  placeholder?: string;
}

const MAX_PROMPT = 500;

export default function ProgressionAgent({ onResult, placeholder }: ProgressionAgentProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus>("checking");

  useEffect(() => {
    const ctrl = new AbortController();
    checkHealth(ctrl.signal)
      .then((res) => setHealth(res.ok ? "ready" : "unavailable"))
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setHealth("unavailable");
      });
    return () => ctrl.abort();
  }, []);

  const trimmed = prompt.trim();
  const overLength = prompt.length > MAX_PROMPT;
  const canSubmit = trimmed.length > 0 && !overLength && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setRationale(null);
    setResolvedKey(null);

    try {
      const result = await generateProgression(trimmed);
      const resolved: DisplayChord[] = [];
      const errors: ParseError[] = [];
      result.chords.forEach((name, i) => {
        const chord = lookupChord(name);
        if (chord) {
          resolved.push({ input: name, chord });
        } else {
          errors.push({ index: i, input: name, message: `Could not resolve: "${name}"` });
        }
      });
      setRationale(result.rationale);
      setResolvedKey(result.key);
      onResult(resolved, errors);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const remaining = MAX_PROMPT - prompt.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 items-stretch sm:flex-row">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder={placeholder ?? "Describe the mood, style, or feel — e.g. “melancholic with a jazz feel in minor”"}
          disabled={loading}
          className="w-full min-w-0 flex-1 px-4 py-3 rounded-lg text-base outline-none transition-all resize-none"
          style={{
            backgroundColor: "var(--surface-overlay)",
            color: "var(--text-primary)",
            border: `1px solid ${overLength ? "var(--status-error-border)" : "var(--border-subtle)"}`,
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-normal)",
            transitionDuration: "var(--duration-normal)",
            opacity: loading ? 0.6 : 1,
          }}
          aria-label="Describe the progression you want"
        />
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full px-6 py-3 rounded-lg font-semibold transition-all shrink-0 self-stretch flex items-center gap-2 sm:w-auto sm:min-w-[11rem]"
          style={{
            backgroundColor: canSubmit
              ? "var(--interactive-accent-bg)"
              : "var(--surface-overlay)",
            color: canSubmit
              ? "var(--interactive-accent-text)"
              : "var(--text-muted)",
            border: `1px solid ${canSubmit ? "var(--interactive-accent-border)" : "var(--border-subtle)"}`,
            fontWeight: "var(--weight-semibold)",
            transitionDuration: "var(--duration-normal)",
            cursor: canSubmit ? "pointer" : "not-allowed",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            if (canSubmit) {
              e.currentTarget.style.backgroundColor = "var(--interactive-accent-bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (canSubmit) {
              e.currentTarget.style.backgroundColor = "var(--interactive-accent-bg)";
            }
          }}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span
                aria-hidden
                style={{
                  width: "0.9em",
                  height: "0.9em",
                  borderRadius: "var(--radius-full)",
                  border: "2px solid currentColor",
                  borderRightColor: "transparent",
                  display: "inline-block",
                  animation: "progression-agent-spin 0.8s linear infinite",
                }}
              />
              <span>Building…</span>
            </>
          ) : (
            <span>Build progression</span>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className="text-xs"
          style={{
            color: overLength ? "var(--status-error-text)" : "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {overLength
            ? `${Math.abs(remaining)} over the ${MAX_PROMPT}-character limit`
            : `${remaining} characters left`}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <HealthPill status={health} />
          <span
            className="hidden text-xs sm:inline"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            ⌘↵ to build
          </span>
        </div>
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-lg flex items-center justify-between gap-3"
          style={{
            backgroundColor: "var(--status-error-bg)",
            color: "var(--status-error-text)",
            border: "1px solid var(--status-error-border)",
          }}
          role="alert"
        >
          <span className="text-sm" style={{ flex: 1 }}>
            {error}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit && !error}
            className="px-3 py-1 rounded-md text-xs transition-all"
            style={{
              backgroundColor: "var(--surface-overlay)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              fontWeight: "var(--weight-medium)",
              transitionDuration: "var(--duration-fast)",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {rationale && !error && (
        <div
          className="px-4 py-3 rounded-lg"
          style={{
            backgroundColor: "var(--surface-overlay)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {resolvedKey && (
            <span
              className="text-xs uppercase mr-2"
              style={{
                color: "var(--text-accent)",
                letterSpacing: "var(--tracking-caps)",
                fontWeight: "var(--weight-semibold)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {resolvedKey}
            </span>
          )}
          <span
            className="text-sm"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-body)",
              lineHeight: "var(--leading-normal)",
            }}
          >
            {rationale}
          </span>
        </div>
      )}

      <style>{`
        @keyframes progression-agent-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function HealthPill({ status }: { status: HealthStatus }) {
  const { dot, label, title } = {
    checking: {
      dot: "var(--text-muted)",
      label: "Checking…",
      title: "Checking API status",
    },
    ready: {
      dot: "var(--status-success-text, #4ade80)",
      label: "API ready",
      title: "API is reachable and configured",
    },
    unavailable: {
      dot: "var(--status-error-text, #f87171)",
      label: "Service unavailable",
      title: "API is unreachable or missing required config",
    },
  }[status];

  return (
    <span
      className="text-xs inline-flex items-center gap-1.5"
      style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
      title={title}
      aria-live="polite"
    >
      <span
        aria-hidden
        style={{
          width: "0.5rem",
          height: "0.5rem",
          borderRadius: "var(--radius-full)",
          backgroundColor: dot,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}
