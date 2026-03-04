import type { TonalityGroup } from "../lib/types";

/**
 * Full chord progression library for Harmony Hash.
 * Source of truth: docs/hh-library.md
 *
 * Structure: 4 tonality groups → named subgroups → progressions
 * Each progression: { name, numerals } where numerals uses en-dash separators
 */
export const PROGRESSION_LIBRARY: TonalityGroup[] = [
  // ═══════════════════════════════════════════════════════════════════
  // 1. MAJOR KEY PROGRESSIONS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "major",
    label: "Major",
    scaleType: "major",
    subgroups: [
      {
        label: "The Foundations (Rock, Pop, Folk)",
        progressions: [
          { name: 'The "Primary" Loop', numerals: "I – IV – V" },
          { name: "The Rock Standard", numerals: "I – bVII – IV" },
          { name: 'The "Axis" (Pop Standard)', numerals: "I – V – vi – IV" },
          { name: 'The "Pachelbel" Canon', numerals: "I – V – vi – iii – IV – I – IV – V" },
          { name: "The Sensitive Pop Loop", numerals: "I – IV – vi – V" },
          { name: 'The "50s" (Doo-Wop)', numerals: "I – vi – IV – V" },
          { name: "The Plagal Loop", numerals: "I – IV – I – V" },
          { name: "Uplifting Climb", numerals: "I – ii – iii – IV" },
          { name: "The Hopeful Step", numerals: "I – iii – IV – V" },
          { name: 'The "Wild Thing" Energy', numerals: "I – IV – V – IV" },
        ],
      },
      {
        label: "Jazz & R&B Fundamentals",
        progressions: [
          { name: "The 2-5-1 (The King)", numerals: "ii – V – I" },
          { name: "The Pop-Jazz Variant", numerals: "I – IV – ii – V" },
          { name: "The Jazz Turnaround", numerals: "I – vi – ii – V" },
          { name: "The Extended Turnaround", numerals: "iii – vi – ii – V" },
          { name: 'The "Stoned" R&B Loop', numerals: "Imaj7 – IVmaj7" },
          { name: 'The "Misty" Movement', numerals: "Imaj7 – vi7 – ii7 – V7" },
          { name: "The Mediant Shift", numerals: "I – III7 – IV" },
        ],
      },
      {
        label: "Gospel & Soul Movement",
        progressions: [
          { name: 'The "Sunday Morning" Walk', numerals: "I – I/III – IV – V" },
          { name: 'The "Preacher" Cadence', numerals: "IV – IVm – I" },
          { name: 'The Neo-Soul "Rub"', numerals: "ii – vii° – I – iii – IV" },
          { name: "Circular Soul", numerals: "I – VI7 – ii – V" },
          { name: 'The "Soulful Descent"', numerals: "I – V/vii – vi – V" },
          { name: 'The "Passing" Diminished', numerals: "I – #I°7 – ii – V" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. MINOR TONALITY PROGRESSIONS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "minor",
    label: "Minor",
    scaleType: "natural_minor",
    subgroups: [
      {
        label: "The Essentials (Pop & Rock)",
        progressions: [
          { name: 'The "Hit the Road" Descent', numerals: "i – VII – VI – V" },
          { name: 'The "Sensitive Minor" Loop', numerals: "i – VI – III – VII" },
          { name: 'The "Watchtower"', numerals: "i – VII – VI – VII" },
          { name: "The Melancholy Walk", numerals: "i – VI – III – VII" },
          { name: "The Moody Pop Cycle", numerals: "i – iv – VI – V" },
          { name: 'The "Sultans" Movement', numerals: "i – VII – VI – III" },
          { name: 'The "Creep" Minor Turn', numerals: "i – III – IV – iv" },
        ],
      },
      {
        label: "R&B & Soul Minor Loops",
        progressions: [
          { name: 'The "Infinite Minor"', numerals: "i – VI – VII" },
          { name: "The Soulful Minor 1-4", numerals: "i – IV" },
          { name: 'The Minor "Walk-up"', numerals: "i – VII – III – IV" },
          { name: "The Dark R&B Loop", numerals: "i – v – VI – VII" },
          { name: 'The "Smooth Operator" Change', numerals: "im7 – iim7 – bIIImaj7 – iim7" },
          { name: "The Neo-Soul Minor", numerals: "i9 – iv11 – bVII13 – bIIImaj9" },
        ],
      },
      {
        label: "Harmonic/Classical Minor (Strong Pull)",
        scaleType: "harmonic_minor",
        progressions: [
          { name: "The Dramatic Cadence", numerals: "i – iv – V – i" },
          { name: "The Spanish Vamp", numerals: "i – bII – III – bII" },
          { name: "The Tense Resolution", numerals: "ii° – V – i" },
          { name: 'The "Vampire" Cycle', numerals: "i – V7" },
        ],
      },
      {
        label: "Jazz Minor (Sophisticated)",
        scaleType: "harmonic_minor",
        progressions: [
          { name: "Minor 2-5-1", numerals: "ii° – V7 – i" },
          { name: "The Deceptive Minor", numerals: "i – bVI – ii° – V" },
          { name: "Minor Jazz Turnaround", numerals: "i – vi° – ii° – V" },
          { name: 'The "Blue Minor"', numerals: "im7 – IV7" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. MODAL & "VIBE" PROGRESSIONS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "modal",
    label: "Modal",
    scaleType: "dorian",
    subgroups: [
      {
        label: 'Dorian (The "Cool" Funk)',
        scaleType: "dorian",
        progressions: [
          { name: "The Santana Vamp", numerals: "im – IV" },
          { name: "Funk Foundation", numerals: "im – ii – IV" },
          { name: 'The "So What" Change', numerals: "im7 – iim7" },
        ],
      },
      {
        label: 'Mixolydian (The "Greasy" Rock/Soul)',
        scaleType: "mixolydian",
        progressions: [
          { name: "Classic Rocker", numerals: "I – bVII – IV" },
          { name: "The Southern Soul", numerals: "I – IV – bVII" },
          { name: 'The "Clocks" Loop', numerals: "I – v – ii" },
        ],
      },
      {
        label: 'Lydian (The "Ethereal" Dream)',
        scaleType: "lydian",
        progressions: [
          { name: "Floating Lydian", numerals: "I – II" },
          { name: "Space Cinematic", numerals: "I – II – IV – I" },
        ],
      },
      {
        label: 'Phrygian (The "Aggressive" Dark)',
        scaleType: "phrygian",
        progressions: [
          { name: "The Metal/Dark-Trap", numerals: "i – bII" },
          { name: 'The "Siren" Tension', numerals: "i – bII – i – bIII" },
        ],
      },
      {
        label: 'Locrian (The "Forbidden" / Unstable)',
        scaleType: "phrygian",
        progressions: [
          { name: "The Dark Abyss", numerals: "i° – bII" },
          { name: "Locrian Tension", numerals: "i° – bV – bII" },
          { name: "The Glitch Loop", numerals: "i° – IVm – bII" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. ADVANCED "CRASH OUT" & PASSING PROGRESSIONS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "advanced",
    label: "Advanced",
    scaleType: "major",
    subgroups: [
      {
        label: "Chromatic & Secondary Dominant Movement",
        progressions: [
          { name: "The Tritone Sub", numerals: "ii – bII7 – I" },
          { name: 'The "Backdoor" Exit', numerals: "iv – bVII – I" },
          { name: "Chromatic Walkdown", numerals: "I – bVII – VI – bVI" },
          { name: 'The "Secondary" Pull', numerals: "I – V/ii – ii – V" },
          { name: 'The "Coltrane" Mediant', numerals: "I – bVI – bIV" },
        ],
      },
    ],
  },
];
