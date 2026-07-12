## Context

Before Phase 2.2, `ChordReferenceGrid` exposed the full catalog without key context. `ProgressionInput` already owned preset key and scale-type state, while `src/lib/theory/` did not yet exist. The merged PR #23 introduced the smallest reusable theory foundation and a binary row overlay without changing insertion or timeline behavior.

## Goals / Non-Goals

**Goals:**

- Establish pure pitch-class, scale-membership, and scale-degree helpers for later theory features.
- Make in-key roots visually discoverable when a key context is available.
- Preserve baseline grid rendering and interaction when suggestions are Off.

**Non-Goals:**

- Score chord qualities or next-chord movement.
- Add Jazz, Modal, style, genre, or automatic key-inference behavior.
- Change catalog lookup, insertion, undo, or timeline ownership.

## Decisions

### 1. Introduce a pure shared theory module

Pitch-class normalization and seven supported scale interval sets live under `src/lib/theory/` with no React or DOM dependency. The grid consumes the helpers rather than duplicating pitch logic.

### 2. Use an optional key context

`ChordReferenceGrid` accepts an optional key plus scale type. Diatonic mode is unavailable without that context, so the component remains reusable and fails closed instead of assuming a key.

### 3. Keep the first overlay binary and row-based

The first slice dims non-diatonic root rows and leaves diatonic rows unchanged. This deliberately avoids implying chord-quality or transition ranking before a scoring engine exists.

## Risks / Trade-offs

- [Root membership is coarser than chord compatibility] → Label the mode Diatonic and defer per-cell scoring to a separate OpenSpec change.
- [Dimmed rows can reduce discoverability] → Keep Off as the default and preserve every cell's interaction.
- [Later scoring needs more context] → Keep theory helpers pure and additive so later changes can replace the presentation without rewriting scale primitives.
