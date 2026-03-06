## 1. Types + SVG Parser Utility

- [x] 1.1 Add `GuitarDisplayMode` type to `src/lib/types.ts`
- [x] 1.2 Create `src/lib/guitarSvgParser.ts` with SVG parsing logic: fetch SVG text, parse circles/rects, map dots to pitch classes using string tuning + fret offset
- [x] 1.3 Validate: `npm run build` passes with zero TypeScript errors
- [x] 1.4 Commit: `feat: add GuitarDisplayMode type and guitar SVG parser utility`

## 2. GuitarChordDiagram Component

- [x] 2.1 Create `src/components/GuitarChordDiagram.tsx` with fetch + cache + inline SVG rendering
- [x] 2.2 Implement root dot accent highlighting (var(--text-accent) fill) across all modes
- [x] 2.3 Implement interval label overlay for Intervals mode
- [x] 2.4 Implement note name label overlay for Notes mode (respecting flat/sharp preference)
- [x] 2.5 Implement fallback to "No diagram" placeholder on fetch/parse failure
- [x] 2.6 Validate: `npm run build` passes with zero TypeScript errors
- [x] 2.7 Commit: `feat: add GuitarChordDiagram component with inline SVG + label overlay`

## 3. Wire into ChordCard

- [x] 3.1 Add `GuitarDisplayMode` state and 3-way pill toggle to guitar branch in ChordCard.tsx
- [x] 3.2 Replace `<img>` with `<GuitarChordDiagram>` component
- [x] 3.3 Remove `filter: invert(...)` CSS from the old img approach
- [x] 3.4 Validate: `npm run build` passes with zero TypeScript errors
- [x] 3.5 Run visual verification script and review screenshots
- [x] 3.6 Commit: `feat: wire GuitarChordDiagram and display mode toggle into ChordCard`
