# Keyplayer Performance Tutorial

This tutorial will take you from zero to playing multiple songs on your keyboard.

## Installation

1. Download `Keyplayer.zip` from [Releases](https://github.com/dolphinwesting248/Keyplayer/releases) and extract it
2. Open Chrome, type `chrome://extensions/` in the address bar and press Enter
3. Enable "Developer mode" in the top right corner, then click "Load unpacked"
4. Select the extracted folder. After installation, it's recommended to pin the extension to your toolbar

---

## Lesson 1 · Twinkle Twinkle Little Star — Getting to Know the Keyboard

Let's start with a song everyone knows. After installation, the default mode is **Silent**. Press `` ` `` (below Esc) to switch to **Play** mode.

The three rows of letter keys are your keyboard:

```
Row 1 (White keys)  Q W E R T Y U I O P
Row 2 (Black keys)  A S D F G H J K L
Row 3 (Low notes)   Z X C V B N M
```

Q is Middle C. To the right are D, E, F... Now let's play Twinkle Twinkle Little Star:

```
Q Q T T Y Y T

R R E E W W Q
```

Press Q twice, T twice, Y twice, T once—the first phrase is out. Then R R E E W W Q to finish.

You should notice: **normal typing is affected**—you can't fill in forms, type in input fields, etc. This is when you press `` ` `` to switch to **Hybrid** mode. Typing in input fields won't trigger notes, and playing resumes only after clicking on a blank area of the page. Switch between the two modes anytime with `` ` ``.

---

## Lesson 2 · Ode to Joy — Octave Shifting

The main melody of Ode to Joy has a wider range than Twinkle Twinkle Little Star, and some notes are beyond the default keyboard range. Press `[` to lower the octave and `]` to raise it. You can see the current offset value in the popup panel.

```
E E W T  T R E W  Q Q W E  E W W

E E W T  T R E W  Q Q W E  W Q Q
```

Play the first two phrases using the default octave first. If it sounds too low, press `]` to raise it an octave and try again—the same set of keys, but the pitch has changed.

Range reference: the keyboard covers C1 to G#7. Use `[` and `]` to move across three octaves. Use a higher octave for high melodies, and a lower octave for low bass chords.

---

## Lesson 3 · Canon — Sustain Pedal

Canon's chord progression requires spreading out notes one by one. If every note is short and disconnected, it will sound very dry. That's when you need the **sustain pedal**.

Hold down **Space**, and the notes you play will continue to sound even after releasing the keys. Brackets `( )` mean you hold Space while playing all the notes inside, releasing at `)`. Let's try the simplest Canon bass line:

```
( Q  T  Y  E  R  Q  R  T )
```

Use your left hand to hold Space, and your right hand to play Q, T, Y, E, R, Q, R, T in order. You'll notice that each note sustains and layers on top of each other—the harmony effect of four notes sounding simultaneously is the power of the pedal.

---

## Lesson 4 · The Moon Represents My Heart — Velocity Control

This song needs to be played softly, with occasional emphasis to express emotion. The `+` symbol means hold Shift while playing that note, doubling the velocity for a louder sound.

```
Q  E  T  +Y  T  E  Q
```

Play Q, E, T with normal velocity. On the fourth note, hold Shift and press Y—this note is noticeably louder, and the emotion comes through instantly. In actual performance, adding velocity to melodic peaks while keeping accompaniment notes normal creates a sense of layering.

The floating hint in the bottom right corner shows the cumulative velocity value, making it easy to confirm whether you're currently in velocity-enhanced mode.

---

## Lesson 5 · Switching Instruments — Guitar, Bass & Organ

Piano is great, but some songs only come to life with a different tone. The popup panel shows the current instrument list, which comes with 7 built-in sounds:

| Instrument      | Characteristics                      |
| --------------- | ------------------------------------ |
| Piano           | Multi-layered sampling, widest range |
| Guitar          | Warm acoustic guitar                 |
| Electric Guitar | Bright, clean electric sound         |
| Bass            | Dedicated low-end                    |
| Saxophone       | Smooth, silky wind instrument        |
| Organ           | Church pipe organ                    |
| Chip            | 8-bit square wave synthesizer        |

Shortcuts:

| Key       | Action                          |
| --------- | ------------------------------- |
| `1` ~ `9` | Directly select instruments 1–9 |
| `;`       | Cycle to the next instrument    |

Click **+** to freely add or remove instruments from the list. Press `1` for piano, `2` for guitar, `3` for electric guitar... the first 9 instruments all have number shortcuts.

Practice a bass line—press `4` to switch to bass and play:

```
Z  B  N  V
```

The deep bass line and the piano melody from earlier are two completely different feelings.

---

## Lesson 6 · Recording & Exporting

Now you can play complete songs. Press `'` (the apostrophe key) to start recording, play what you want to record, then press `'` again to stop. A popup will prompt you to export as a MIDI or JSON file.

Recording automatically trims silence at the beginning and end, so you don't have to worry about extra quiet at the start or finish.

---

## Lesson 7 · Song Playback

You can also import songs written by others for playback. Open the popup panel and switch to the **Songs** tab:

- Click **+ JSON** to import a `.json` song file
- Click **+ MIDI** to import a `.mid` file
- Click the play button to start automatic playback
- Click again to pause. The progress bar lets you check your position at any time

After pausing, playback resumes from where you left off. Different notes in the same song can specify different instruments—

```json
{ "s": -20, "t": 0,   "d": 600, "i": "bass" },
{ "s": 0,   "t": 0,   "d": 600, "i": "guitar" },
{ "s": 7,   "t": 600, "d": 400, "i": "organ" }
```

Bass laying the foundation, guitar for rhythm, organ for melody—three tones in one song, switching automatically. Want to write your own songs? See [song-guide-en.md](./song-guide-en.md)

---

## Lesson 8 · Reverb

Press `\` to turn on reverb, then play any of the songs you've learned—the sound moves from a dry room into a concert hall. The reverb simulates spatial reflections using 4 delay lines + a low-pass filter, with the most noticeable effect on piano and organ.

In the popup panel, you can adjust reverb intensity (0%–100%). The `\` shortcut toggles between on and off.

---

## Lesson 9 · Canon — Putting It All Together

Now combine all the techniques you've learned and perform Pachelbel's Canon in full. Use the piano sound throughout, and first press `\` to turn on reverb.

**Bass line** (using bass sound):

Canon's bass is an 8-note repeating loop. Let each note sustain and layer—step on the pedal:

```
( Z  B  N  V  X  Z  X  B )
```

Hold Space with your left hand. With your right hand, play Z, B, N, V, X, Z, X, B in sequence. All eight notes ring out—this is the foundation of Canon.

Switch back to piano. Repeat the bass line twice on piano, adding velocity variation—accent the first note of each measure:

```
( +Z  B  N  V  +X  Z  X  B )
( +Z  B  N  V  +X  Z  X  B )
```

Hold Space through both repetitions, and only hold Shift at the `+` marks to emphasize the bass downbeats.

**Chord section** (keep piano, Space held):

Layer the melodic skeleton over the chord progression. Play in groups of three notes—first group normal, end of the second group accented:

```
( Q W E   W E +R   E R T   R T +Y
  T Y U   Y U I   U I O   I O P
  T Y +U  Y U +I  U I O   I O +P )
```

Still hold the pedal when reaching the high register. The final four chords close with accented power.

**Ending** (release Space):

```
Q   E   T   +Y
```

Release everything. Just listen as the final chord fades away in the reverb.

---

The entire piece uses every technique you've learned: octave selection, pedal layering, velocity dynamics, instrument switching, and reverb polishing. Start recording (press `'`), play through the whole thing, and export your very first Canon recording.

---

## Appendix · Sheet Music Notation

| Symbol        | Meaning                                                      |
| ------------- | ------------------------------------------------------------ |
| `Q`           | Press the Q key directly                                     |
| `( Q  W  E )` | Hold Space and play all notes inside the brackets; release at `)` |
| `+Q`          | Hold Shift while pressing Q; velocity doubled                |
| `( +Q  W )`   | Hold Space and Shift simultaneously, play Q (accent); release Shift, play W; release Space at `)` |

## Appendix · Shortcut Quick Reference

| Key          | Function                             |
| ------------ | ------------------------------------ |
| `` ` ``      | Switch mode (Play / Hybrid / Silent) |
| `-` `=`      | Volume down / up                     |
| `[` `]`      | Octave down / up                     |
| `1` ~ `9`    | Direct instrument selection          |
| `;`          | Cycle instrument                     |
| `\`          | Toggle reverb on/off                 |
| `'`          | Start / Stop recording               |
| Space (hold) | Sustain pedal                        |
| Shift (hold) | Velocity boost                       |