import { useCallback, useState } from "react";
import { useConversationControls, useConversationStatus } from "@elevenlabs/react";
import { useVoiceAgent } from "./VoiceAgentProvider";
import { useProgressionAgentTools } from "./useProgressionAgentTools";

/**
 * The voice companion panel. Render it inside <VoiceAgentProvider/> wherever
 * the progression builder lives (e.g. beside the timeline / sound panel).
 *
 * Connecting flow: if a signed-URL endpoint is configured, fetch a short-lived
 * URL and open the session with it; otherwise connect with the bare agent id
 * (public dev agent only).
 *
 * NOTE: styling is applied via inline CSS variables in Stage 6 (Tonari design
 * system). The class names below are structural hooks only — there is no
 * per-component stylesheet (the repo styles with inline `style={{}}`).
 */
export function VoiceAgentPanel() {
  const { bridge, agentId, signedUrlEndpoint, transcript } = useVoiceAgent();
  const { startSession, endSession } = useConversationControls();
  const { status } = useConversationStatus();

  // Register the progression-builder tools for the lifetime of this panel.
  useProgressionAgentTools(bridge);

  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const live = status === "connected";
  const state: "live" | "wait" | "idle" = live ? "live" : connecting ? "wait" : "idle";

  const handleStart = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      if (signedUrlEndpoint) {
        const res = await fetch(signedUrlEndpoint, { method: "POST" });
        if (!res.ok) throw new Error(`Auth endpoint returned ${res.status}`);
        const data = (await res.json()) as { signedUrl?: string; error?: string };
        if (!data.signedUrl) {
          throw new Error(data.error ?? "Auth endpoint did not return a signedUrl");
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

  return (
    <section
      className={`hh-voice${live ? " is-live" : ""}`}
      aria-label="Harmony companion voice agent"
    >
      <header className="hh-voice__head">
        <span className="hh-voice__label">Harmony Companion</span>
        <span className={`hh-voice__status hh-voice__status--${state}`}>
          {live ? "Listening" : connecting ? "Connecting" : "Offline"}
        </span>
      </header>

      <div className="hh-voice__orb" data-state={state} aria-hidden="true">
        <span className="hh-voice__orb-core" />
        <span className="hh-voice__orb-ring" />
        <span className="hh-voice__orb-ring hh-voice__orb-ring--delayed" />
      </div>

      <p className="hh-voice__hint">
        {live
          ? "Ask for a progression, or have me explain the theory — keep it simple or go deep."
          : "Talk through a chord progression, or get the theory behind the one on your timeline."}
      </p>

      {transcript.length > 0 && (
        <ul className="hh-voice__log">
          {transcript.slice(-6).map((entry) => (
            <li key={entry.id} className={`hh-voice__line hh-voice__line--${entry.role}`}>
              <span className="hh-voice__who">
                {entry.role === "user" ? "You" : "Companion"}
              </span>
              {entry.text}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="hh-voice__error" role="alert">
          {error}
        </p>
      )}

      <div className="hh-voice__actions">
        {live ? (
          <button
            type="button"
            className="hh-voice__btn hh-voice__btn--stop"
            onClick={handleStop}
          >
            End conversation
          </button>
        ) : (
          <button
            type="button"
            className="hh-voice__btn hh-voice__btn--start"
            onClick={handleStart}
            disabled={connecting}
          >
            {connecting ? "Connecting…" : "Talk to the companion"}
          </button>
        )}
      </div>
    </section>
  );
}
