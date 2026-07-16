const INTERVAL_COLOR_TOKENS: Readonly<Record<number, string>> = Object.freeze({
  0: "var(--music-interval-root)",
  1: "var(--music-interval-flat-2)",
  2: "var(--music-interval-2)",
  3: "var(--music-interval-minor-3)",
  4: "var(--music-interval-major-3)",
  5: "var(--music-interval-4)",
  6: "var(--music-interval-tritone)",
  7: "var(--music-interval-5)",
  8: "var(--music-interval-flat-6)",
  9: "var(--music-interval-6)",
  10: "var(--music-interval-flat-7)",
  11: "var(--music-interval-major-7)",
});

/** Returns the shared semantic color for a chromatic interval (modulo 12). */
export function intervalColor(interval: number): string {
  if (!Number.isFinite(interval)) return "var(--text-primary)";
  const normalized = ((Math.trunc(interval) % 12) + 12) % 12;
  return INTERVAL_COLOR_TOKENS[normalized] ?? "var(--text-primary)";
}
