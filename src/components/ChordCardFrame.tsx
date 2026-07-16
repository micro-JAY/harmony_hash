import type { ReactNode } from "react";
import { AudioLines, Lock, Unlock } from "lucide-react";
import { useLocale, useT } from "../i18n/I18nContext";
import {
  chordFamilyPresentation,
  type ChordFamily,
} from "../lib/visual/chordFamily";

interface ChordCardFrameProps {
  displayName: string;
  titleFamily: ChordFamily;
  usageNotes?: string;
  isLocked: boolean;
  onToggleLock: () => void;
  isPlaying: boolean;
  isAgentHighlighted: boolean;
  children: ReactNode;
}

export default function ChordCardFrame({
  displayName,
  titleFamily,
  usageNotes,
  isLocked,
  onToggleLock,
  isPlaying,
  isAgentHighlighted,
  children,
}: ChordCardFrameProps) {
  const t = useT();
  const { locale } = useLocale();
  const localizedUsageNotes = usageNotes
    ?.split(",")
    .map((note) => t(note.trim()))
    .join(locale === "ja" ? "、" : ", ");
  const titlePresentation = chordFamilyPresentation(titleFamily);
  return (
    <div
      data-testid="chord-card"
      className="hh-chord-card relative flex h-full w-full min-w-0 max-w-full flex-col items-center overflow-hidden rounded-xl"
      data-playing={isPlaying ? "true" : undefined}
      data-agent-highlighted={isAgentHighlighted ? "true" : undefined}
      style={{
        backgroundColor: "var(--surface-raised)",
        border: `1px solid ${
          isPlaying
            ? "var(--border-accent)"
            : isAgentHighlighted
              ? "var(--status-academy-border)"
              : "var(--border-subtle)"
        }`,
        transition: `border-color var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out)`,
        boxShadow: isPlaying
          ? isAgentHighlighted
            ? "var(--glow-accent), inset 3px 0 0 var(--status-academy-text)"
            : "var(--glow-accent)"
          : isAgentHighlighted
            ? "var(--glow-academy), inset 3px 0 0 var(--status-academy-text)"
            : "none",
      }}
    >
      <button
        type="button"
        aria-label={t(isLocked ? "Unlock chord card" : "Lock chord card")}
        title={t(isLocked ? "Unlock" : "Lock")}
        onClick={onToggleLock}
        className="absolute top-2 right-2 rounded-md p-1 transition-colors"
        style={{
          backgroundColor: "var(--surface-highlight)",
          border: `1px solid ${isLocked ? "var(--border-accent)" : "var(--border-subtle)"}`,
          color: isLocked ? "var(--text-accent)" : "var(--text-muted)",
          zIndex: 2,
        }}
      >
        {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
      </button>

      <div
        className="w-full text-center py-3 px-4"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <h3
          data-chord-family={titlePresentation.family}
          className="inline-flex rounded-md px-2 py-0.5 text-lg font-semibold"
          style={{
            fontFamily: "var(--font-display)",
            color: titlePresentation.color,
            backgroundColor: titlePresentation.backgroundColor,
            border: `1px solid ${titlePresentation.borderColor}`,
            fontWeight: "var(--weight-semibold)",
          }}
        >
          {displayName}
        </h3>
        {isAgentHighlighted && (
          <span
            role="status"
            aria-label={t(`Hanz is focusing on ${displayName}`)}
            className="mx-auto mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{
              backgroundColor: "var(--status-academy-bg)",
              border: "1px solid var(--status-academy-border)",
              color: "var(--status-academy-text)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-semibold)",
              letterSpacing: "var(--tracking-wider)",
              textTransform: "uppercase",
            }}
          >
            <AudioLines size={12} aria-hidden="true" />
            {t("Hanz focus")}
          </span>
        )}
        {localizedUsageNotes && (
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
          >
            {localizedUsageNotes}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}
