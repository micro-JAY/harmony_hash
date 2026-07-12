interface MatchColorStop {
  readonly percent: number;
  readonly token: string;
}

const MATCH_COLOR_STOPS: ReadonlyArray<MatchColorStop> = Object.freeze([
  Object.freeze({ percent: 0, token: "--music-match-low" }),
  Object.freeze({ percent: 50, token: "--music-match-mid" }),
  Object.freeze({ percent: 70, token: "--music-match-good" }),
  Object.freeze({ percent: 100, token: "--music-match-high" }),
]);

export function matchColorForPercent(percent: number): string {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`Match percent must be between 0 and 100; received ${percent}`);
  }

  const exactStop = MATCH_COLOR_STOPS.find((stop) => stop.percent === percent);
  if (exactStop) return `var(${exactStop.token})`;

  const upperIndex = MATCH_COLOR_STOPS.findIndex((stop) => stop.percent > percent);
  const lower = MATCH_COLOR_STOPS[upperIndex - 1];
  const upper = MATCH_COLOR_STOPS[upperIndex];
  const upperWeight = Math.round(((percent - lower.percent) / (upper.percent - lower.percent)) * 100);

  return `color-mix(in srgb, var(${lower.token}) ${100 - upperWeight}%, var(${upper.token}) ${upperWeight}%)`;
}
