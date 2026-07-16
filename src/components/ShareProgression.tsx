import { Check, Copy, Link2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createProgressionShareUrl,
  ProgressionShareError,
} from "../lib/progressionShare";
import type { Instrument } from "../lib/types";
import { useT } from "../i18n/I18nContext";

interface ShareableChord {
  input: string;
}

interface ShareProgressionProps {
  instrument: Instrument;
  chords: ReadonlyArray<ShareableChord>;
}

type ShareLinkResult =
  | { status: "ready"; link: string }
  | { status: "error"; message: string };

interface CopyState {
  link: string;
  status: "copied" | "error";
}

const PANEL_ID = "share-progression-panel";
const TITLE_ID = "share-progression-title";
const CLIPBOARD_CONFIRMATION_TIMEOUT_MS = 1_500;

function buildShareLink(instrument: Instrument, chords: ReadonlyArray<ShareableChord>): ShareLinkResult {
  try {
    const baseUrl = typeof window === "undefined"
      ? "https://harmony.tonari.ai/"
      : window.location.href;
    return {
      status: "ready",
      link: createProgressionShareUrl(baseUrl, {
        instrument,
        chordInputs: chords.map(({ input }) => input),
      }),
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ProgressionShareError
        ? error.message
        : "Harmony Hash could not create this link.",
    };
  }
}

function writeClipboardWithTimeout(link: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Clipboard write was not confirmed"));
    }, CLIPBOARD_CONFIRMATION_TIMEOUT_MS);
    navigator.clipboard.writeText(link).then(
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error("Clipboard write failed"));
      },
    );
  });
}

export default function ShareProgression({ instrument, chords }: ShareProgressionProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const copyAttemptRef = useRef(0);
  const shareLink = useMemo(() => buildShareLink(instrument, chords), [chords, instrument]);
  const shareSnapshotKey = shareLink.status === "ready" ? shareLink.link : shareLink.message;
  const currentCopyStatus = shareLink.status === "ready" && copyState?.link === shareLink.link
    ? copyState.status
    : "idle";

  function focusAndSelectLink() {
    requestAnimationFrame(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    });
  }

  function handleOpen() {
    copyAttemptRef.current += 1;
    setOpen(true);
    setCopyState(null);
    focusAndSelectLink();
  }

  const handleClose = useCallback(() => {
    copyAttemptRef.current += 1;
    setOpen(false);
    setCopyState(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => () => {
    copyAttemptRef.current += 1;
  }, []);

  useEffect(() => {
    copyAttemptRef.current += 1;
  }, [shareSnapshotKey]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleClose, open]);

  async function handleCopy() {
    if (shareLink.status !== "ready") return;
    const link = shareLink.link;
    const attempt = ++copyAttemptRef.current;
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await writeClipboardWithTimeout(link);
      if (copyAttemptRef.current !== attempt) return;
      setCopyState({ link, status: "copied" });
    } catch {
      if (copyAttemptRef.current !== attempt) return;
      setCopyState({ link, status: "error" });
      focusAndSelectLink();
    }
  }

  return (
    <div
      className="relative flex w-full flex-col sm:w-auto"
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={open ? handleClose : handleOpen}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className="hh-action w-full transition-all sm:w-auto"
        style={{
          backgroundColor: open
            ? "var(--interactive-academy-bg-hover)"
            : "var(--interactive-academy-bg)",
          color: "var(--interactive-academy-text)",
          border: "1px solid var(--interactive-academy-border)",
          fontFamily: "var(--font-body)",
          fontWeight: "var(--weight-medium)",
          transitionDuration: "var(--duration-normal)",
        }}
      >
        <Link2 size={15} aria-hidden="true" />
        {t("SHARE")}
      </button>

      {open ? (
        <section
          id={PANEL_ID}
          role="dialog"
          aria-modal="false"
          aria-labelledby={TITLE_ID}
          className="hh-panel absolute right-0 top-full z-40 mt-2 flex flex-col gap-4 text-left"
          style={{
            width: "min(30rem, calc(100vw - (2 * var(--space-4))))",
            maxHeight: "calc(100dvh - 8rem)",
            overflowY: "auto",
            padding: "var(--space-5)",
            backgroundColor: "var(--surface-overlay)",
            border: "1px solid var(--interactive-academy-border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <header className="flex items-start justify-between gap-4">
            <div>
              <h2
                id={TITLE_ID}
                className="m-0"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--weight-semibold)",
                  lineHeight: "var(--leading-tight)",
                }}
              >
                {t("Share this progression")}
              </h2>
              <p
                className="mt-2"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "var(--text-sm)",
                  lineHeight: "var(--leading-normal)",
                }}
              >
                {t("A snapshot of these chords and the selected instrument view. Hanz conversations and prompts stay private.")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label={t("Close share progression")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--interactive-focus-ring)]"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "var(--interactive-secondary-bg)",
                border: "1px solid var(--interactive-secondary-border)",
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </header>

          {shareLink.status === "ready" ? (
            <div className="flex flex-col gap-3">
              <label
                htmlFor="share-progression-link"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-semibold)",
                  letterSpacing: "var(--tracking-caps)",
                  textTransform: "uppercase",
                }}
              >
                {t("Progression link")}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  ref={linkInputRef}
                  id="share-progression-link"
                  type="url"
                  value={shareLink.link}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                  onClick={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--interactive-focus-ring)]"
                  style={{
                    color: "var(--text-primary)",
                    backgroundColor: "var(--surface-sunken)",
                    border: "1px solid var(--border-default)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                  }}
                  aria-label={t("Shareable progression link")}
                />
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--interactive-focus-ring)]"
                  style={{
                    color: "var(--interactive-primary-text)",
                    backgroundColor: "var(--interactive-primary-bg)",
                    border: "1px solid var(--interactive-primary-bg)",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-semibold)",
                  }}
                >
                  {currentCopyStatus === "copied" ? (
                    <Check size={15} aria-hidden="true" />
                  ) : (
                    <Copy size={15} aria-hidden="true" />
                  )}
                  {t(currentCopyStatus === "copied" ? "Copied" : "Copy link")}
                </button>
              </div>
              {currentCopyStatus === "copied" ? (
                <p
                  role="status"
                  aria-live="polite"
                  style={{ margin: 0, color: "var(--status-success-text)", fontSize: "var(--text-sm)" }}
                >
                  {t("Link copied.")}
                </p>
              ) : currentCopyStatus === "error" ? (
                <p
                  role="alert"
                  style={{ margin: 0, color: "var(--status-error-text)", fontSize: "var(--text-sm)" }}
                >
                  {t("Copy wasn’t confirmed. The link is selected—copy it manually.")}
                </p>
              ) : null}
            </div>
          ) : (
            <p
              role="alert"
              className="rounded-lg"
              style={{
                margin: 0,
                padding: "var(--space-3)",
                color: "var(--status-error-text)",
                backgroundColor: "var(--status-error-bg)",
                border: "1px solid var(--status-error-border)",
                fontSize: "var(--text-sm)",
              }}
            >
              {shareLink.message}
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
