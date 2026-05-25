import { useCallback, useState } from "react";
import { useConversationControls, useConversationStatus } from "@elevenlabs/react";
import { useVoiceAgent } from "./voiceAgentContext";
import { useProgressionAgentTools } from "./useProgressionAgentTools";

/**
 * The voice companion panel. Render it inside <VoiceAgentProvider/> wherever
 * the progression builder lives (beside the playback / randomize controls).
 *
 * Connecting flow: if a signed-URL endpoint is configured, fetch a short-lived
 * URL and open the session with it; otherwise connect with the bare agent id
 * (public dev agent only). The microphone permission prompt fires only when the
 * user starts a session (the connect button), never on mount.
 *
 * Styling follows the repo convention: Tailwind for layout only; every color,
 * type, surface and motion value is a semantic CSS variable applied inline (see
 * ProgressionAgent.tsx). The only stylesheet is the scoped <style> below, used
 * for the orb keyframes, :focus-visible rings, and the reduced-motion guard —
 * the same local-<style> pattern ProgressionAgent.tsx uses for its spinner.
 */
export function VoiceAgentPanel() {
  const { bridge, agentId, signedUrlEndpoint, transcript } = useVoiceAgent();
  const { startSession, endSession } = useConversationControls();
  const { status, message } = useConversationStatus();

  // Register the progression-builder tools for the lifetime of this panel.
  useProgressionAgentTools(bridge);

  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const live = status === "connected";
  // Treat the SDK's own "connecting" status as busy too: startSession resolves
  // before the handshake finishes, so local `connecting` flips false mid-connect
  // and the button would otherwise re-enable and flash "Offline". (The SDK's
  // lockRef already blocks a duplicate startSession; this fixes the misleading UI.)
  const busy = connecting || status === "connecting";
  const state: "live" | "wait" | "idle" = live ? "live" : busy ? "wait" : "idle";

  // startSession resolves before the WebSocket/mic handshake finishes, so a
  // failed connection (denied mic, dropped session) surfaces via status — not
  // the handleStart catch. Fold it in so connection failures aren't silent.
  const displayError =
    error ?? (status === "error" ? (message ?? "The voice session ran into a problem.") : null);

  const handleStart = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      if (signedUrlEndpoint) {
        const res = await fetch(signedUrlEndpoint, { method: "POST" });
        // The Worker always replies JSON (even on failure); read its { error } so
        // the user sees a real message rather than a bare status code.
        const data = (await res.json().catch(() => ({}))) as {
          signedUrl?: string;
          error?: string;
        };
        if (!res.ok || !data.signedUrl) {
          throw new Error(data.error ?? "Couldn't start the voice session — please try again.");
        }
        await startSession({ signedUrl: data.signedUrl });
      } else {
        await startSession({ agentId });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the voice session");
    } finally {
      setConnecting(false);
    }
  }, [signedUrlEndpoint, agentId, startSession]);

  const handleStop = useCallback(async () => {
    try {
      await endSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not end the session cleanly");
    }
  }, [endSession]);

  const statusColor =
    state === "live"
      ? "var(--status-success-text)"
      : state === "wait"
        ? "var(--text-warm)"
        : "var(--text-muted)";

  return (
    <section
      className="hhv flex flex-col gap-4 w-full max-w-md rounded-xl"
      aria-label="Harmony companion voice agent"
      style={{
        padding: "var(--space-5, 1.25rem)",
        background: "var(--surface-overlay)",
        border: `1px solid ${live ? "var(--border-accent)" : "var(--border-subtle)"}`,
        boxShadow: live ? "var(--glow-accent)" : "none",
        transition: "border-color var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out)",
      }}
    >
      <header className="flex items-center justify-between">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--weight-semibold)",
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          Harmony Companion
        </span>
        <span
          className="rounded-full"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            letterSpacing: "var(--tracking-wide)",
            textTransform: "uppercase",
            padding: "0.18rem 0.55rem",
            color: statusColor,
            border: `1px solid color-mix(in srgb, ${statusColor} 40%, transparent)`,
          }}
        >
          {live ? "Listening" : busy ? "Connecting" : "Offline"}
        </span>
      </header>

      <div
        className="hhv-orb self-center"
        data-state={state}
        aria-hidden="true"
        style={{ position: "relative", width: 84, height: 84, display: "grid", placeItems: "center" }}
      >
        <span
          className="hhv-orb-core"
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--radius-full)",
            background: "radial-gradient(circle at 35% 30%, var(--text-warm), var(--text-accent))",
            boxShadow: state === "idle" ? "none" : "var(--glow-accent)",
            filter: state === "idle" ? "saturate(0.3) brightness(0.65)" : "none",
            transition: "filter var(--duration-normal) var(--ease-out)",
          }}
        />
        <span
          className="hhv-orb-ring"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "var(--radius-full)",
            border: "1.5px solid color-mix(in srgb, var(--text-accent) 55%, transparent)",
            opacity: 0,
          }}
        />
      </div>

      <p
        className="text-center"
        style={{
          margin: 0,
          fontSize: "var(--text-sm)",
          lineHeight: "var(--leading-normal)",
          color: "var(--text-muted)",
        }}
      >
        {live
          ? "Ask for a progression, or have me explain the theory — keep it simple or go deep."
          : "Talk through a chord progression, or get the theory behind the one on your timeline."}
      </p>

      {transcript.length > 0 && (
        <ul
          className="flex flex-col gap-2 rounded-lg"
          style={{
            listStyle: "none",
            margin: 0,
            padding: "0.625rem",
            maxHeight: "10.5rem",
            overflowY: "auto",
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {transcript.slice(-6).map((entry) => (
            <li
              key={entry.id}
              style={{
                fontSize: "var(--text-xs)",
                lineHeight: "var(--leading-normal)",
                color: entry.role === "user" ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  letterSpacing: "var(--tracking-caps)",
                  textTransform: "uppercase",
                  marginBottom: "0.125rem",
                  color: entry.role === "user" ? "var(--text-muted)" : "var(--text-accent)",
                }}
              >
                {entry.role === "user" ? "You" : "Companion"}
              </span>
              {entry.text}
            </li>
          ))}
        </ul>
      )}

      {displayError && (
        <p
          role="alert"
          className="rounded-lg"
          style={{
            margin: 0,
            padding: "0.5rem 0.625rem",
            fontSize: "var(--text-xs)",
            lineHeight: "var(--leading-normal)",
            color: "var(--status-error-text)",
            background: "var(--status-error-bg)",
            border: "1px solid var(--status-error-border)",
          }}
        >
          {displayError}
        </p>
      )}

      {live ? (
        <button
          type="button"
          className="hhv-btn rounded-lg"
          onClick={handleStop}
          style={{
            padding: "0.7rem 0.875rem",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            letterSpacing: "var(--tracking-wide)",
            cursor: "pointer",
            color: "var(--text-primary)",
            background: "var(--surface-raised)",
            border: "1px solid var(--border-default)",
            transition: "background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-strong)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)";
          }}
        >
          End conversation
        </button>
      ) : (
        <button
          type="button"
          className="hhv-btn rounded-lg"
          onClick={handleStart}
          disabled={busy}
          aria-busy={busy}
          style={{
            padding: "0.7rem 0.875rem",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--weight-semibold)",
            letterSpacing: "var(--tracking-wide)",
            cursor: busy ? "progress" : "pointer",
            opacity: busy ? 0.6 : 1,
            color: "var(--interactive-accent-text)",
            background: "var(--interactive-accent-bg)",
            border: "1px solid var(--interactive-accent-border)",
            transition: "background var(--duration-fast) var(--ease-out)",
          }}
          onMouseEnter={(e) => {
            if (!busy) e.currentTarget.style.background = "var(--interactive-accent-bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--interactive-accent-bg)";
          }}
        >
          {busy ? "Connecting…" : "Talk to the companion"}
        </button>
      )}

      <style>{`
        @keyframes hhv-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.14); } }
        @keyframes hhv-ring { 0% { opacity: 0.6; transform: scale(0.55); } 80%, 100% { opacity: 0; transform: scale(1.2); } }
        .hhv-orb[data-state="wait"] .hhv-orb-core { animation: hhv-breathe 1.4s var(--ease-out, ease-in-out) infinite; }
        .hhv-orb[data-state="live"] .hhv-orb-core { animation: hhv-breathe 2.4s var(--ease-out, ease-in-out) infinite; }
        .hhv-orb[data-state="live"] .hhv-orb-ring { animation: hhv-ring 2.4s var(--ease-out, ease-out) infinite; }
        .hhv-btn:focus-visible { outline: 2px solid var(--interactive-focus-ring); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .hhv-orb-core, .hhv-orb-ring { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
