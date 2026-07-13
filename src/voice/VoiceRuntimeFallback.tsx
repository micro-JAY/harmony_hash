import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface VoiceRuntimeFallbackProps {
  failed: boolean;
  onClose: () => void;
  onReload: () => void;
}

/** Lightweight shell shown while the optional ElevenLabs chunk loads. */
export default function VoiceRuntimeFallback({
  failed,
  onClose,
  onReload,
}: VoiceRuntimeFallbackProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const focusFrame = requestAnimationFrame(() => closeRef.current?.focus());
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onClose();
      requestAnimationFrame(() => document.getElementById("hanz-help-trigger")?.focus());
    }
    window.addEventListener("keydown", handleEscape);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  function handleClose() {
    onClose();
    requestAnimationFrame(() => document.getElementById("hanz-help-trigger")?.focus());
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label="Hanz Hasher"
      className="hhv-popup flex w-full max-w-md flex-col gap-4 rounded-xl"
      style={{
        position: "fixed",
        zIndex: 50,
        right: "var(--space-5)",
        bottom: "var(--space-5)",
        width: "min(28rem, calc(100vw - (2 * var(--space-5))))",
        maxHeight: "calc(100dvh - (2 * var(--space-5)))",
        overflowY: "auto",
        overscrollBehavior: "contain",
        padding: "var(--space-5)",
        background: "var(--surface-overlay)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <header className="flex items-center justify-between gap-3">
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
          Hanz Hasher
        </span>
        <button
          ref={closeRef}
          type="button"
          aria-label="Close Hanz Hasher"
          onClick={handleClose}
          className="grid place-items-center rounded-md"
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
      </header>

      <p
        role={failed ? "alert" : "status"}
        aria-live="polite"
        style={{
          margin: 0,
          fontSize: "var(--text-sm)",
          color: failed ? "var(--status-error-text)" : "var(--text-muted)",
        }}
      >
        {failed
          ? "Voice tools couldn’t load. Reload Harmony Hash to try again."
          : "Loading voice tools…"}
      </p>

      {failed ? (
        <button
          type="button"
          onClick={onReload}
          className="rounded-lg px-4 py-2"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: "var(--weight-semibold)",
            color: "var(--interactive-accent-text)",
            background: "var(--interactive-accent-bg)",
            border: "1px solid var(--interactive-accent-border)",
            cursor: "pointer",
          }}
        >
          Reload Harmony Hash
        </button>
      ) : null}
    </section>
  );
}
