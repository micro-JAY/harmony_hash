import { useT } from "../i18n/I18nContext";
import type { NoteRoleTooltipState } from "./noteRoleTooltipState";

interface NoteRoleTooltipProps {
  tooltip: NoteRoleTooltipState | null;
}

export default function NoteRoleTooltip({ tooltip }: NoteRoleTooltipProps) {
  const t = useT();
  if (!tooltip) return null;

  return (
    <div
      role="tooltip"
      data-testid="note-role-tooltip"
      className="hh-note-role-tooltip"
      style={{
        left: tooltip.x,
        top: tooltip.y,
        transform: tooltip.side === "above"
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)",
      }}
    >
      <strong>{tooltip.note}</strong>
      <span aria-hidden="true">·</span>
      <span style={{ fontFamily: "var(--font-mono)" }}>{tooltip.degree}</span>
      <span aria-hidden="true">·</span>
      <span>{t(tooltip.role)}</span>
    </div>
  );
}
