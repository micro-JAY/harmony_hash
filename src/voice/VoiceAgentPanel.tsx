import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { HARMONY_TEXT_MAX_LENGTH, useVoiceAgent } from "./voiceAgentContext";
import type { VoiceInputMode } from "./openAIRealtimeSession";
import { voiceAudioHealthIssue } from "./audioHealth";
import { useT } from "../i18n/I18nContext";

/**
 * The voice companion panel. Render it inside <VoiceAgentProvider/> wherever
 * the progression builder lives (beside the playback / randomize controls).
 *
 * The provider mints a short-lived Realtime client secret before requesting the
 * microphone in Voice mode. Type mode receives spoken audio without requesting
 * a microphone. Neither mode connects before the user starts a session.
 *
 * Styling follows the repo convention: Tailwind for layout only; every color,
 * type, surface and motion value is a semantic CSS variable applied inline (see
 * ProgressionAgent.tsx). The only stylesheet is the scoped <style> below, used
 * for the orb keyframes, :focus-visible rings, and the reduced-motion guard —
 * the same local-<style> pattern ProgressionAgent.tsx uses for its spinner.
 */
interface VoiceAgentPanelProps {
  open: boolean;
  onClose: () => void;
}

export function VoiceAgentPanel({ open, onClose }: VoiceAgentPanelProps) {
  const t = useT();
  const {
    status,
    message,
    playbackError,
    startSession,
    endSession,
    sendText,
    draft,
    setDraft,
    textPending,
    replyPending,
    resumePlayback,
    setVolume,
    transcript,
    sessionKind,
    audioPacketCount,
    agentReplyCount,
    agentReplyAudioBaseline,
  } = useVoiceAgent();

  const [error, setError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [inputMode, setInputMode] = useState<VoiceInputMode>("voice");
  const connectionAttemptRef = useRef<AbortController | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const live = status === "connected";
  // Keep the local lock through the awaited WebRTC handshake. The transport
  // status is included as a second guard against duplicate starts.
  const busy = connecting || status === "connecting";
  const state: "live" | "wait" | "idle" = live ? "live" : busy ? "wait" : "idle";
  const canSend = live && !replyPending && draft.trim().length > 0;

  const displayError =
    error ?? playbackError ?? audioError ??
    (status === "error" ? (message ?? t("The voice session ran into a problem.")) : null);

  const handleStart = useCallback(async () => {
    connectionAttemptRef.current?.abort();
    const controller = new AbortController();
    connectionAttemptRef.current = controller;
    setError(null);
    setAudioError(null);
    setConnecting(true);
    try {
      await startSession(inputMode, controller.signal);
      if (controller.signal.aborted) await endSession();
    } catch (e) {
      if (controller.signal.aborted || (e instanceof Error && e.name === "AbortError")) return;
      setError(e instanceof Error ? e.message : t("Could not start the voice session"));
    } finally {
      if (connectionAttemptRef.current === controller) {
        connectionAttemptRef.current = null;
        setConnecting(false);
      }
    }
  }, [endSession, inputMode, startSession, t]);

  const handleSend = useCallback(() => {
    const result = sendText(draft);
    if (result === "sent") {
      setError(null);
      return;
    }
    const errors = {
      empty: t("Enter a message for Harmony."),
      "too-long": t("Keep your message within 2000 characters."),
      unavailable: t("Start a Type conversation before sending a message."),
      busy: t("Wait for Harmony to finish replying before sending."),
      failed: t("Your message could not be sent. End the conversation and try again."),
    };
    setError(errors[result]);
  }, [draft, sendText, t]);

  const handleStop = useCallback(async () => {
    try {
      await endSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Could not end the session cleanly"));
    }
  }, [endSession, t]);

  const handleClose = useCallback(async () => {
    connectionAttemptRef.current?.abort();
    connectionAttemptRef.current = null;
    setConnecting(false);
    if (status !== "connected" && (connecting || status === "connecting")) {
      await handleStop();
    }
    onClose();
    requestAnimationFrame(() => document.getElementById("hanz-help-trigger")?.focus());
  }, [connecting, handleStop, onClose, status]);

  useEffect(() => {
    if (!open) return;
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") void handleClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [handleClose, open]);

  useEffect(() => {
    if (!open) {
      connectionAttemptRef.current?.abort();
      connectionAttemptRef.current = null;
      setConnecting(false);
      if (status !== "connected" && (connecting || status === "connecting")) {
        void handleStop();
      }
    }
  }, [connecting, handleStop, open, status]);

  useEffect(() => () => connectionAttemptRef.current?.abort(), []);

  useEffect(() => {
    if (!live) return;
    setVolume({ volume: 1 });
  }, [live, setVolume]);

  useEffect(() => {
    const issue = voiceAudioHealthIssue({
      live,
      agentReplyCount,
      sessionKind,
      audioPacketCount,
      agentReplyAudioBaseline,
    });
    if (issue === null) {
      setAudioError(null);
      return;
    }
    if (issue === "text-only") {
      setAudioError(t("Harmony connected in text-only mode. End the conversation and try again."));
      return;
    }
    const timeout = window.setTimeout(() => {
      setAudioError(t("Harmony replied, but no voice audio reached this browser. Check your output device and try again."));
    }, 5_000);
    return () => window.clearTimeout(timeout);
  }, [
    agentReplyAudioBaseline,
    agentReplyCount,
    audioPacketCount,
    live,
    sessionKind,
    t,
  ]);

  const statusColor =
    displayError
      ? "var(--status-error-text)"
      : state === "live"
      ? "var(--status-success-text)"
      : state === "wait"
        ? "var(--text-warm)"
        : "var(--text-muted)";
  const statusLabel = displayError
    ? t("Needs attention")
    : live
      ? inputMode === "text"
        ? t(replyPending ? "Responding" : "Ready")
        : t("Listening")
      : busy
        ? t("Connecting")
        : t("Offline");

  if (!open) return null;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="hanz-hasher-title"
      className="hhv hhv-popup hh-panel flex w-full max-w-md flex-col gap-4"
      data-session-kind={sessionKind ?? "none"}
      data-input-mode={inputMode}
      data-audio-packets={audioPacketCount}
      style={{
        position: "fixed",
        zIndex: 50,
        right: "var(--space-5)",
        bottom: "var(--space-5)",
        maxHeight: "calc(100dvh - (2 * var(--space-5)))",
        overflowY: "auto",
        overscrollBehavior: "contain",
        padding: "var(--space-5)",
        background: "var(--surface-overlay)",
        border: `1px solid ${live ? "var(--border-accent)" : "var(--border-subtle)"}`,
        boxShadow: live ? "var(--glow-accent)" : "none",
        transition: "padding var(--duration-normal) var(--ease-out), border-color var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out)",
      }}
    >
      <header className="flex w-full items-center justify-between gap-3">
        <span
          id="hanz-hasher-title"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--weight-semibold)",
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {t("Harmony")}
        </span>
        <span className="flex items-center gap-2">
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
            {statusLabel}
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            className="hhv-toggle grid place-items-center rounded-md"
            aria-label={t("Close Harmony")}
            onClick={() => void handleClose()}
            style={{
              width: "2rem",
              height: "2rem",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </span>
      </header>

        <div id="hanz-hasher-details" className="flex flex-col gap-4">
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
              ? t("Ask for a progression, or have me explain the theory — keep it simple or go deep.")
              : t("Talk through a chord progression, or get the theory behind the one on your timeline.")}
          </p>

          <fieldset
            disabled={live || busy}
            className="flex flex-col gap-2"
            style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
          >
            <legend style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
              marginBottom: "var(--space-2)",
            }}>
              {t("Your input")}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(["voice", "text"] as const).map((mode) => (
                <label
                  key={mode}
                  className="hhv-mode rounded-lg text-center"
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                    color: inputMode === mode ? "var(--text-accent)" : "var(--text-muted)",
                    background: inputMode === mode ? "var(--interactive-accent-bg)" : "var(--surface-sunken)",
                    border: `1px solid ${inputMode === mode ? "var(--border-accent)" : "var(--border-subtle)"}`,
                    cursor: live || busy ? "default" : "pointer",
                  }}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="harmony-input-mode"
                    value={mode}
                    checked={inputMode === mode}
                    onChange={() => { setInputMode(mode); setError(null); }}
                  />
                  {t(mode === "voice" ? "Voice" : "Type")}
                </label>
              ))}
            </div>
          </fieldset>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-xs)", lineHeight: "var(--leading-normal)" }}>
            {live || busy
              ? t("End the conversation to change input mode. Harmony replies aloud.")
              : inputMode === "text"
                ? t("Type your messages. Harmony replies aloud. No microphone needed.")
                : t("Speak into your microphone. Harmony replies aloud.")}
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
                {entry.role === "user" ? t("You") : t("Harmony")}
              </span>
              {entry.text}
            </li>
          ))}
        </ul>
          )}

          {live && inputMode === "text" && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => { event.preventDefault(); handleSend(); }}
            >
              <label htmlFor="harmony-message" style={{ color: "var(--text-secondary)", fontSize: "var(--text-xs)" }}>
                {t("Message Harmony")}
              </label>
              <textarea
                id="harmony-message"
                className="hhv-message w-full rounded-lg"
                value={draft}
                readOnly={textPending}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={HARMONY_TEXT_MAX_LENGTH}
                rows={3}
                aria-describedby="harmony-compose-hint"
                placeholder={t("Ask for chords, changes, or theory…")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    if (canSend) handleSend();
                  }
                }}
                style={{
                  padding: "var(--space-3)",
                  minHeight: "var(--space-16)",
                  resize: "vertical",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  lineHeight: "var(--leading-normal)",
                  color: "var(--text-primary)",
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--border-default)",
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <span id="harmony-compose-hint" role="status" style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", lineHeight: "var(--leading-normal)" }}>
                  {textPending
                    ? t("Sending your message…")
                    : replyPending
                      ? t("Harmony is replying…")
                      : t("Enter to send · Shift+Enter for a new line.")}
                  <span className="block">{draft.length} / {HARMONY_TEXT_MAX_LENGTH}</span>
                </span>
                <button
                  type="submit"
                  className="hhv-btn rounded-lg"
                  disabled={!canSend}
                  style={{
                    padding: "var(--space-2) var(--space-4)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                    color: "var(--interactive-accent-text)",
                    background: "var(--interactive-accent-bg)",
                    border: "1px solid var(--interactive-accent-border)",
                    cursor: canSend ? "pointer" : "default",
                    opacity: canSend ? 1 : 0.6,
                  }}
                >
                  {t("Send")}
                </button>
              </div>
            </form>
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

          {live && playbackError && (
            <button
              type="button"
              className="hhv-btn rounded-lg"
              onClick={resumePlayback}
              style={{
                padding: "var(--space-2) var(--space-3)",
                fontSize: "var(--text-sm)",
                color: "var(--text-accent)",
                background: "var(--surface-raised)",
                border: "1px solid var(--border-accent)",
                cursor: "pointer",
              }}
            >
              {t("Enable Harmony audio")}
            </button>
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
          {t("End conversation")}
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
          {t(busy ? "Connecting…" : "Harmony, Help!")}
        </button>
          )}
        </div>

      <style>{`
        @keyframes hhv-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.14); } }
        @keyframes hhv-ring { 0% { opacity: 0.6; transform: scale(0.55); } 80%, 100% { opacity: 0; transform: scale(1.2); } }
        .hhv-orb[data-state="wait"] .hhv-orb-core { animation: hhv-breathe 1.4s var(--ease-out, ease-in-out) infinite; }
        .hhv-orb[data-state="live"] .hhv-orb-core { animation: hhv-breathe 2.4s var(--ease-out, ease-in-out) infinite; }
        .hhv-orb[data-state="live"] .hhv-orb-ring { animation: hhv-ring 2.4s var(--ease-out, ease-out) infinite; }
        .hhv-btn:focus-visible, .hhv-toggle:focus-visible, .hhv-message:focus-visible, .hhv-mode:has(input:focus-visible) { outline: 2px solid var(--interactive-focus-ring); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .hhv-orb-core, .hhv-orb-ring { animation: none !important; }
        }
        @media (max-width: 640px) {
          .hhv-popup { right: var(--space-3) !important; bottom: var(--space-3) !important; width: calc(100vw - (2 * var(--space-3))) !important; }
        }
      `}</style>
    </section>
  );
}
