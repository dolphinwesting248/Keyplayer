# Song Writing Guide

## File Format

Songs are JSON files with the following structure:

```json
{
  "title": "My Song",
  "bpm": 120,
  "octave": 0,
  "notes": [
    { "s": 0,  "t": 0,    "d": 500 },
    { "s": 4,  "t": 500,  "d": 500 },
    { "s": 7,  "t": 1000, "d": 500 }
  ]
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Song name displayed in the floating hint during playback |
| `bpm` | number | Beats per minute (reference only, does not affect playback timing) |
| `octave` | number | Global octave offset (-3 to +3). Each ±1 shifts all notes by 12 semitones |
| `notes` | array | Array of note objects |

### Note Object

| Field | Description |
|-------|-------------|
| `s` | Semitone offset relative to C4. See reference table below |
| `t` | Start time in milliseconds from the beginning of the song |
| `d` | Duration in milliseconds. The note stops at `t + d` |
| `i` | *(optional)* Instrument ID for this note. Supported values: `piano`, `chip`, `guitar`, `eguitar`, `bass`, `sax`, `organ`. If omitted, uses the default instrument |

## Semitone Reference

### Row 1 — White Keys

| Key | Note | `s` |
|-----|------|-----|
| Q | C4 | 0 |
| W | D4 | 2 |
| E | E4 | 4 |
| R | F4 | 5 |
| T | G4 | 7 |
| Y | A4 | 9 |
| U | B4 | 11 |
| I | C5 | 12 |
| O | D5 | 14 |
| P | E5 | 16 |

### Row 2 — Black Keys

| Key | Note | `s` |
|-----|------|-----|
| A | C#4 | 1 |
| S | D#4 | 3 |
| D | F#4 | 6 |
| F | G#4 | 8 |
| G | A#4 | 10 |
| H | C#5 | 13 |
| J | D#5 | 15 |
| K | F#5 | 18 |
| L | G#5 | 20 |

### Row 3 — Lower Octave

| Key | Note | `s` |
|-----|------|-----|
| Z | C3 | -12 |
| X | D3 | -10 |
| C | E3 | -8 |
| V | F3 | -7 |
| B | G3 | -5 |
| N | A3 | -3 |
| M | B3 | -1 |

## Writing Tips

### Timing

At 120 BPM, one beat = 500ms. Use multiples:

| Note | Duration |
|------|----------|
| Quarter note | 500ms |
| Eighth note | 250ms |
| Half note | 1000ms |
| Whole note | 2000ms |

The `t` field of each note is the cumulative sum of previous note durations. Example quarter-note sequence:

```json
{ "s": 0, "t": 0,    "d": 500 },
{ "s": 2, "t": 500,  "d": 500 },
{ "s": 4, "t": 1000, "d": 500 }
```

### Chords

Set the same `t` value for multiple notes to play them simultaneously:

```json
{ "s": 0, "t": 1000, "d": 800 },
{ "s": 4, "t": 1000, "d": 800 },
{ "s": 7, "t": 1000, "d": 800 }
```

### Common Chord Formulas

Given a root note with semitone `s`:

| Chord Type | Semitones |
|------------|-----------|
| Major | `s`, `s+4`, `s+7` |
| Minor | `s`, `s+3`, `s+7` |
| Sus4 | `s`, `s+5`, `s+7` |
| Major 7th | `s`, `s+4`, `s+7`, `s+11` |
| Minor 7th | `s`, `s+3`, `s+7`, `s+10` |

Example C Major: `s=0` → notes `{0, 4, 7}` = C-E-G.

### Common Chord Progressions

- **Canon progression:** `0 → 9 → 11 → 6 → 7 → 0 → 7 → 9`
- **I-V-vi-IV:** `0 → 7 → 9 → 5`
- **12-bar blues (in C):** `0 (4 bars) → 5 (2 bars) → 0 (2 bars) → 7 (1 bar) → 5 (1 bar) → 0 (2 bars)`

### Octave

Use the `octave` field to shift all notes without editing individual `s` values:

- `"octave": -1` — one octave lower
- `"octave": 1`  — one octave higher

### Silence

Leave a time gap between consecutive `t + d` and the next `t`:

```json
{ "s": 0, "t": 0,    "d": 500 },
{ "s": 2, "t": 800,  "d": 500 }
```

`t + d = 500`, next `t = 800` — there is a 300ms rest between them.

### Notes

- Each note receives an auto-generated ID (`song_0`, `song_1`, ...). Notes with the same ID cannot overlap in time
- Chords are achieved by placing multiple note entries with the same `t` — no manual ID management needed
- The `i` field assigns a specific instrument to a note. When switching instruments between notes, the player auto-loads the required samples before playing

## Full Example

```json
{
  "title": "C Major Arpeggio",
  "bpm": 100,
  "octave": 0,
  "notes": [
    { "s": 0,  "t": 0,    "d": 600 },
    { "s": 4,  "t": 600,  "d": 600 },
    { "s": 7,  "t": 1200, "d": 600 },
    { "s": 12, "t": 1800, "d": 1200 },
    { "s": 0,  "t": 0,    "d": 600 },
    { "s": 4,  "t": 0,    "d": 600 },
    { "s": 7,  "t": 0,    "d": 600 }
  ]
}
```

The first four notes are an ascending arpeggio (C → E → G → C). The last three start together as a final chord.
