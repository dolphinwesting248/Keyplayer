<div>
  <a style="color: blue" href="./docs/README-zh.md">中文</a> | <a>English</a>
</div>

# Keyplayer

A browser extension that turns your keyboard into a musical instrument. Beyond typing, let your keyboard make sound for you.

## Installation

1. Download `Keyplayer.zip` from [Releases](https://github.com/dolphinwesting248/Keyplayer/releases) and unzip
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" and click "Load unpacked"
4. Select the unzipped directory

## Playing

Three rows of letter keys cover C1 to G#7, with `[` `]` to switch octaves:

| Row | Keys | Range |
|-----|------|-------|
| First row (white keys) | Q W E R T Y U I O P | C4 ~ E5 |
| Second row (black keys) | A S D F G H J K L | C#4 ~ G#5 |
| Third row (lower octave) | Z X C V B N M | C3 ~ B3 |

## Modes

| Mode | Description |
|------|-------------|
| **Play** | Full keyboard performance, all keys trigger notes |
| **Hybrid** | Auto-detects input fields — no trigger while typing, plays freely elsewhere |
| **Silent** | Disables keyboard performance, background functions only |

## Shortcuts

| Key | Function |
|-----|----------|
| `` ` `` | Switch mode |
| `-` `=` | Decrease / Increase volume |
| `[` `]` | Lower / Raise octave |
| `\` | Toggle reverb |
| `;` | Cycle through instruments |
| `1` ~ `9` | Directly select instruments 1–9 from the list |
| `'` | Start / Stop recording |
| Space | Sustain pedal |
| Shift | Velocity boost |

## Instruments

A variety of built-in instrument sounds, freely combinable and manageable:

- **Piano** — 7-layer samples, covering C1 ~ C7
- **Guitar** — 5-layer samples, covering C2 ~ C6
- **Electric Guitar** — 3-layer samples, covering C2 ~ C5
- **Bass** — 2-layer samples, covering C2 ~ C3
- **Saxophone** — 4-layer samples, covering C3 ~ C6
- **Organ** — 5-layer samples, covering C2 ~ C6
- **Chip** — Synthesized square wave, no sample loading required

Add or remove instruments freely in the popup panel. Keys `1` through `9` correspond to the first 9 instruments in the list.

## Song Playback

Supports importing JSON and MIDI song files for automatic playback.

### JSON Format

```json
{
  "title": "Song",
  "bpm": 120,
  "octave": 0,
  "notes": [
    { "s": 0, "t": 0,    "d": 500 },
    { "s": 4, "t": 500,  "d": 500 },
    { "s": 7, "t": 1000, "d": 500 }
  ]
}
```

> See [song-guide-en.md](./song-guide-en.md) for details

### Per-Note Instrument

Each note can specify an instrument individually via the `i` field, allowing different voices for different ranges within the same song:

```json
{ "s": -20, "t": 0, "d": 500, "i": "bass" },
{ "s": 0,   "t": 0, "d": 500, "i": "guitar" }
```

## Recording

Press `'` to start recording, press again to stop. Recordings are automatically trimmed of leading and trailing silence and can be exported as MIDI files.

## Reverb

Built-in Feedback Delay Network (FDN) reverb effect, featuring 4 delay lines with low-pass filters. Toggle with `\`.

## Development

```bash
npm install        # Install dependencies
npm run dev        # Development mode (hot reload)
npm run build      # Production build
npm run package    # Package as .zip
```

### Tech Stack

- [Plasmo](https://www.plasmo.com/) — Browser extension framework
- React 19 + TypeScript
- Web Audio API — Audio engine

## License

MIT
