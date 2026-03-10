import { useEffect, useRef, useState, useCallback } from "react";
import type { IndexedChord, GuitarDisplayMode } from "../lib/types";
import { parseGuitarSvg, type ParsedDot } from "../lib/guitarSvgParser";
import { noteToPitchClass } from "../lib/harmonyBrain";
import { formatNoteForDisplay, parseNotes, getSvgPath } from "../lib/chordData";

interface GuitarChordDiagramProps {
  chord: IndexedChord;
  variant: number;
  displayMode: GuitarDisplayMode;
  preferFlats: boolean;
}

function buildIntervalMap(entry: { Steps: string; Notes: string }): Map<number, string> {
  const steps = entry.Steps.split("-");
  const notes = entry.Notes.split("-");
  const map = new Map<number, string>();
  for (let i = 0; i < steps.length && i < notes.length; i++) {
    const pc = noteToPitchClass(notes[i]);
    if (pc >= 0) map.set(pc, steps[i]);
  }
  return map;
}

function buildNoteNameMap(
  entry: { Notes: string },
  preferFlats: boolean
): Map<number, string> {
  const notes = entry.Notes.split("-");
  const map = new Map<number, string>();
  for (const note of notes) {
    const pc = noteToPitchClass(note);
    if (pc >= 0) map.set(pc, formatNoteForDisplay(note, preferFlats));
  }
  return map;
}

interface CachedSvg {
  originalText: string;
  dots: ParsedDot[];
  fretOffset: number;
}

/**
 * Sanitize SVG text by removing script tags and event handler attributes.
 * SVGs are local static files we control, but this is a defense-in-depth measure.
 */
function sanitizeSvgText(svgText: string): string {
  return svgText
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "");
}

export default function GuitarChordDiagram({
  chord,
  variant,
  displayMode,
  preferFlats,
}: GuitarChordDiagramProps) {
  const cacheRef = useRef<Map<string, CachedSvg>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgData, setSvgData] = useState<CachedSvg | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const svgUrl = getSvgPath(chord, variant);

  useEffect(() => {
    if (!svgUrl) {
      setFailed(true);
      setLoading(false);
      return;
    }

    const cached = cacheRef.current.get(svgUrl);
    if (cached) {
      setSvgData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFailed(false);

    const controller = new AbortController();

    fetch(svgUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const sanitized = sanitizeSvgText(text);
        const parsed = parseGuitarSvg(sanitized);
        if (!parsed) {
          setFailed(true);
          setLoading(false);
          return;
        }
        const entry: CachedSvg = {
          originalText: parsed.svgText,
          dots: parsed.dots,
          fretOffset: parsed.fretOffset,
        };
        cacheRef.current.set(svgUrl, entry);
        setSvgData(entry);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[GuitarChordDiagram] SVG fetch failed:", err);
        setFailed(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [svgUrl]);

  const applyOverlays = useCallback(() => {
    if (!svgData || !containerRef.current) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgData.originalText, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return;

    const noteNames = parseNotes(chord.entry);
    const rootPc = noteNames.length > 0 ? noteToPitchClass(noteNames[0]) : -1;

    const intervalMap = buildIntervalMap(chord.entry);
    const noteNameMap = buildNoteNameMap(chord.entry, preferFlats);

    // Identify existing fingering text elements (font-size='14', near circles)
    const fingeringTexts = new Set<Element>();
    const circles = doc.querySelectorAll("circle");
    const allTexts = doc.querySelectorAll("text");

    for (const circle of circles) {
      const cx = parseFloat(circle.getAttribute("cx") || "0");
      const cy = parseFloat(circle.getAttribute("cy") || "0");
      for (const t of allTexts) {
        const tx = parseFloat(t.getAttribute("x") || "0");
        const ty = parseFloat(t.getAttribute("y") || "0");
        const fontSize = t.getAttribute("font-size");
        if (fontSize === "14" && Math.abs(tx - (cx - 4)) <= 2 && Math.abs(ty - (cy + 5)) <= 2) {
          fingeringTexts.add(t);
        }
      }
    }

    // Process each parsed dot
    for (const dot of svgData.dots) {
      const isRoot = rootPc >= 0 && dot.pitchClass === rootPc;

      // Find matching circle
      const matchingCircle = Array.from(circles).find((c) => {
        const cx = parseFloat(c.getAttribute("cx") || "0");
        const cy = parseFloat(c.getAttribute("cy") || "0");
        return Math.abs(cx - dot.cx) < 2 && Math.abs(cy - dot.cy) < 2;
      });

      // Recolor
      if (matchingCircle) {
        matchingCircle.setAttribute("fill", isRoot ? "var(--text-accent)" : "#ffffff");
        matchingCircle.setAttribute("stroke", "var(--border-default)");
      }

      // Add text labels in intervals/notes modes
      if (displayMode !== "fingering") {
        const rawLabel = displayMode === "intervals"
          ? intervalMap.get(dot.pitchClass)
          : noteNameMap.get(dot.pitchClass);

        if (rawLabel == null) continue; // no label for unmapped dots — skip silently

        const label = rawLabel;

        const textEl = doc.createElementNS("http://www.w3.org/2000/svg", "text");
        textEl.setAttribute("x", String(dot.cx));
        textEl.setAttribute("y", String(dot.cy));
        textEl.setAttribute("text-anchor", "middle");
        textEl.setAttribute("dominant-baseline", "central");
        textEl.setAttribute("font-size", String(Math.round(dot.r * 0.85)));
        textEl.setAttribute("font-family", "var(--font-mono), monospace");
        textEl.setAttribute("font-weight", "600");
        textEl.setAttribute("fill", isRoot ? "var(--surface-base)" : "#1a1a1a");
        textEl.setAttribute("pointer-events", "none");
        textEl.textContent = label;
        svgEl.appendChild(textEl);
      }
    }

    // Remove original fingering texts in intervals/notes modes
    if (displayMode !== "fingering") {
      for (const t of fingeringTexts) {
        t.remove();
      }
    }

    // Dark-mode recoloring of fretboard elements
    const bgRect = doc.querySelector("rect");
    if (bgRect) {
      const w = parseFloat(bgRect.getAttribute("width") || "0");
      const h = parseFloat(bgRect.getAttribute("height") || "0");
      if (w > 140 && h > 140) {
        bgRect.setAttribute("fill", "var(--surface-overlay)");
        bgRect.setAttribute("stroke", "var(--border-default)");
      }
    }

    for (const line of doc.querySelectorAll("line")) {
      line.setAttribute("stroke", "var(--border-strong)");
    }

    for (const t of doc.querySelectorAll("text")) {
      const y = parseFloat(t.getAttribute("y") || "0");
      const fill = t.getAttribute("fill");
      if (y > 200 || (Math.abs(parseFloat(t.getAttribute("x") || "0") - 20) < 5 && fill === "black")) {
        t.setAttribute("fill", "var(--text-secondary)");
      }
      if (fill === "#990000") {
        t.setAttribute("fill", "var(--text-muted)");
      }
    }

    // Barre rects — recolor for dark mode + root highlighting
    for (const rect of doc.querySelectorAll("rect")) {
      const rw = parseFloat(rect.getAttribute("width") || "0");
      const rh = parseFloat(rect.getAttribute("height") || "0");
      if (rw > 140 && rh > 140) continue;
      if (rh > 40) continue;

      const rx = parseFloat(rect.getAttribute("x") || "0");
      const barreCoversRoot = rootPc >= 0 && svgData.dots.some(
        (d) => d.cx >= rx && d.cx <= rx + rw && d.pitchClass === rootPc
      );
      rect.setAttribute("fill", barreCoversRoot ? "var(--text-accent)" : "#ffffff");
      rect.setAttribute("stroke", "var(--border-default)");
    }

    const serializer = new XMLSerializer();
    const html = serializer.serializeToString(svgEl);
    // Safe: SVG sourced from local static files with script tags stripped
    containerRef.current.replaceChildren();
    containerRef.current.insertAdjacentHTML("afterbegin", html);
  }, [svgData, displayMode, preferFlats, chord.entry, chord.root]);

  useEffect(() => {
    applyOverlays();
  }, [applyOverlays]);

  if (failed || !svgUrl) {
    return (
      <div
        className="w-44 h-44 flex items-center justify-center rounded-lg"
        style={{ backgroundColor: "var(--surface-overlay)", color: "var(--text-muted)" }}
      >
        No diagram
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="w-44 h-56 rounded-lg animate-pulse"
        style={{ backgroundColor: "var(--surface-overlay)" }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-44 h-auto"
      style={{ display: "flex", justifyContent: "center" }}
    />
  );
}
