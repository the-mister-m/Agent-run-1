# SPEC — WAVE SYNTH PORT: THE SYNTH LAB ENGINE AS A SEPARATE TOOL

Written 2026-09-08 — session agent (Fable), from [SPEC-synth-recon.md](SPEC-synth-recon.md)
(verdict: port the design, rewrite the code), Brandon's rulings 2026-09-08, and a grep of
every file that names the current Wave Synth. Runs as one Opus loop. Gate: ruled, see §3.

## 1 · WHAT EXISTS

**Synth Lab/** — Vite + React + TypeScript + Tone.js. Builds clean. Per-voice graph in
[Synth Lab/src/engine/voice.ts](../../Synth%20Lab/src/engine/voice.ts): OSC1/OSC2 →
per-osc level → one biquad filter (shared controls, per-voice node) → amp. ENV1/ENV2 and
LFO1/LFO2 feed a 24-slot mod matrix
([engine/mod-matrix.ts](../../Synth%20Lab/src/engine/mod-matrix.ts)) with six
destinations: osc1 detune, osc2 detune, filter detune, amp gain, osc1 pulse width, osc2
pulse width. Eight-voice pool, steal-oldest, 0.5 s release-tail free
([engine/voice-manager.ts](../../Synth%20Lab/src/engine/voice-manager.ts)). Mono mode
uses the same pool with one active voice. Patch object is the single source of truth;
knobs call `setParam(path, value)`, the engine consumes.

**This repo's instrument shape** — read from
[src/instruments/wave-synth.js](../../src/instruments/wave-synth.js) :456–560 and its
header: `static id`, `static label`, `static pieces = null`, `constructor(ctx, out)`,
`noteOn(note, velocity, atTime)`, `noteOff(note, atTime)`, `allNotesOff()`,
`getAnalyser('spectrum'|'scope')` (exactly one non-null), `mountCompact(el)` /
`mountExpanded(el)`, `getState()` / `setState()`, `dispose()`, `cpuWeight` per voice.
Voices go through the shared `voicePool` and `governor` in core/audio.js — `register` on
trigger, `release` from `free()`, `steal()` when the governor refuses. Release reads the
live envelope through `_gainAt(t)` (:195), never a stale `gain.value`.

**Where the name lives** — 21 files reference `wave-synth`, `Wave Synth`, or `WaveSynth`
in code (51 code lines, comments excluded). The ones that matter for §2c:

| File | What |
|---|---|
| src/instruments/wave-synth.js :456–457 | `static id = 'wave-synth'`, `static label = 'Wave Synth'` |
| src/core/tracks.js :44 | `'wave-synth': 'pitched'` kind map |
| src/ui/daw-shell.js :41 | `'wave-synth': WaveSynth` instrument map |
| src/ui/arrangement.js :19 | `{ value: 'wave-synth', label: 'Wave Synth' }` lane picker |
| src/ui/shell.js :63 | TOOLS row, `href: 'wave-synth.html'`, `split: true` |
| tools/desktop/wave-synth.html, tools/mobile/wave-synth.html | the pages |
| tools/desktop/sound-lab.html | instrument picker button |
| tools/desktop/dev-splash.html, dev-test.html | dev pages |
| desktop.html, mobile.html | nav cards |
| src/vis/scope.js, spectrum.js, core/audio.js, drum-synth.js, overtone-synth.js, harmony pages | mentions, mostly comments — grep decides each |

## 2 · THE CHANGE

### 2a · The rename, first

Today's Wave Synth becomes **Simple Synth**. Every row in the table above, plus every
comment that names it, moves: id `'simple-synth'`, label `Simple Synth`, class
`SimpleSynth`, file `simple-synth.js`, pages `simple-synth.html` in both folders, TOOLS
row, kind map, instrument map, lane picker, sound-lab button, nav cards. `git mv` for
files. Then a repo-wide grep for the old strings returns only docs/ and Archive/. Saved
DAW state that carries `instrumentType: 'wave-synth'` maps to `'simple-synth'` on load —
one line in tracks.js `setInstrumentType`, said in the receipt.

The name **Wave Synth** and id `'wave-synth'` are then free for the new instrument.

### 2b · The engine — src/instruments/wave-synth.js, new file

Plain ES module, raw Web Audio, no Tone.js, no build step. The Synth Lab design, this
repo's contract.

**Voice.** One per note-on, built by the instrument like Simple Synth does, not pooled up
front — the shared `voicePool`/`governor` is the pool. Per voice:

- OSC1, OSC2: `OscillatorNode` for sine/tri/saw/square. Pulse: two saws phase-offset and
  subtracted through a `GainNode` of −1, the offset driven by a `DelayNode` whose
  `delayTime` is the pulse width × period. No `AudioWorklet` in the first cut.
- Per-osc level `GainNode` → one `BiquadFilterNode` (lowpass/highpass/bandpass, Q) → amp
  `GainNode` → `createVoiceOut(WaveSynth.id, mixGain)`.
- ENV1 (amp) and ENV2 (assignable): hand-built ADSR on `GainNode`/`AudioParam` ramps,
  the `_gainAt(t)` pattern from Simple Synth — release and steal read the live scheduled
  value. ENV2 drives its destinations through a `ConstantSourceNode` × amount gain.
- LFO1, LFO2: `OscillatorNode` at LFO rate → amount `GainNode` → destination `AudioParam`.
  Shapes: sine, tri, square, saw. Rate in Hz; tempo sync deferred.
- Mod matrix: four sources (ENV2, LFO1, LFO2, velocity) × six destinations (osc1 detune,
  osc2 detune, filter frequency, amp gain, osc1 pw, osc2 pw), each a bipolar amount. A
  source connects to a destination's `AudioParam` through one `GainNode` per slot; amount
  0 leaves the node connected at gain 0. 24 gain nodes per voice is the cost; `cpuWeight`
  says so.

**Brandon's three, ruled in:**

- **Voices.** Polyphony through the shared pool, cap 8 per instrument on top of the
  governor's 32 — `noteOn` steals this instrument's oldest voice when it holds 8. Mono
  mode: one voice, legato retrigger keeps the envelope.
- **Unison.** 1, 2, 4 stacked voices per note, spread across a detune width and a stereo
  width. Each stacked voice is a real Voice through the pool, so unison 4 × chord 4 = 16
  registered voices — the cap and the governor both see it. Level compensates by
  `1/√n`.
- **Detune.** Per-osc fine (±50 ¢) and coarse (±24 semitones) plus the unison spread.
  All on `OscillatorNode.detune`.

**Facade.** `static id = 'wave-synth'`, `static label = 'Wave Synth'`, `static pieces =
null`, `cpuWeight`, `getAnalyser('spectrum')` (scope null), `getState()`/`setState()` on
a flat patch object, `dispose()`. `noteOn`/`noteOff`/`allNotesOff` exactly as Simple
Synth. `mountCompact`/`mountExpanded` per §2d.

### 2c · The pages

tools/desktop/wave-synth.html and tools/mobile/wave-synth.html, on `mountStandaloneTool`
with `layout` set, the way Simple Synth's pages are. TOOLS row: `{ id: 'wave-synth',
label: 'Wave Synth', href: 'wave-synth.html', split: true }` after Simple Synth. Nav
cards on both navs. Sound Lab picker gains a third button. DAW picker (arrangement.js
INSTRUMENT_OPTIONS, daw-shell.js map, tracks.js kind map) gains the row; Simple Synth
stays beside it.

### 2d · The panel

Hand-built DOM, tokens.css only, Synth Lab's layout as the reference
([Synth Lab/src/components/](../../Synth%20Lab/src/components/) and the screenshot at the
repo root `Screenshot 2026-09-07 at 10.17.13 PM.png`). Sections left to right in
expanded: OSC1 · OSC2 · FILTER · ENV1 · ENV2 · LFO1 · LFO2 · MOD · VOICE (poly/mono,
unison count, spread, width) · master level. Knobs are the repo's existing knob element
if one exists in src/ui/; grep first. If none, `<input type="range">` styled on tokens —
no new knob widget in this job. Compact: OSC1 wave, filter cutoff, ENV1 ADSR, unison, in
one row. Every value writes the patch object and the patch object writes the voices,
live, including voices mid-note (`setParam` walks live voices the way Synth Lab's
VoiceManager does).

### 2e · The test — Brandon's words: "open it up and test it and look at it and resize it"

Playwright, headed, slowMo, Brandon watching. Both pages.

1. Load desktop at 1366×768, screenshot. Load mobile at 390×844, screenshot.
2. Resize desktop through 1024, 1280, 1366, 1600, 1920 wide; screenshot each; nothing
   overflows the shell, no horizontal scroll on the page body.
3. Mobile: scroll to the keyboard, screenshot; every knob reachable, tap targets at
   `--tap-min`.
4. Home row: press and hold a chord of four, read `voicePool.count` — expect 4 at
   unison 1, 8 at unison 2, 16 at unison 4. Release, expect 0 within release + 0.5 s.
5. Poly cap: nine notes at unison 1, expect count 8 and the first note gone.
6. Every knob: drag through its range while a note holds; zero console errors; the
   patch object matches the knob.
7. Mono mode: two overlapping notes, one voice, pitch follows the newest.
8. Pulse width at 0.1, 0.5, 0.9 with the spectrum analyser open, screenshots — the
   harmonic pattern changes. Not a sound claim; a picture.
9. DAW: add a track, assign Wave Synth, play from the panel keyboard, screenshot.
10. Simple Synth pages and DAW row still load and play the same, screenshot.

Counts and pictures in the receipt. No sound claim. Brandon listens.

## 3 · RULED — Brandon, 2026-09-08

- Voices, unison, detune in the first cut. Mod matrix in the first cut. Pulse width in
  the first cut, two-saw method.
- The rename: old one is Simple Synth, new one is Wave Synth. Same DAW picker, both rows.
- Opus. Tight spec. Agent opens it, tests it, looks at it, resizes it. Brandon watches.
- Deferred, stated: tempo-synced LFO, AudioWorklet PWM, preset bank, a knob widget.

## 4 · CHECKLIST

§2e is the checklist. Plus:

- [ ] Repo-wide grep for `wave-synth`/`WaveSynth`/`Wave Synth` hits only the new
      instrument, docs/, and Archive/
- [ ] `simple-synth` everywhere the old one was; both navs, both folders, TOOLS, DAW
- [ ] ESM parse of every touched .js and every touched page's module block
- [ ] receipt with the ten test rows, screenshots linked

## 5 · THE JOB

Opus — ≈250k. Files: src/instruments/wave-synth.js (new), src/instruments/simple-synth.js
(renamed), four tool pages (two renamed, two new), shell.js TOOLS, tracks.js, daw-shell.js,
arrangement.js, sound-lab.html, desktop.html, mobile.html, tokens.css (whatever the panel
needs, named in the receipt). Blast radius: the rename touches the DAW's instrument map and
every nav — do it first and grep-verify before writing the new engine. Drift risk high: the
pull is to port Tone.js idioms and to build a knob widget. Gap risk medium: PWM by
delay-offset saws detunes slightly at high pitch; the spectrum shot at step 8 shows it,
the receipt says so, a worklet is the later fix.
