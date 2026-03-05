/**
 * Guitar SVG parser — extracts finger dot positions from chord diagram SVGs
 * and maps them to pitch classes using standard tuning.
 *
 * SVG coordinate conventions (consistent across all chord diagrams):
 *   String X positions: 45 (low E), 75 (A), 105 (D), 135 (G), 165 (B), 195 (high E)
 *   Fret row Y centers: 56, 96, 136, 176 (rows 0-3 within the displayed fret window)
 *   Circle radius: 13px
 *   Fret numbers: <text x='20' ...> elements along the left margin
 *   Muted strings: <text fill='#990000'> with "X" content above the fretboard
 *   Barre chords: <rect> elements spanning multiple string X positions at a fret row Y
 */

export interface ParsedDot {
  cx: number;
  cy: number;
  r: number;
  stringIndex: number;   // 0 = high E (x=195), 5 = low E (x=45)
  fretNumber: number;    // Absolute fret (1-based), with window offset applied
  pitchClass: number;    // 0-11 (C=0, Cs=1, D=2, ... B=11)
}

export interface ParsedGuitarSvg {
  svgText: string;       // Original SVG text for re-serialization
  dots: ParsedDot[];
  fretOffset: number;    // Starting fret number of the window
}

// Standard tuning: string index 0 = high E, 5 = low E
// Pitch classes: E=4, B=11, G=7, D=2, A=9, E=4
export const GUITAR_STRING_PITCH_CLASSES = [4, 11, 7, 2, 9, 4];

// Fixed X positions for each string (low E to high E in the SVG)
const STRING_X_POSITIONS = [45, 75, 105, 135, 165, 195];
// Maps X position → string index (0=high E, 5=low E)
const X_TO_STRING_INDEX: Record<number, number> = {
  45: 5,   // low E
  75: 4,   // A
  105: 3,  // D
  135: 2,  // G
  165: 1,  // B
  195: 0,  // high E
};

// Fret row Y centers → row index within window (0-3)
const FRET_ROW_Y = [56, 96, 136, 176];
const Y_TOLERANCE = 10; // Tolerance for matching Y to a fret row

function closestFretRow(cy: number): number | null {
  for (let i = 0; i < FRET_ROW_Y.length; i++) {
    if (Math.abs(cy - FRET_ROW_Y[i]) <= Y_TOLERANCE) return i;
  }
  return null;
}

function closestStringIndex(cx: number): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const [xStr, idx] of Object.entries(X_TO_STRING_INDEX)) {
    const dist = Math.abs(cx - Number(xStr));
    if (dist < bestDist && dist <= 10) {
      bestDist = dist;
      best = idx;
    }
  }
  return best;
}

function extractFretOffset(doc: Document): number {
  // Fret numbers are <text x='20' ...> elements with numeric content
  const texts = doc.querySelectorAll("text");
  for (const t of texts) {
    const x = parseFloat(t.getAttribute("x") || "");
    if (Math.abs(x - 20) > 5) continue;
    const content = t.textContent?.trim();
    if (content && /^\d+$/.test(content)) {
      return parseInt(content, 10);
    }
  }
  return 1; // Default to fret 1
}

export function parseGuitarSvg(svgText: string): ParsedGuitarSvg | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) return null;

  const fretOffset = extractFretOffset(doc);
  const dots: ParsedDot[] = [];

  // Parse circle elements (finger dots)
  const circles = doc.querySelectorAll("circle");
  for (const circle of circles) {
    const cx = parseFloat(circle.getAttribute("cx") || "0");
    const cy = parseFloat(circle.getAttribute("cy") || "0");
    const r = parseFloat(circle.getAttribute("r") || "0");

    const stringIdx = closestStringIndex(cx);
    const fretRow = closestFretRow(cy);

    if (stringIdx === null || fretRow === null) continue;

    const absoluteFret = fretOffset + fretRow;
    const pitchClass = (GUITAR_STRING_PITCH_CLASSES[stringIdx] + absoluteFret) % 12;

    dots.push({ cx, cy, r, stringIndex: stringIdx, fretNumber: absoluteFret, pitchClass });
  }

  // Parse barre rectangles — generate virtual dots for covered strings
  const rects = doc.querySelectorAll("rect");
  for (const rect of rects) {
    const rx = parseFloat(rect.getAttribute("x") || "0");
    const ry = parseFloat(rect.getAttribute("y") || "0");
    const rw = parseFloat(rect.getAttribute("width") || "0");
    const rh = parseFloat(rect.getAttribute("height") || "0");

    // Skip the fretboard background rect (large area, y=36)
    if (rw > 140 && rh > 140) continue;

    // Barre rects are narrow (height ~26) and span multiple strings
    if (rh > 40) continue;

    const barreCenterY = ry + rh / 2;
    const fretRow = closestFretRow(barreCenterY);
    if (fretRow === null) continue;

    // Find which strings the barre covers
    for (const sx of STRING_X_POSITIONS) {
      if (sx >= rx && sx <= rx + rw) {
        const stringIdx = X_TO_STRING_INDEX[sx];
        // Don't add if a circle already exists at this position
        const alreadyHasDot = dots.some(
          (d) => d.stringIndex === stringIdx && d.fretNumber === fretOffset + fretRow
        );
        if (!alreadyHasDot) {
          const absoluteFret = fretOffset + fretRow;
          const pitchClass = (GUITAR_STRING_PITCH_CLASSES[stringIdx] + absoluteFret) % 12;
          dots.push({
            cx: sx,
            cy: barreCenterY,
            r: 13,
            stringIndex: stringIdx,
            fretNumber: absoluteFret,
            pitchClass,
          });
        }
      }
    }
  }

  if (dots.length === 0) return null;

  return { svgText, dots, fretOffset };
}
