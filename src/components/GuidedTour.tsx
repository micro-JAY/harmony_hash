import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import {
  calculateTourLayout,
  SPOTLIGHT_PADDING,
  VIEWPORT_GUTTER,
  type TourLayout,
  type TourRect,
} from "./guidedTourLayout";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface GuidedTourStep {
  id: string;
  targetSelector: string;
  title: string;
  body: string;
}

export interface GuidedTourLabels {
  tour: string;
  close: string;
  previous: string;
  next: string;
  finish: string;
  step: (current: number, total: number) => string;
}

export type GuidedTourCloseReason = "close-button" | "escape" | "finish";

interface GuidedTourProps {
  open: boolean;
  steps: readonly GuidedTourStep[];
  labels: GuidedTourLabels;
  onBeforeStep?: (step: GuidedTourStep, index: number) => void | Promise<void>;
  onRequestClose: (reason: GuidedTourCloseReason) => void;
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

function toTourRect(rect: DOMRect): TourRect {
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

export default function GuidedTour({
  open,
  steps,
  labels,
  onBeforeStep,
  onRequestClose,
  returnFocusRef,
}: GuidedTourProps) {
  const titleId = useId();
  const bodyId = useId();
  const reduceMotion = Boolean(useReducedMotion());
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onBeforeStepRef = useRef(onBeforeStep);
  const onRequestCloseRef = useRef(onRequestClose);
  const currentIndexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TourRect | null>(null);
  const [layout, setLayout] = useState<TourLayout>({
    tooltipTop: VIEWPORT_GUTTER,
    tooltipLeft: VIEWPORT_GUTTER,
    placement: "center",
  });
  const [portalNode] = useState(() => {
    if (typeof document === "undefined") return null;
    const node = document.createElement("div");
    node.dataset.guidedTourPortal = "true";
    return node;
  });

  const safeIndex = Math.min(currentIndex, Math.max(steps.length - 1, 0));
  const currentStep = steps[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === steps.length - 1;

  useEffect(() => {
    currentIndexRef.current = safeIndex;
  }, [safeIndex]);

  useEffect(() => {
    onBeforeStepRef.current = onBeforeStep;
  }, [onBeforeStep]);

  useEffect(() => {
    onRequestCloseRef.current = onRequestClose;
  }, [onRequestClose]);

  useEffect(() => {
    if (!open || !portalNode) return;
    document.body.append(portalNode);
    const restoreBackground = setBackgroundInert(portalNode);

    return () => {
      restoreBackground();
      portalNode.remove();
    };
  }, [open, portalNode]);

  useEffect(() => {
    if (!open || !currentStep) return;
    let cancelled = false;
    let frame = 0;
    let observedTarget: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;

    function measureTarget() {
      if (cancelled) return;
      const nextTarget = document.querySelector<HTMLElement>(currentStep.targetSelector);
      if (nextTarget !== observedTarget) {
        resizeObserver?.disconnect();
        observedTarget = nextTarget;
        if (nextTarget && typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(measureTarget);
          resizeObserver.observe(nextTarget);
        }
      }
      setTargetRect(nextTarget ? toTourRect(nextTarget.getBoundingClientRect()) : null);
    }

    async function enterStep() {
      try {
        await onBeforeStepRef.current?.(currentStep, safeIndex);
      } catch (error) {
        console.error(
          "[harmony-hash-tour] Could not prepare guided tour step",
          error instanceof Error ? error.message : "Unknown error",
        );
        if (!cancelled) setTargetRect(null);
        return;
      }
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        const nextTarget = document.querySelector<HTMLElement>(currentStep.targetSelector);
        nextTarget?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "center",
          inline: "center",
        });
        measureTarget();
      });
    }

    void enterStep();
    const mutationObserver = new MutationObserver(measureTarget);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [currentStep, open, reduceMotion, safeIndex]);

  useEffect(() => {
    if (!open) return;

    function updateLayout() {
      const tooltipBox = dialogRef.current?.getBoundingClientRect();
      const width = Math.min(tooltipBox?.width ?? 360, window.innerWidth - (2 * VIEWPORT_GUTTER));
      const height = Math.min(tooltipBox?.height ?? 240, window.innerHeight - (2 * VIEWPORT_GUTTER));
      setLayout(calculateTourLayout(
        targetRect,
        { width: window.innerWidth, height: window.innerHeight },
        { width, height },
      ));
    }

    const frame = requestAnimationFrame(updateLayout);
    window.addEventListener("resize", updateLayout);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateLayout);
    };
  }, [open, safeIndex, targetRect]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const returnFocusTarget = returnFocusRef?.current ?? previouslyFocused;
    const focusFrame = requestAnimationFrame(() => (closeRef.current ?? dialog)?.focus());

    function movePrevious() {
      if (currentIndexRef.current === 0) return;
      setTargetRect(null);
      setCurrentIndex((index) => Math.max(0, index - 1));
    }

    function moveNext() {
      if (currentIndexRef.current >= steps.length - 1) return;
      setTargetRect(null);
      setCurrentIndex((index) => Math.min(steps.length - 1, index + 1));
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setCurrentIndex(0);
        onRequestCloseRef.current("escape");
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        movePrevious();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveNext();
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
  }, [open, returnFocusRef, steps.length]);

  if (!open || !currentStep || steps.length === 0) return null;

  const spotlightStyle = targetRect
    ? ({
        "--tour-spotlight-top": `${Math.max(0, targetRect.top - SPOTLIGHT_PADDING)}px`,
        "--tour-spotlight-left": `${Math.max(0, targetRect.left - SPOTLIGHT_PADDING)}px`,
        "--tour-spotlight-width": `${targetRect.width + (2 * SPOTLIGHT_PADDING)}px`,
        "--tour-spotlight-height": `${targetRect.height + (2 * SPOTLIGHT_PADDING)}px`,
      } as CSSProperties)
    : undefined;
  const tooltipStyle = {
    "--tour-tooltip-top": `${layout.tooltipTop}px`,
    "--tour-tooltip-left": `${layout.tooltipLeft}px`,
  } as CSSProperties;

  const tour = (
    <div
      className="hh-guided-tour"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      data-target-missing={targetRect ? "false" : "true"}
    >
      <div className="hh-guided-tour__backdrop" aria-hidden="true" />
      {targetRect ? (
        <div className="hh-guided-tour__spotlight" style={spotlightStyle} aria-hidden="true" />
      ) : null}

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="hh-guided-tour__tooltip"
        data-placement={layout.placement}
        style={tooltipStyle}
      >
        <button
          type="button"
          className="hh-guided-tour__screen-arrow hh-guided-tour__screen-arrow--previous"
          aria-label={labels.previous}
          disabled={isFirst}
          onClick={() => {
            setTargetRect(null);
            setCurrentIndex((index) => Math.max(0, index - 1));
          }}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          className="hh-guided-tour__screen-arrow hh-guided-tour__screen-arrow--next"
          aria-label={labels.next}
          disabled={isLast}
          onClick={() => {
            setTargetRect(null);
            setCurrentIndex((index) => Math.min(steps.length - 1, index + 1));
          }}
        >
          <ChevronRight aria-hidden="true" />
        </button>

        <header className="hh-guided-tour__header">
          <p className="hh-guided-tour__progress">
            {labels.tour} · {labels.step(safeIndex + 1, steps.length)}
          </p>
          <button
            ref={closeRef}
            type="button"
            className="hh-guided-tour__close"
            aria-label={labels.close}
            onClick={() => {
              setCurrentIndex(0);
              onRequestClose("close-button");
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div aria-live="polite">
          <h2 id={titleId} className="hh-guided-tour__title">{currentStep.title}</h2>
          <p id={bodyId} className="hh-guided-tour__body">{currentStep.body}</p>
        </div>
        <footer className="hh-guided-tour__actions">
          <button
            type="button"
            className="hh-action hh-guided-tour__secondary"
            disabled={isFirst}
            onClick={() => {
              setTargetRect(null);
              setCurrentIndex((index) => Math.max(0, index - 1));
            }}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            {labels.previous}
          </button>
          {isLast ? (
            <button
              type="button"
              className="hh-action hh-guided-tour__primary"
              onClick={() => {
                setCurrentIndex(0);
                onRequestClose("finish");
              }}
            >
              {labels.finish}
            </button>
          ) : (
            <button
              type="button"
              className="hh-action hh-guided-tour__primary"
              onClick={() => {
                setTargetRect(null);
                setCurrentIndex((index) => Math.min(steps.length - 1, index + 1));
              }}
            >
              {labels.next}
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}
        </footer>
      </section>
    </div>
  );

  return portalNode ? createPortal(tour, portalNode) : tour;
}
