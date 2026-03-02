# Harmony Hash

**A chord progression workbench for piano and guitar.**

Harmony Hash is a Tonari Labs web tool for building, visualizing, and exploring chord progressions. Whether you're working out a jazz standard, a neo-soul loop, or just trying to hear how a borrowed chord sits — Harmony Hash gives you the charts, the variants, and the theory context to move fast.

---

## What It Does

You give it chords. It shows you how to play them.

Input a progression by typing chords directly or choosing from a library of common progressions across major, minor, and modal contexts. Select your key, and the app renders chord charts for every chord in the sequence — guitar fingering diagrams with variant cycling, and a procedurally rendered piano keyboard showing exactly which keys to play and how they're voiced.

---

## Using Harmony Hash

### Free Input

Type chords separated by spaces in the input bar and hit **Run**.

```
Cmaj7 Dmin7 E7 F
Am9 D13 Dm9 G13sus4 Cmaj9 E7#9
```

Harmony Hash understands all common notation styles — `Cm7`, `Cmin7`, and `C-7` are the same chord. So are `E7#9`, `E7(#9)`, and `E7(♯9)`. Just write it how you think it.

### Progression Picker

Not sure where to start? Open the progression library and browse by category:

- **Major** — I V vi IV, ii V I, and other staples
- **Natural Minor** — Aeolian loops and variations
- **Harmonic Minor** — Classical tension progressions
- **Modal** — Dorian vamps, Mixolydian grooves, Lydian floats, and more

Pick a progression, then choose a key from the dropdown. The entire progression transposes instantly.

---

## Reading the Chord Cards

Each chord in your progression gets its own card.

### Guitar

Shows a fingering diagram (standard chord chart format). If a chord has multiple playable positions, use the **← →** arrows on the card to cycle through variants — open voicings, barre positions, jazz shapes, and more.

Hit **Randomize All** to have the app pick a random valid variant for every chord in the progression at once. Good for when you want to shake things up or find a voicing you wouldn't have reached for on your own.

### Piano

Shows a two-octave keyboard with the active notes highlighted. The app splits the voicing into left hand and right hand, and applies intelligent voicing based on the chord type — simpler chords get root position, and seventh chords and above get a Drop 2 voicing that spreads the sound out the way a trained pianist would.

### Switching Instruments

Use the **Guitar / Piano** toggle at the top to switch the view across all cards at once.

---

## Piano Voicing — Roadmap

The piano renderer ships with a foundation and grows in planned stages:

**v1 — Shipped**
Drop 2 voicing for seventh chords and above (the 2nd-highest note drops an octave, creating an open, spread sound). Root position for triads. Left/right hand split shown visually.

**v2 — Voice Leading**
Smooth voice leading between chords in a progression. The app will calculate the minimal movement between voicings — so instead of jumping position between every chord, the hands stay close and the progression flows. This is what separates a competent pianist from a musical one.

**v3 — Extended Voicing Styles**
Drop 3, rootless voicings (for playing over a bassist), and shell voicings (3rd + 7th only, no root or 5th). Each chord card will show a style selector so you can try them side by side.

**v4 — Interval Spacing & Spread Voicings**
9th/10th interval spacing for the wide, lush textures common in R&B, gospel, and neo-soul. Upper structure triads for dominant chords. Two-hand spread voicings that more closely reflect how pianists actually use the full range of the instrument.

**v5 — Playback**
Hear the progression. A lightweight synth renders the voiced chords in sequence so you can audition how the voice leading actually sounds before you sit down at the keys.

---

## About

Harmony Hash is part of the [Tonari Labs](https://tonari.ai) suite of music and creative tools.

`harmony.tonari.ai`
