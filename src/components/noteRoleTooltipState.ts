export interface NoteRoleTooltipState {
  readonly note: string;
  readonly degree: string;
  readonly role: string;
  readonly x: number;
  readonly y: number;
  readonly side: "above" | "below";
}

export function noteRoleTooltipLabel(
  note: string,
  degree: string,
  translatedRole: string,
): string {
  return `${note} · ${degree} · ${translatedRole}`;
}

export function tooltipStateForTarget(
  target: Element,
  container: HTMLElement,
): NoteRoleTooltipState | null {
  const note = target.getAttribute("data-tooltip-note");
  const degree = target.getAttribute("data-tooltip-degree");
  const role = target.getAttribute("data-tooltip-role");
  if (!note || !degree || !role) return null;

  const targetBounds = target.getBoundingClientRect();
  const containerBounds = container.getBoundingClientRect();
  const halfTooltipWidth = Math.min(76, containerBounds.width / 2);
  const rawX = targetBounds.left + targetBounds.width / 2 - containerBounds.left;
  const x = Math.max(
    halfTooltipWidth,
    Math.min(containerBounds.width - halfTooltipWidth, rawX),
  );
  const spaceAbove = targetBounds.top - containerBounds.top;
  const side = spaceAbove >= 44 ? "above" : "below";

  return {
    note,
    degree,
    role,
    x,
    y: side === "above"
      ? spaceAbove - 7
      : targetBounds.bottom - containerBounds.top + 7,
    side,
  };
}
