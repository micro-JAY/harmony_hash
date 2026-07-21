import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { OnboardingCloseReason } from "../lib/onboardingPersistence";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface OnboardingModalProps {
  brandLabel: string;
  title: string;
  description?: string;
  closeLabel: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  visual: ReactNode;
  children: ReactNode;
  onRequestClose: (reason: OnboardingCloseReason) => void;
  onSecondaryAction?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

interface BackgroundState {
  element: HTMLElement;
  inert: boolean;
  ariaHidden: string | null;
}

function setBackgroundInert(portalNode: HTMLElement): () => void {
  const states: BackgroundState[] = [];

  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement) || child === portalNode) continue;
    states.push({
      element: child,
      inert: child.inert,
      ariaHidden: child.getAttribute("aria-hidden"),
    });
    child.inert = true;
    child.setAttribute("aria-hidden", "true");
  }

  return () => {
    for (const { element, inert, ariaHidden } of states) {
      element.inert = inert;
      if (ariaHidden === null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", ariaHidden);
    }
  };
}

export default function OnboardingModal({
  brandLabel,
  title,
  description,
  closeLabel,
  primaryActionLabel,
  secondaryActionLabel,
  visual,
  children,
  onRequestClose,
  onSecondaryAction,
  returnFocusRef,
}: OnboardingModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const reduceMotion = Boolean(useReducedMotion());
  const dialogRef = useRef<HTMLElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const onRequestCloseRef = useRef(onRequestClose);
  const [portalNode] = useState(() => {
    if (typeof document === "undefined") return null;
    const node = document.createElement("div");
    node.dataset.onboardingPortal = "true";
    return node;
  });

  useEffect(() => {
    onRequestCloseRef.current = onRequestClose;
  }, [onRequestClose]);

  useEffect(() => {
    if (!portalNode) return;

    document.body.append(portalNode);
    const restoreBackground = setBackgroundInert(portalNode);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      restoreBackground();
      document.body.style.overflow = previousOverflow;
      portalNode.remove();
    };
  }, [portalNode]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const returnFocusTarget = returnFocusRef?.current ?? previouslyFocused;
    const focusFrame = requestAnimationFrame(() => {
      (primaryActionRef.current ?? dialog)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onRequestCloseRef.current("escape");
        return;
      }

      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      requestAnimationFrame(() => {
        if (returnFocusTarget?.isConnected) returnFocusTarget.focus();
      });
    };
  }, [returnFocusRef]);

  const modal = (
    <div
      data-onboarding-backdrop="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100vw",
        padding: "var(--space-4)",
        overflow: "hidden",
        backgroundColor: "color-mix(in srgb, var(--surface-base) 82%, transparent)",
        backdropFilter: "blur(var(--space-1))",
      }}
    >
      <motion.section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-reduced-motion={reduceMotion ? "true" : "false"}
        className="hh-panel hh-onboarding-shell"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
        style={{
          maxHeight: "calc(100dvh - (2 * var(--space-4)))",
        }}
      >
        <button
          type="button"
          onClick={() => onRequestClose("close-button")}
          aria-label={closeLabel}
          className="hh-onboarding-close"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div
          data-onboarding-scroll-region="true"
          className="hh-onboarding-scroll-region"
        >
          <div className="hh-onboarding-hero">
            <div data-onboarding-visual="true" className="hh-onboarding-visual">{visual}</div>
            <header className="hh-onboarding-copy">
              <p className="hh-onboarding-brand">{brandLabel}</p>
              <h1 id={titleId} className="hh-onboarding-title">{title}</h1>
              {description ? (
                <p id={descriptionId} className="hh-onboarding-description">
                  {description}
                </p>
              ) : null}
              <div className="hh-onboarding-actions">
                <button
                  ref={primaryActionRef}
                  type="button"
                  onClick={() => onRequestClose("primary-action")}
                  className="hh-action hh-onboarding-primary"
                >
                  {primaryActionLabel}
                </button>
                {secondaryActionLabel && onSecondaryAction ? (
                  <button
                    type="button"
                    onClick={onSecondaryAction}
                    className="hh-action hh-onboarding-secondary"
                  >
                    {secondaryActionLabel}
                  </button>
                ) : null}
              </div>
            </header>
          </div>
          <div className="hh-onboarding-destinations">{children}</div>
        </div>
      </motion.section>
    </div>
  );

  return portalNode ? createPortal(modal, portalNode) : modal;
}
