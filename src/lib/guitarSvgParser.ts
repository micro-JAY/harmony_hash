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
  midi: number;          // Absolute standard-tuning MIDI pitch for playback
  source: "circle" | "barre";
}

export interface ParsedGuitarSvg {
  svgText: string;       // Original SVG text for re-serialization
  dots: ParsedDot[];
  fretOffset: number;    // Starting fret number of the window
  mutedStringIndexes: number[];
}

// Standard tuning: string index 0 = high E, 5 = low E
// Pitch classes: E=4, B=11, G=7, D=2, A=9, E=4
export const GUITAR_STRING_PITCH_CLASSES = [4, 11, 7, 2, 9, 4];
export const GUITAR_STRING_OPEN_MIDIS = [64, 59, 55, 50, 45, 40] as const;

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

// Open string indicators sit at cy ≈ 19, r=8 (above the fretboard)
const OPEN_STRING_Y = 19;
const OPEN_STRING_Y_TOLERANCE = 8;

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const MAX_SVG_SOURCE_LENGTH = 65_536;
const MAX_SVG_ELEMENTS = 512;
const SAFE_NUMBER = /^-?(?:\d+|\d*\.\d+)$/;
const SAFE_VIEW_BOX = /^-?(?:\d+|\d*\.\d+)(?:\s+-?(?:\d+|\d*\.\d+)){3}$/;
const SAFE_PAINT = /^(?:none|black|white|currentColor|#[0-9a-fA-F]{3,8})$/;

const ALLOWED_ATTRIBUTES: Readonly<Record<string, ReadonlySet<string>>> = {
  svg: new Set(["width", "height", "viewBox"]),
  rect: new Set(["x", "y", "width", "height", "fill", "stroke", "stroke-width"]),
  line: new Set(["x1", "y1", "x2", "y2", "stroke", "stroke-width"]),
  circle: new Set(["cx", "cy", "r", "fill", "stroke", "stroke-width"]),
  text: new Set(["x", "y", "fill", "font-family", "font-size", "text-anchor"]),
};

function isSafeSvgAttribute(name: string, value: string): boolean {
  if (name === "viewBox") return SAFE_VIEW_BOX.test(value);
  if (["fill", "stroke"].includes(name)) return SAFE_PAINT.test(value);
  if (name === "font-family") return value === "Arial";
  if (name === "text-anchor") return ["start", "middle", "end"].includes(value);
  return SAFE_NUMBER.test(value);
}

/** Clone only the small SVG vocabulary used by the bundled chord diagrams. */
export function sanitizeGuitarSvg(svgText: string): string | null {
  if (svgText.length === 0 || svgText.length > MAX_SVG_SOURCE_LENGTH) return null;

  const parser = new DOMParser();
  const sourceDoc = parser.parseFromString(svgText, "image/svg+xml");
  const sourceRoot = sourceDoc.documentElement;
  if (
    sourceDoc.querySelector("parsererror")
    || sourceRoot.localName !== "svg"
    || sourceRoot.namespaceURI !== SVG_NAMESPACE
  ) {
    return null;
  }

  const cleanDoc = parser.parseFromString(`<svg xmlns="${SVG_NAMESPACE}"/>`, "image/svg+xml");
  let elementCount = 0;

  function cloneAllowedElement(source: Element): Element | null {
    const tagName = source.localName;
    const allowedAttributes = ALLOWED_ATTRIBUTES[tagName];
    if (!allowedAttributes || source.namespaceURI !== SVG_NAMESPACE) return null;
    elementCount += 1;
    if (elementCount > MAX_SVG_ELEMENTS) return null;

    const clone = cleanDoc.createElementNS(SVG_NAMESPACE, tagName);
    for (const attribute of source.attributes) {
      if (
        allowedAttributes.has(attribute.name)
        && isSafeSvgAttribute(attribute.name, attribute.value)
      ) {
        clone.setAttribute(attribute.name, attribute.value);
      }
    }

    if (tagName === "text") {
      const label = source.textContent ?? "";
      if (label.length <= 64) clone.textContent = label;
      return clone;
    }

    for (const child of source.children) {
      const childClone = cloneAllowedElement(child);
      if (childClone) clone.appendChild(childClone);
    }
    return clone;
  }

  const cleanRoot = cloneAllowedElement(sourceRoot);
  if (!cleanRoot || elementCount > MAX_SVG_ELEMENTS) return null;
  cleanDoc.replaceChild(cleanRoot, cleanDoc.documentElement);
  return new XMLSerializer().serializeToString(cleanRoot);
}

function closestFretRow(cy: number): number | null {
  for (let i = 0; i < FRET_ROW_Y.length; i++) {
    if (Math.abs(cy - FRET_ROW_Y[i]) <= Y_TOLERANCE) return i;
  }
  return null;
}

function isOpenStringIndicator(cy: number): boolean {
  return Math.abs(cy - OPEN_STRING_Y) <= OPEN_STRING_Y_TOLERANCE;
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
  const mutedStringIndexes: number[] = [];

  for (const text of doc.querySelectorAll("text")) {
    if (text.textContent?.trim().toUpperCase() !== "X") continue;
    const stringIdx = closestStringIndex(parseFloat(text.getAttribute("x") || "0"));
    if (stringIdx !== null && !mutedStringIndexes.includes(stringIdx)) {
      mutedStringIndexes.push(stringIdx);
    }
  }

  // Parse circle elements (finger dots)
  const circles = doc.querySelectorAll("circle");
  for (const circle of circles) {
    const cx = parseFloat(circle.getAttribute("cx") || "0");
    const cy = parseFloat(circle.getAttribute("cy") || "0");
    const r = parseFloat(circle.getAttribute("r") || "0");

    const stringIdx = closestStringIndex(cx);
    if (stringIdx === null) continue;

    // Open string indicators (cy ≈ 19, r=8) represent fret 0
    if (isOpenStringIndicator(cy)) {
      const pitchClass = GUITAR_STRING_PITCH_CLASSES[stringIdx]; // fret 0 = open string
      dots.push({
        cx,
        cy,
        r,
        stringIndex: stringIdx,
        fretNumber: 0,
        pitchClass,
        midi: GUITAR_STRING_OPEN_MIDIS[stringIdx],
        source: "circle",
      });
      continue;
    }

    const fretRow = closestFretRow(cy);
    if (fretRow === null) continue;

    const absoluteFret = fretOffset + fretRow;
    const pitchClass = (GUITAR_STRING_PITCH_CLASSES[stringIdx] + absoluteFret) % 12;

    dots.push({
      cx,
      cy,
      r,
      stringIndex: stringIdx,
      fretNumber: absoluteFret,
      pitchClass,
      midi: GUITAR_STRING_OPEN_MIDIS[stringIdx] + absoluteFret,
      source: "circle",
    });
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
            midi: GUITAR_STRING_OPEN_MIDIS[stringIdx] + absoluteFret,
            source: "barre",
          });
        }
      }
    }
  }

  if (dots.length === 0) return null;

  return { svgText, dots, fretOffset, mutedStringIndexes };
}
