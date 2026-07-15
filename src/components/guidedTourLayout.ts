export const SPOTLIGHT_PADDING = 8;
const TOOLTIP_GAP = 16;
export const VIEWPORT_GUTTER = 12;

export interface TourRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface TourLayout {
  tooltipTop: number;
  tooltipLeft: number;
  placement: "top" | "bottom" | "center";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function calculateTourLayout(
  target: TourRect | null,
  viewport: { width: number; height: number },
  tooltip: { width: number; height: number },
): TourLayout {
  const tooltipLeftLimit = viewport.width - tooltip.width - VIEWPORT_GUTTER;

  if (!target) {
    return {
      tooltipTop: clamp(
        (viewport.height - tooltip.height) / 2,
        VIEWPORT_GUTTER,
        viewport.height - tooltip.height - VIEWPORT_GUTTER,
      ),
      tooltipLeft: clamp((viewport.width - tooltip.width) / 2, VIEWPORT_GUTTER, tooltipLeftLimit),
      placement: "center",
    };
  }

  const roomAbove = target.top - TOOLTIP_GAP - VIEWPORT_GUTTER;
  const roomBelow = viewport.height - target.bottom - TOOLTIP_GAP - VIEWPORT_GUTTER;
  const placement = roomBelow >= tooltip.height || roomBelow >= roomAbove ? "bottom" : "top";
  const preferredTop = placement === "bottom"
    ? target.bottom + TOOLTIP_GAP
    : target.top - tooltip.height - TOOLTIP_GAP;

  return {
    tooltipTop: clamp(
      preferredTop,
      VIEWPORT_GUTTER,
      viewport.height - tooltip.height - VIEWPORT_GUTTER,
    ),
    tooltipLeft: clamp(
      target.left + (target.width - tooltip.width) / 2,
      VIEWPORT_GUTTER,
      tooltipLeftLimit,
    ),
    placement,
  };
}
