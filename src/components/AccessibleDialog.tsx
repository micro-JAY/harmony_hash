import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { dialogFocusTrapTargetIndex } from "./accessibleDialogFocus";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export type DialogCloseReason = "backdrop" | "close-button" | "escape";

export interface AccessibleDialogProps {
  title: ReactNode;
  closeLabel: string;
  onRequestClose: (reason: DialogCloseReason) => void;
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  maxWidth?: string;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
}

interface BackgroundState {
  element: HTMLElement;
  inert: boolean;
  ariaHidden: string | null;
}

function makeBackgroundInert(portalNode: HTMLElement): () => void {
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

/**
 * Shared modal foundation for focused tool workflows. The component owns the
 * portal, focus boundary, background isolation, and viewport-safe shell while
 * callers supply only feature content and labels.
 */
export default function AccessibleDialog({
  title,
  closeLabel,
  onRequestClose,
  children,
  description,
  footer,
  initialFocusRef,
  returnFocusRef,
  maxWidth = "42rem",
  className = "",
  contentClassName = "",
  style,
}: AccessibleDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const reduceMotion = Boolean(useReducedMotion());
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onRequestCloseRef = useRef(onRequestClose);
  const [portalNode] = useState(() => {
    if (typeof document === "undefined") return null;
    const node = document.createElement("div");
    node.dataset.dialogPortal = "true";
    return node;
  });

  useEffect(() => {
    onRequestCloseRef.current = onRequestClose;
  }, [onRequestClose]);

  useEffect(() => {
    if (!portalNode) return;

    document.body.append(portalNode);
    const restoreBackground = makeBackgroundInert(portalNode);
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
      (initialFocusRef?.current ?? closeButtonRef.current ?? dialog)?.focus();
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

      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const forcedIndex = dialogFocusTrapTargetIndex(
        focusable.length,
        activeIndex,
        event.shiftKey,
      );
      if (forcedIndex !== null) {
        event.preventDefault();
        focusable[forcedIndex].focus();
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
  }, [initialFocusRef, returnFocusRef]);

  const dialog = (
    <div
      data-dialog-backdrop="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onRequestClose("backdrop");
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)",
        display: "grid",
        placeItems: "center",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100vw",
        minHeight: "100dvh",
        padding: "clamp(var(--space-2), 3vw, var(--space-6))",
        overflow: "auto",
        overscrollBehavior: "contain",
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
        data-dialog-shell="true"
        data-reduced-motion={reduceMotion ? "true" : "false"}
        className={`hh-panel ${className}`.trim()}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "min(100%, var(--dialog-max-width))",
          maxWidth: "calc(100vw - (2 * var(--space-2)))",
          maxHeight: "calc(100dvh - (2 * var(--space-2)))",
          overflow: "hidden",
          backgroundColor: "var(--surface-raised)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          "--dialog-max-width": maxWidth,
          ...style,
        } as CSSProperties}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header
          style={{
            flexShrink: 0,
            padding: "var(--space-5) calc(var(--control-min-height) + var(--space-5)) var(--space-4) var(--space-5)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <h2
            id={titleId}
            style={{
              color: "var(--text-primary)",
              fontSize: "var(--text-xl)",
              fontWeight: "var(--weight-bold)",
            }}
          >
            {title}
          </h2>
          {description ? (
            <div
              id={descriptionId}
              style={{
                marginTop: "var(--space-2)",
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                lineHeight: "var(--leading-normal)",
              }}
            >
              {description}
            </div>
          ) : null}
        </header>

        <button
          ref={closeButtonRef}
          type="button"
          aria-label={closeLabel}
          onClick={() => onRequestClose("close-button")}
          style={{
            position: "absolute",
            top: "var(--space-3)",
            right: "var(--space-3)",
            zIndex: 1,
            display: "grid",
            placeItems: "center",
            width: "var(--control-min-height)",
            height: "var(--control-min-height)",
            padding: 0,
            color: "var(--text-secondary)",
            backgroundColor: "var(--surface-overlay)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div
          data-dialog-scroll-region="true"
          className={contentClassName}
          style={{
            minHeight: 0,
            padding: "var(--space-5)",
            overflowY: "auto",
            overscrollBehavior: "contain",
          }}
        >
          {children}
        </div>

        {footer ? (
          <footer
            style={{
              flexShrink: 0,
              padding: "var(--space-4) var(--space-5)",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            {footer}
          </footer>
        ) : null}
      </motion.section>
    </div>
  );

  return portalNode ? createPortal(dialog, portalNode) : dialog;
}
