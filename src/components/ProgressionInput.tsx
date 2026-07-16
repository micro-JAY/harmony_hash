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
import PresetCategoryDialog from "./PresetCategoryDialog";
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
  const [presetDialogTonality, setPresetDialogTonality] = useState<TonalityId | null>(null);
  const [minorHelpOpen, setMinorHelpOpen] = useState(false);
  const [insertionBoundary, setInsertionBoundary] = useState(committedItems.length);
  const presetTriggerRef = useRef<HTMLButtonElement>(null);
  const selectedTimelineVersionRef = useRef<number | null>(null);
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
  const presetDialogGroup = presetDialogTonality === null
    ? null
    : PROGRESSION_LIBRARY.find((group) => group.id === presetDialogTonality) ?? null;

  useEffect(() => {
    if (composerDraft.baseTimelineVersion !== timelineVersion) {
      setInsertionBoundary(committedItems.length);
    }
  }, [committedItems.length, composerDraft.baseTimelineVersion, timelineVersion]);

  useEffect(() => {
    if (selected && selectedTimelineVersionRef.current !== timelineVersion) {
      selectedTimelineVersionRef.current = null;
      setSelected(null);
    }
  }, [selected, timelineVersion]);

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

  function clearSelectedPreset() {
    selectedTimelineVersionRef.current = null;
    setSelected(null);
  }

  function stageComposerItems(
    items: TimelineDraftItem<string>[],
    nextInsertionBoundary = Math.min(insertionBoundary, items.length),
  ) {
    cancelPendingAgentForTimelineEdit();
    clearSelectedPreset();
    setInsertionBoundary(nextInsertionBoundary);
    setComposerDraft({
      baseTimelineVersion: timelineVersion,
      items,
      dirty: true,
    });
  }

  function acceptAppliedTimeline(
    applied: readonly TimelineItem<DisplayChord>[],
    nextInsertionBoundary = applied.length,
  ) {
    const appliedItems = draftItemsFromTimeline(applied);
    setInsertionBoundary(Math.min(nextInsertionBoundary, appliedItems.length));
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
    stageComposerItems(nextItems, safeBoundary + 1);
  }

  function commitOrStageComposerEdit(
    current: ComposerDraftState,
    nextItems: TimelineDraftItem<string>[],
    nextInsertionBoundary: number,
  ) {
    if (!current.dirty && nextItems.every((item) => item.id !== null)) {
      cancelPendingAgentForTimelineEdit();
      clearSelectedPreset();
      acceptAppliedTimeline(
        onApplyTimelineDraft(nextItems),
        nextInsertionBoundary,
      );
      return;
    }
    stageComposerItems(nextItems, nextInsertionBoundary);
  }

  function handleComposerMove(from: number, to: number) {
    const current = effectiveDraft();
    const transaction = transactTimeline(current.items, { type: "move", from, to });
    if (!transaction.changed) return;
    const nextItems = [...transaction.items];
    commitOrStageComposerEdit(current, nextItems, to + 1);
  }

  function handleComposerRemove(index: number) {
    const current = effectiveDraft();
    const transaction = transactTimeline(current.items, { type: "remove", index });
    if (!transaction.changed) return;
    commitOrStageComposerEdit(
      current,
      [...transaction.items],
      Math.min(index, transaction.items.length),
    );
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
    clearSelectedPreset();
    onResult(resolved, nextErrors);
  }

  function handleProgressionSelect(
    tonalityId: TonalityId,
    subgroupIdx: number,
    progressionIdx: number,
    progression: Progression,
    scaleType: ScaleType,
  ) {
    setActiveScaleType(scaleType);
    setSelected({
      tonalityId,
      subgroupIdx,
      progressionIdx,
      progression,
      scaleType,
    });
    applyProgression(progression, scaleType, activeKey);
    setPresetDialogTonality(null);
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

  function handleCloseMinorHelp() {
    setMinorHelpOpen(false);
    requestAnimationFrame(() => presetTriggerRef.current?.focus());
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
    onResult(resolved, nextErrors);
    selectedTimelineVersionRef.current = timelineVersionRef.current;
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
                aria-haspopup="dialog"
                aria-expanded={presetDialogTonality === group.id}
                aria-pressed={selected?.tonalityId === group.id}
                onClick={(event) => {
                  presetTriggerRef.current = event.currentTarget;
                  setPresetDialogTonality(group.id);
                }}
                className="hh-preset-collections__option"
              >
                {t(group.label)}
              </button>
            ))}
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
              insertionBoundary={Math.min(insertionBoundary, composedItems.length)}
              onInsertionBoundaryChange={setInsertionBoundary}
              onInsert={insertComposedChord}
              onMove={handleComposerMove}
              onRemove={handleComposerRemove}
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
            handleComposerRemove(composedItems.length - 1);
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
        {minorHelpOpen ? <MinorBlendModal onClose={handleCloseMinorHelp} /> : null}
      </AnimatePresence>
      {presetDialogGroup ? (
        <PresetCategoryDialog
          group={presetDialogGroup}
          selected={selected}
          returnFocusRef={presetTriggerRef}
          onSelect={handleProgressionSelect}
          onRequestClose={() => setPresetDialogTonality(null)}
          onOpenMinorBlend={() => {
            setPresetDialogTonality(null);
            setMinorHelpOpen(true);
          }}
        />
      ) : null}
    </section>
  );
}
