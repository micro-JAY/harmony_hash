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
    dirty: false,
  }));
  const [activeKey, setActiveKey] = useState("C");
  const [activeScaleType, setActiveScaleType] = useState<ScaleType>("major");
  const [selected, setSelected] = useState<SelectedProgression | null>(null);
  const [errors, setErrors] = useState<ParseResult["errors"]>([]);
  const [activeTonality, setActiveTonality] = useState<TonalityId>("major");
  const [activeSubgroupIndex, setActiveSubgroupIndex] = useState(0);
  const [minorHelpOpen, setMinorHelpOpen] = useState(false);
  const cancellationVersionRef = useRef(0);
  const [agentCancellationVersion, setAgentCancellationVersion] = useState(0);
  const [contextLaunchNotice, setContextLaunchNotice] = useState<string | null>(null);
  const [appliedContextLaunchVersion, setAppliedContextLaunchVersion] = useState<number | null>(null);

  if (contextLaunch && contextLaunch.version !== appliedContextLaunchVersion) {
    setAppliedContextLaunchVersion(contextLaunch.version);
    setActiveKey(contextLaunch.key);
    if (contextLaunch.scaleType) setActiveScaleType(contextLaunch.scaleType);
    setContextLaunchNotice(contextLaunch.notice ?? null);
  }

  useEffect(() => {
    if (!contextLaunch || contextLaunch.version !== appliedContextLaunchVersion) return;
    requestAnimationFrame(() => {
      document.getElementById("hasher-key")?.focus();
    });
  }, [appliedContextLaunchVersion, contextLaunch]);

  const composerWasRebased = composerDraft.baseTimelineVersion !== timelineVersion;
  const composedItems = composerWasRebased ? committedItems : composerDraft.items;
  const composerIsDirty = composerWasRebased ? false : composerDraft.dirty;
  const canRunComposer = composedItems.length > 0 || composerIsDirty;
  const composedChordNames = composedItems.map((item) => item.value);
  const activeGroup = PROGRESSION_LIBRARY.find((group) => group.id === activeTonality)!;
  const activeSubgroup = activeGroup.subgroups[activeSubgroupIndex] ?? activeGroup.subgroups[0];

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
      dirty: false,
    };
  }

  function stageComposerItems(items: TimelineDraftItem<string>[]) {
    cancelPendingAgentForTimelineEdit();
    setComposerDraft({
      baseTimelineVersion: timelineVersion,
      items,
      dirty: true,
    });
  }

  function acceptAppliedTimeline(applied: readonly TimelineItem<DisplayChord>[]) {
    const appliedItems = draftItemsFromTimeline(applied);
    setComposerDraft({
      baseTimelineVersion: timelineVersionRef.current,
      items: appliedItems,
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
  }

  function handleProgressionSelect(
    subgroupIdx: number,
    progressionIdx: number,
    progression: Progression,
    scaleType: ScaleType,
  ) {
    setActiveScaleType(scaleType);
    setSelected({
      tonalityId: activeTonality,
      subgroupIdx,
      progressionIdx,
      progression,
      scaleType,
    });
    applyProgression(progression, scaleType, activeKey);
  }

  function handleKeyChange(key: string) {
    cancelPendingAgentForTimelineEdit();
    setActiveKey(key);
    if (selected) applyProgression(selected.progression, selected.scaleType, key);
  }

  function handleModeChange(scaleType: ScaleType) {
    cancelPendingAgentForTimelineEdit();
    setActiveScaleType(scaleType);
    setSelected(null);
  }

  function handleTonalityChange(tonalityId: TonalityId) {
    setActiveTonality(tonalityId);
    setActiveSubgroupIndex(0);
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
      aria-label={t("Hasher harmony context")}
      data-tour="hasher-context"
    >
      <label htmlFor="hasher-key" className="hh-control-group">
        <span className="hh-control-label">{t("Key")}</span>
        <select
          id="hasher-key"
          aria-label={t("Hasher key")}
          value={activeKey}
          onChange={(event) => handleKeyChange(event.target.value)}
          className="hh-select w-full"
        >
          {ALL_KEYS.map((key) => (
            <option key={key.value} value={key.value}>{key.label}</option>
          ))}
        </select>
      </label>

      <label htmlFor="hasher-mode" className="hh-control-group">
        <span className="hh-control-label">{t("Mode")}</span>
        <select
          id="hasher-mode"
          aria-label={t("Hasher mode")}
          value={activeScaleType}
          onChange={(event) => handleModeChange(event.target.value as ScaleType)}
          className="hh-select w-full"
        >
          {FREE_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{t(option.label)}</option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <section className="hh-builder mx-auto w-full max-w-6xl px-4">
      {contextRail}

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

      <div id="hasher-unified-flow" className="hh-builder-flow mt-4">
        <section className="hh-builder-step" aria-labelledby="hasher-presets-title" data-tour="hasher-presets">
          <h2 id="hasher-presets-title" className="hh-builder-step__title">
            {t("Choose from a preset")}
          </h2>
          <div className="hh-preset-collections" role="group" aria-label={t("Preset collection")}>
            {PROGRESSION_LIBRARY.map((group) => (
              <button
                key={group.id}
                type="button"
                aria-pressed={activeTonality === group.id}
                onClick={() => handleTonalityChange(group.id)}
                className="hh-preset-collections__option"
              >
                {t(group.label)}
              </button>
            ))}
            {activeTonality === "minor" ? (
              <button
                type="button"
                className="minor-help-btn hh-preset-help"
                onClick={() => setMinorHelpOpen(true)}
                aria-label={t("What is the Minor Blend?")}
                title={t("What is the Minor Blend?")}
              >
                ?
              </button>
            ) : null}
          </div>
          <div className="hh-preset-groups">
            {activeGroup.subgroups.length > 1 ? (
              <div className="hh-preset-subgroups" role="tablist" aria-label={t(activeGroup.label)}>
                {activeGroup.subgroups.map((subgroup, subgroupIdx) => (
                  <button
                    key={`${activeGroup.id}-${subgroup.label}`}
                    type="button"
                    role="tab"
                    aria-selected={activeSubgroupIndex === subgroupIdx}
                    onClick={() => setActiveSubgroupIndex(subgroupIdx)}
                    className="hh-preset-subgroups__option"
                  >
                    {t(subgroup.label)}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="hh-preset-group">
              <h3 className="sr-only">{t(activeSubgroup.label)}</h3>
              <div className="hh-preset-options">
                {activeSubgroup.progressions.map((progression, progressionIdx) => {
                  const scaleType = activeSubgroup.scaleType ?? activeGroup.scaleType;
                  const active = isActive(activeSubgroupIndex, progressionIdx);
                  return (
                    <button
                      key={`${progression.numerals}-${progressionIdx}`}
                      type="button"
                      aria-pressed={active}
                      aria-label={`${t(progression.name)}: ${progression.numerals}`}
                      onClick={() => handleProgressionSelect(
                        activeSubgroupIndex,
                        progressionIdx,
                        progression,
                        scaleType,
                      )}
                      title={t(progression.name)}
                      className="hh-preset-option"
                    >
                      <span>{progression.numerals}</span>
                      <small>{t(progression.name)}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="hh-or-separator" aria-label={t("or")}>
          <span aria-hidden="true" />
          <strong>{t("or")}</strong>
          <span aria-hidden="true" />
        </div>

        <section className="hh-builder-step" aria-labelledby="hasher-describe-title" data-tour="hasher-describe">
          <h2 id="hasher-describe-title" className="hh-builder-step__title">
            {t("Describe a progression or mood")}
          </h2>
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
        </section>

        <div className="hh-or-separator" aria-label={t("or")}>
          <span aria-hidden="true" />
          <strong>{t("or")}</strong>
          <span aria-hidden="true" />
        </div>

        <section className="hh-builder-step" aria-labelledby="hasher-compose-title" data-tour="hasher-composer">
          <h2 id="hasher-compose-title" className="hh-builder-step__title">
            {t("Build your own")}
          </h2>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row">
            <ProgressionTimelineComposer
              items={composedItems}
              insertionBoundary={composedItems.length}
              onInsertionBoundaryChange={() => undefined}
              onInsert={insertComposedChord}
              onMove={handleComposerMove}
              onRemove={(index) => {
                const next = composedItems.filter((_, itemIndex) => itemIndex !== index);
                stageComposerItems(next);
              }}
              onClear={() => stageComposerItems([])}
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
        </section>
      </div>

      <div data-tour="hasher-chord-browser">
        <ChordReferenceGrid
          chords={composedChordNames}
          onChordAdd={(chordName) => insertComposedChord(chordName, composedItems.length)}
          onUndo={() => {
            if (composedItems.length === 0) return;
            stageComposerItems(composedItems.slice(0, -1));
          }}
          keyContext={{ key: activeKey, scaleType: activeScaleType }}
        />
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
