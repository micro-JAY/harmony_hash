import { useRef, type RefObject } from "react";
import type {
  Progression,
  ScaleType,
  TonalityGroup,
  TonalityId,
} from "../lib/types";
import { useT } from "../i18n/I18nContext";
import AccessibleDialog from "./AccessibleDialog";

interface SelectedPresetIdentity {
  readonly tonalityId: TonalityId;
  readonly subgroupIdx: number;
  readonly progressionIdx: number;
}

interface PresetCategoryDialogProps {
  group: TonalityGroup;
  selected: SelectedPresetIdentity | null;
  returnFocusRef: RefObject<HTMLElement | null>;
  onSelect: (
    tonalityId: TonalityId,
    subgroupIdx: number,
    progressionIdx: number,
    progression: Progression,
    scaleType: ScaleType,
  ) => void;
  onRequestClose: () => void;
  onOpenMinorBlend: () => void;
}

const DIALOG_TITLE_KEYS: Record<TonalityId, string> = {
  major: "Major presets",
  minor: "Minor presets",
  modal: "Modal presets",
  advanced: "Advanced presets",
};

export default function PresetCategoryDialog({
  group,
  selected,
  returnFocusRef,
  onSelect,
  onRequestClose,
  onOpenMinorBlend,
}: PresetCategoryDialogProps) {
  const t = useT();
  const firstProgressionRef = useRef<HTMLButtonElement>(null);

  return (
    <AccessibleDialog
      title={t(DIALOG_TITLE_KEYS[group.id])}
      description={t("Select a progression to load it into HASHER.")}
      closeLabel={t("Close preset dialog")}
      onRequestClose={onRequestClose}
      initialFocusRef={firstProgressionRef}
      returnFocusRef={returnFocusRef}
      maxWidth="64rem"
      className="hh-preset-dialog"
      contentClassName="hh-preset-dialog__content"
    >
      {group.id === "minor" ? (
        <div className="hh-preset-dialog__help">
          <button
            type="button"
            className="hh-action"
            onClick={onOpenMinorBlend}
            style={{
              color: "var(--interactive-secondary-text)",
              backgroundColor: "var(--interactive-secondary-bg)",
              border: "1px solid var(--interactive-secondary-border)",
            }}
          >
            {t("What is the Minor Blend?")}
          </button>
        </div>
      ) : null}

      <div
        className="hh-preset-dialog__groups"
        data-preset-category={group.id}
        data-preset-count={group.subgroups.reduce(
          (count, subgroup) => count + subgroup.progressions.length,
          0,
        )}
      >
        {group.subgroups.map((subgroup, subgroupIdx) => {
          const scaleType = subgroup.scaleType ?? group.scaleType;
          return (
            <section
              key={`${group.id}-${subgroup.label}`}
              className="hh-preset-dialog__group"
              aria-labelledby={`preset-${group.id}-subgroup-${subgroupIdx}`}
            >
              <h3 id={`preset-${group.id}-subgroup-${subgroupIdx}`}>
                {t(subgroup.label)}
              </h3>
              <div className="hh-preset-dialog__options">
                {subgroup.progressions.map((progression, progressionIdx) => {
                  const active = selected?.tonalityId === group.id
                    && selected.subgroupIdx === subgroupIdx
                    && selected.progressionIdx === progressionIdx;
                  const isFirst = subgroupIdx === 0 && progressionIdx === 0;
                  return (
                    <button
                      key={`${progression.name}-${progression.numerals}`}
                      ref={isFirst ? firstProgressionRef : undefined}
                      type="button"
                      data-preset-option="true"
                      aria-pressed={active}
                      aria-label={`${t(progression.name)}: ${progression.numerals}`}
                      onClick={() => onSelect(
                        group.id,
                        subgroupIdx,
                        progressionIdx,
                        progression,
                        scaleType,
                      )}
                      className="hh-preset-dialog__option"
                    >
                      <span>{progression.numerals}</span>
                      <small>{t(progression.name)}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </AccessibleDialog>
  );
}
