import { AnimatePresence } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type {
  IndexedChord,
  ParseResult,
  Progression,
  ScaleType,
  TonalityId,
} from "../lib/types";
import { ALL_KEYS, transposeNumeralString } from "../lib/harmonyBrain";
import { lookupChord } from "../lib/chordData";
import type { HarmonyContext } from "../lib/theory";
import {
  transactTimeline,
  type TimelineDraftItem,
  type TimelineItem,
} from "../lib/timelineTransactions";
import { PROGRESSION_LIBRARY } from "../data/progressions";
import { useT } from "../i18n/I18nContext";
import ChordReferenceGrid from "./ChordReferenceGrid";
import MinorBlendModal from "./MinorBlendModal";
import ProgressionAgent from "./ProgressionAgent";
import ProgressionTimelineComposer from "./ProgressionTimelineComposer";

interface DisplayChord {
  input: string;
  chord: IndexedChord;
}

interface ProgressionInputProps {
  onResult: (chords: DisplayChord[], errors: ParseResult["errors"]) => void;
  onApplyTimelineDraft: (
    draft: readonly TimelineDraftItem<string>[],
  ) => readonly TimelineItem<DisplayChord>[];
  onContextChange: (context: HarmonyContext) => void;
  timeline: readonly TimelineItem<DisplayChord>[];
  timelineVersion: number;
  timelineVersionRef: MutableRefObject<number>;
  onRequestVoice: () => void;
  onVoiceIntent: () => void;
  contextLaunch?: {
    readonly key: string;
    readonly scaleType?: ScaleType;
    readonly notice?: string;
    readonly version: number;
  };
}

interface SelectedProgression {
  tonalityId: TonalityId;
  subgroupIdx: number;
  progressionIdx: number;
  progression: Progression;
  scaleType: ScaleType;
}

interface ComposerDraftState {
  baseTimelineVersion: number;
  items: TimelineDraftItem<string>[];
  rawText: string;
  dirty: boolean;
}

const FREE_MODE_OPTIONS: ReadonlyArray<{ value: ScaleType; label: string }> = [
  { value: "major", label: "Major" },
  { value: "natural_minor", label: "Natural Minor" },
  { value: "harmonic_minor", label: "Harmonic Minor" },
  { value: "dorian", label: "Dorian" },
  { value: "mixolydian", label: "Mixolydian" },
  { value: "lydian", label: "Lydian" },
  { value: "phrygian", label: "Phrygian" },
];

function draftItemsFromTimeline(
  timeline: readonly TimelineItem<DisplayChord>[],
): TimelineDraftItem<string>[] {
  return timeline.map((item) => ({ id: item.id, value: item.value.input }));
}

function itemsToText(items: readonly TimelineDraftItem<string>[]): string {
  return items.map((item) => item.value).join(" ");
}

function draftItemsFromText(
  rawText: string,
  currentItems: readonly TimelineDraftItem<string>[],
): TimelineDraftItem<string>[] {
  const availableBySymbol = new Map<string, TimelineDraftItem<string>[]>();
  for (const item of currentItems) {
    const queue = availableBySymbol.get(item.value) ?? [];
    queue.push(item);
    availableBySymbol.set(item.value, queue);
  }

  return rawText
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((value) => {
      const existing = availableBySymbol.get(value)?.shift();
      return existing ?? { id: null, value };
    });
}

export default function ProgressionInput({
  onResult,
  onApplyTimelineDraft,
  onContextChange,
  timeline,
  timelineVersion,
  timelineVersionRef,
  onRequestVoice,
  onVoiceIntent,
  contextLaunch,
}: ProgressionInputProps) {
  const t = useT();
  const committedItems = draftItemsFromTimeline(timeline);
  const [composerDraft, setComposerDraft] = useState<ComposerDraftState>(() => ({
    baseTimelineVersion: timelineVersion,
    items: committedItems,
    rawText: itemsToText(committedItems),
    dirty: false,
  }));
  const [freeKey, setFreeKey] = useState("C");
  const [freeScaleType, setFreeScaleType] = useState<ScaleType>("major");
  const [selected, setSelected] = useState<SelectedProgression | null>(null);
  const [selectedKey, setSelectedKey] = useState("C");
  const [errors, setErrors] = useState<ParseResult["errors"]>([]);
  const [activeTab, setActiveTab] = useState<"free" | "preset">("free");
  const [activeTonality, setActiveTonality] = useState<TonalityId>("major");
  const [minorHelpOpen, setMinorHelpOpen] = useState(false);
  const [insertionBoundary, setInsertionBoundary] = useState(committedItems.length);
  const cancellationVersionRef = useRef(0);
  const [agentCancellationVersion, setAgentCancellationVersion] = useState(0);
  const [contextLaunchNotice, setContextLaunchNotice] = useState<string | null>(null);
  const [appliedContextLaunchVersion, setAppliedContextLaunchVersion] = useState<number | null>(null);

  if (contextLaunch && contextLaunch.version !== appliedContextLaunchVersion) {
    setAppliedContextLaunchVersion(contextLaunch.version);
    setActiveTab("free");
    setFreeKey(contextLaunch.key);
    if (contextLaunch.scaleType) setFreeScaleType(contextLaunch.scaleType);
    setContextLaunchNotice(contextLaunch.notice ?? null);
  }

  useEffect(() => {
    if (!contextLaunch || contextLaunch.version !== appliedContextLaunchVersion) return;
    requestAnimationFrame(() => {
      document.getElementById("hasher-free-key")?.focus();
    });
  }, [appliedContextLaunchVersion, contextLaunch]);

  const composerWasRebased = composerDraft.baseTimelineVersion !== timelineVersion;
  const composedItems = composerWasRebased ? committedItems : composerDraft.items;
  const composedText = composerWasRebased
    ? itemsToText(committedItems)
    : composerDraft.rawText;
  const composerIsDirty = composerWasRebased ? false : composerDraft.dirty;
  const canRunComposer = composedItems.length > 0 || composerIsDirty;
  const selectedInsertionBoundary = Math.min(insertionBoundary, composedItems.length);
  const composedChordNames = composedItems.map((item) => item.value);
  const activeGroup = PROGRESSION_LIBRARY.find((group) => group.id === activeTonality)!;
  const presetScaleType = selected?.scaleType ?? activeGroup.scaleType;
  const activeKey = activeTab === "free" ? freeKey : selectedKey;
  const activeScaleType = activeTab === "free" ? freeScaleType : presetScaleType;

  useEffect(() => {
    onContextChange({ key: activeKey, scaleType: activeScaleType });
  }, [activeKey, activeScaleType, onContextChange]);

  function cancelPendingAgentForTimelineEdit() {
    const nextVersion = cancellationVersionRef.current + 1;
    cancellationVersionRef.current = nextVersion;
    setAgentCancellationVersion(nextVersion);
  }

  function effectiveDraft(): ComposerDraftState {
    if (!composerWasRebased) return composerDraft;
    return {
      baseTimelineVersion: timelineVersion,
      items: committedItems,
      rawText: itemsToText(committedItems),
      dirty: false,
    };
  }

  function stageComposerItems(
    items: TimelineDraftItem<string>[],
    rawText = itemsToText(items),
  ) {
    cancelPendingAgentForTimelineEdit();
    setComposerDraft({
      baseTimelineVersion: timelineVersion,
      items,
      rawText,
      dirty: true,
    });
  }

  function acceptAppliedTimeline(applied: readonly TimelineItem<DisplayChord>[]) {
    const appliedItems = draftItemsFromTimeline(applied);
    setComposerDraft({
      baseTimelineVersion: timelineVersionRef.current,
      items: appliedItems,
      rawText: itemsToText(appliedItems),
      dirty: false,
    });
  }

  function insertComposedChord(chordName: string, boundary: number) {
    if (!lookupChord(chordName)) return;
    const current = effectiveDraft();
    const safeBoundary = Math.min(Math.max(boundary, 0), current.items.length);
    const nextItems = [...current.items];
    nextItems.splice(safeBoundary, 0, { id: null, value: chordName });
    stageComposerItems(nextItems);
    setInsertionBoundary(safeBoundary + 1);
  }

  function handleComposerMove(from: number, to: number) {
    const current = effectiveDraft();
    const transaction = transactTimeline(current.items, { type: "move", from, to });
    if (!transaction.changed) return;
    const nextItems = [...transaction.items];
    if (!composerIsDirty && nextItems.every((item) => item.id !== null)) {
      cancelPendingAgentForTimelineEdit();
      acceptAppliedTimeline(onApplyTimelineDraft(nextItems));
      return;
    }
    stageComposerItems(nextItems);
  }

  function handleComposerTextChange(rawText: string) {
    const current = effectiveDraft();
    stageComposerItems(draftItemsFromText(rawText, current.items), rawText);
  }

  function handleComposerSubmit() {
    if (composedItems.length === 0) {
      if (!composerIsDirty) return;
      setErrors([]);
      cancelPendingAgentForTimelineEdit();
      acceptAppliedTimeline(onApplyTimelineDraft([]));
      return;
    }
    const nextErrors: ParseResult["errors"] = [];
    composedItems.forEach((item, index) => {
      if (!lookupChord(item.value)) {
        nextErrors.push({
          index,
          input: item.value,
          message: `Could not resolve: "${item.value}"`,
        });
      }
    });
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
    cancelPendingAgentForTimelineEdit();
    acceptAppliedTimeline(onApplyTimelineDraft(composedItems));
  }

  function handleResolvedResult(
    resolved: DisplayChord[],
    nextErrors: ParseResult["errors"],
  ) {
    onResult(resolved, nextErrors);
    if (nextErrors.length === 0) setInsertionBoundary(resolved.length);
  }

  function handleProgressionSelect(
    subgroupIdx: number,
    progressionIdx: number,
    progression: Progression,
    scaleType: ScaleType,
  ) {
    setSelected({
      tonalityId: activeTonality,
      subgroupIdx,
      progressionIdx,
      progression,
      scaleType,
    });
    applyProgression(progression, scaleType, selectedKey);
  }

  function handleKeyChange(key: string) {
    setSelectedKey(key);
    if (selected) applyProgression(selected.progression, selected.scaleType, key);
  }

  function handleTonalityChange(tonalityId: TonalityId) {
    setActiveTonality(tonalityId);
    setSelected(null);
  }

  function applyProgression(progression: Progression, scaleType: ScaleType, key: string) {
    const chordNames = transposeNumeralString(progression.numerals, key, scaleType);
    const resolved: DisplayChord[] = [];
    const nextErrors: ParseResult["errors"] = [];

    chordNames.forEach((name, index) => {
      const chord = lookupChord(name);
      if (chord) resolved.push({ input: name, chord });
      else nextErrors.push({ index, input: name, message: `Could not resolve: "${name}"` });
    });

    cancelPendingAgentForTimelineEdit();
    setErrors(nextErrors);
    handleResolvedResult(resolved, nextErrors);
  }

  function isActive(subgroupIdx: number, progressionIdx: number): boolean {
    return selected !== null
      && selected.tonalityId === activeTonality
      && selected.subgroupIdx === subgroupIdx
      && selected.progressionIdx === progressionIdx;
  }

  const contextRail = (
    <div
      className="hh-harmony-context hh-context-grid"
      role="group"
      aria-label={t(activeTab === "free" ? "Free Input harmony context" : "Progressions harmony context")}
    >
      <label htmlFor={`hasher-${activeTab}-key`} className="hh-control-group">
        <span className="hh-control-label">{t("Key")}</span>
        <select
          id={`hasher-${activeTab}-key`}
          aria-label={t(activeTab === "free" ? "Free Input key" : "Progression key")}
          value={activeTab === "free" ? freeKey : selectedKey}
          onChange={(event) => {
            if (activeTab === "free") setFreeKey(event.target.value);
            else handleKeyChange(event.target.value);
          }}
          className="hh-select w-full"
        >
          {ALL_KEYS.map((key) => (
            <option key={key.value} value={key.value}>{key.label}</option>
          ))}
        </select>
      </label>

      {activeTab === "free" ? (
        <label htmlFor="hasher-free-mode" className="hh-control-group">
          <span className="hh-control-label">{t("Mode")}</span>
          <select
            id="hasher-free-mode"
            aria-label={t("Free Input mode")}
            value={freeScaleType}
            onChange={(event) => setFreeScaleType(event.target.value as ScaleType)}
            className="hh-select w-full"
          >
            {FREE_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{t(option.label)}</option>
            ))}
          </select>
        </label>
      ) : (
        <div className="flex min-w-0 items-end gap-2">
          <label htmlFor="hasher-preset-mode" className="hh-control-group min-w-0 flex-1">
            <span className="hh-control-label">{t("Mode")}</span>
            <select
              id="hasher-preset-mode"
              aria-label={t("Progression tonality")}
              value={activeTonality}
              onChange={(event) => handleTonalityChange(event.target.value as TonalityId)}
              className="hh-select w-full"
            >
              {PROGRESSION_LIBRARY.map((group) => (
                <option key={group.id} value={group.id}>{t(group.label)}</option>
              ))}
            </select>
          </label>
          {activeTonality === "minor" ? (
            <button
              type="button"
              className="minor-help-btn"
              onClick={() => setMinorHelpOpen(true)}
              aria-label={t("What is the Minor Blend?")}
              title={t("What is the Minor Blend?")}
              style={{
                width: "var(--control-min-height)",
                height: "var(--control-min-height)",
                backgroundColor: "var(--surface-overlay)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-semibold)",
              }}
            >
              ?
            </button>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <section className="hh-builder mx-auto w-full max-w-6xl px-4">
      <div className="hh-builder-tabs" role="group" aria-label={t("Hasher input mode")}>
        {(["free", "preset"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={activeTab === tab}
            onClick={() => {
              cancelPendingAgentForTimelineEdit();
              setActiveTab(tab);
            }}
            className="hh-builder-tabs__tab"
          >
            {tab === "free" ? t("freeInput") : t("progressions")}
          </button>
        ))}
      </div>

      <ChordReferenceGrid
        chords={composedChordNames}
        onChordAdd={(chordName) => insertComposedChord(chordName, selectedInsertionBoundary)}
        onUndo={() => {
          if (composedItems.length === 0) return;
          stageComposerItems(composedItems.slice(0, -1));
          setInsertionBoundary(Math.max(0, composedItems.length - 1));
        }}
        keyContext={{ key: activeKey, scaleType: activeScaleType }}
        leadingContent={contextRail}
      />

      {contextLaunchNotice ? (
        <p
          role="status"
          className="mt-3 rounded-lg px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--status-warning-bg)",
            border: "1px solid var(--status-warning-border)",
            color: "var(--status-warning-text)",
          }}
        >
          {t(contextLaunchNotice)}
        </p>
      ) : null}

      <div id={`hasher-${activeTab}-panel`} className="hh-panel hh-builder-primary mt-4">
        <ProgressionAgent
          onResult={handleResolvedResult}
          timelineVersion={timelineVersion}
          timelineVersionRef={timelineVersionRef}
          cancellationVersion={agentCancellationVersion}
          cancellationVersionRef={cancellationVersionRef}
          placeholder={t("agentPromptPlaceholder")}
          onRequestHelp={onRequestVoice}
          onHelpIntent={onVoiceIntent}
        />

        <div className="hh-or-separator" aria-label={t("or")}>
          <span aria-hidden="true" />
          <strong>{t("or")}</strong>
          <span aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="hasher-chord-input" className="hh-control-group">
            <span className="hh-control-label">{t("Enter or arrange chords")}</span>
            <input
              id="hasher-chord-input"
              value={composedText}
              onChange={(event) => handleComposerTextChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleComposerSubmit();
                }
              }}
              placeholder={t("freeInputHint")}
              aria-label={t("Chord progression input")}
              className="hh-select w-full"
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </label>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row">
            <ProgressionTimelineComposer
              items={composedItems}
              insertionBoundary={selectedInsertionBoundary}
              onInsertionBoundaryChange={setInsertionBoundary}
              onInsert={insertComposedChord}
              onMove={handleComposerMove}
              onRemove={(index) => {
                const next = composedItems.filter((_, itemIndex) => itemIndex !== index);
                stageComposerItems(next);
                setInsertionBoundary(Math.min(selectedInsertionBoundary, next.length));
              }}
              onClear={() => {
                stageComposerItems([]);
                setInsertionBoundary(0);
              }}
            />
            <button
              type="button"
              onClick={handleComposerSubmit}
              aria-label={t("Run chord composer")}
              disabled={!canRunComposer}
              className="hh-action w-full transition-all sm:w-auto"
              style={{
                backgroundColor: canRunComposer
                  ? "var(--interactive-accent-bg)"
                  : "var(--interactive-disabled-bg)",
                color: canRunComposer
                  ? "var(--interactive-accent-text)"
                  : "var(--interactive-disabled-text)",
                border: `1px solid ${canRunComposer
                  ? "var(--interactive-accent-border)"
                  : "var(--interactive-disabled-border)"}`,
                cursor: canRunComposer ? "pointer" : "not-allowed",
              }}
            >
              {t("Run")}
            </button>
          </div>

          {composerWasRebased && composerDraft.dirty ? (
            <p
              role="status"
              aria-live="polite"
              className="m-0"
              style={{ color: "var(--status-warning-text)", fontSize: "var(--text-xs)" }}
            >
              {t("Composer synced to the latest timeline; your uncommitted grid changes were replaced.")}
            </p>
          ) : null}
        </div>

        {activeTab === "preset" ? (
          <details className="hh-disclosure">
            <summary className="cursor-pointer select-none" style={{ color: "var(--text-secondary)" }}>
              {t("orPickPreset")}
            </summary>
            <div className="flex flex-col gap-4 px-4 pb-4 pt-3">
              {activeGroup.subgroups.map((subgroup, subgroupIdx) => {
                const scaleType = subgroup.scaleType ?? activeGroup.scaleType;
                return (
                  <div key={`${activeGroup.id}-${subgroupIdx}`}>
                    <h3 className="hh-control-label mb-2">{t(subgroup.label)}</h3>
                    <div className="flex flex-wrap gap-2">
                      {subgroup.progressions.map((progression, progressionIdx) => {
                        const active = isActive(subgroupIdx, progressionIdx);
                        return (
                          <button
                            key={`${progression.numerals}-${progressionIdx}`}
                            type="button"
                            aria-label={`${progression.name}: ${progression.numerals}`}
                            onClick={() => handleProgressionSelect(
                              subgroupIdx,
                              progressionIdx,
                              progression,
                              scaleType,
                            )}
                            title={progression.name}
                            className="min-h-11 rounded-lg px-3 py-1.5 text-sm transition-all"
                            style={{
                              backgroundColor: active
                                ? "var(--interactive-accent-bg)"
                                : "var(--surface-overlay)",
                              color: active
                                ? "var(--interactive-accent-text)"
                                : "var(--text-secondary)",
                              border: active
                                ? "1px solid var(--interactive-accent-border)"
                                : "1px solid var(--border-subtle)",
                              fontFamily: "var(--font-mono)",
                              fontWeight: active
                                ? "var(--weight-semibold)"
                                : "var(--weight-regular)",
                            }}
                          >
                            {progression.numerals}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        ) : null}

      </div>

      {errors.length > 0 ? (
        <div
          className="mt-3 rounded-lg px-4 py-2 text-sm"
          style={{
            backgroundColor: "var(--status-error-bg)",
            color: "var(--status-error-text)",
            border: "1px solid var(--status-error-border)",
          }}
        >
          {errors.map((error, index) => (
            <span key={`${error.index}-${error.input}`}>
              {index > 0 ? " · " : null}
              <span style={{ fontFamily: "var(--font-mono)" }}>{error.input}</span>
              {` — ${error.message}`}
            </span>
          ))}
        </div>
      ) : null}

      <AnimatePresence>
        {minorHelpOpen ? <MinorBlendModal onClose={() => setMinorHelpOpen(false)} /> : null}
      </AnimatePresence>
    </section>
  );
}
