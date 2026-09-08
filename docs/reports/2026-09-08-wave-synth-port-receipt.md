# SESSION REVIEW — Chromebook DAW / wave-synth-port — 2026-09-08 [timestamps: ask Brandon]

Opus loop, [SPEC-wave-synth-port.md](../mapdocs/SPEC-wave-synth-port.md). ORDER A (rename),
B (engine), C (pages and pickers), D (panel) done. ORDER E (the ten-row test) **not run** —
Brandon reassigned it to a separate sonnet mid-run. See TEST HANDOFF.

## EDITS

**Renamed — old Wave Synth is now Simple Synth**

- [src/instruments/simple-synth.js](../../src/instruments/simple-synth.js) — `git mv` from
  `wave-synth.js`. `id: 'simple-synth'`, `label: 'Simple Synth'`, class `SimpleSynth`, style
  tag id `simple-synth-styles`, panel title, warn string. Behaviour untouched. Every comment
  in the file rewritten to label form. CSS class prefix stays `ws-` on purpose — `tokens.css`
  `--anim-pulse` names the `ws-pulse` keyframe, so renaming the prefix would break that token.
- [tools/desktop/simple-synth.html](../../tools/desktop/simple-synth.html) — `git mv`
- [tools/mobile/simple-synth.html](../../tools/mobile/simple-synth.html) — plain `mv`,
  `tools/mobile/` is untracked
- [src/ui/shell.js](../../src/ui/shell.js) — TOOLS row → `simple-synth`; header and two
  comment blocks
- [src/ui/daw-shell.js](../../src/ui/daw-shell.js) — import and `INSTRUMENTS` map key
- [src/ui/arrangement.js](../../src/ui/arrangement.js) — `INSTRUMENT_OPTIONS` only
- [src/core/tracks.js](../../src/core/tracks.js) — `INSTRUMENT_KIND` map
- [src/core/audio.js](../../src/core/audio.js) — one comment
- [src/instruments/overtone-synth.js](../../src/instruments/overtone-synth.js) — 9 comments
- [src/instruments/drum-synth.js](../../src/instruments/drum-synth.js) — 7 comments
- [src/vis/spectrum.js](../../src/vis/spectrum.js) · [src/vis/scope.js](../../src/vis/scope.js)
  — header comments and one thrown-error string, reworded to name the tap, not a tool
- [tools/desktop/sound-lab.html](../../tools/desktop/sound-lab.html) — button `pickWave` →
  `pickSimple`, import, both call sites
- [tools/desktop/harmony.html](../../tools/desktop/harmony.html) ·
  [tools/mobile/harmony.html](../../tools/mobile/harmony.html) — import and three refs each
- [tools/desktop/overtone-synth.html](../../tools/desktop/overtone-synth.html) ·
  [tools/mobile/overtone-synth.html](../../tools/mobile/overtone-synth.html) — one comment each
- [tools/desktop/dev-splash.html](../../tools/desktop/dev-splash.html) — import,
  `instrumentPiece` row, token-map key
- [desktop.html](../../desktop.html) · [mobile.html](../../mobile.html) — nav card
- [Builddocs/P1-tone-tool/S3-voices-surfaces/test-wave-voice.html](../../Builddocs/P1-tone-tool/S3-voices-surfaces/test-wave-voice.html)
  · [keys-input-donecheck.html](../../Builddocs/P1-tone-tool/S3-voices-surfaces/keys-input-donecheck.html)
  — the only two Builddocs harnesses that `import` the instrument; renamed so they still run

**New**

- [src/instruments/wave-synth.js](../../src/instruments/wave-synth.js) — the new engine
- [src/ui/knob.js](../../src/ui/knob.js) — the rotary knob element, exported for reuse
- [tools/desktop/wave-synth.html](../../tools/desktop/wave-synth.html) ·
  [tools/mobile/wave-synth.html](../../tools/mobile/wave-synth.html)

**Wired**

- [src/ui/shell.js](../../src/ui/shell.js) — TOOLS row `wave-synth`, after Simple Synth
- [src/ui/daw-shell.js](../../src/ui/daw-shell.js) — `'wave-synth': WaveSynth`
- [src/ui/arrangement.js](../../src/ui/arrangement.js) — `INSTRUMENT_OPTIONS` row
- [src/core/tracks.js](../../src/core/tracks.js) — `'wave-synth': 'pitched'`
- [tools/desktop/sound-lab.html](../../tools/desktop/sound-lab.html) — third picker button
- [desktop.html](../../desktop.html) · [mobile.html](../../mobile.html) — nav card
- [src/ui/tokens.css](../../src/ui/tokens.css) — three tokens, listed below

## TOKENS ADDED

Three, each in its existing family and naming pattern:

- `--ov-auto: auto;` — overflow family, next to `--ov-hidden`/`--ov-visible`
- `--cap-round: round;` — line family, above `--line-dashed`; SVG `stroke-linecap` for the knob
- `--stroke-arc: calc(var(--stroke-w) * 3.5);` — stroke family, after `--stroke-heavy`;
  the knob's value-arc weight

No colour token added. The knob reads the existing `--knob-track` / `--knob-fill` /
`--knob-pointer` trio that was already in tokens.css and previously unused outside `eq.js`.

## RENAME GREP

```
$ grep -rnE "wave-synth|WaveSynth|Wave Synth" src tools desktop.html mobile.html index.html
  src/ui/daw-shell.js:22:import WaveSynth from '../instruments/wave-synth.js';
  src/ui/daw-shell.js:43:  'wave-synth': WaveSynth,
  src/ui/shell.js:10: * Owns: this file and the pages it mounts — simple-synth.html, wave-synth.html and
  src/ui/shell.js:63:  { id: 'wave-synth', label: 'Wave Synth', href: 'wave-synth.html', ... }
  src/ui/arrangement.js:19:  { value: 'wave-synth', label: 'Wave Synth' },
  src/core/tracks.js:45:  'wave-synth': 'pitched',
  src/instruments/wave-synth.js:  (18 lines — the new engine itself)
  tools/desktop/sound-lab.html:126,207,256
  tools/desktop/wave-synth.html:  (7 lines — the new page)
  tools/mobile/wave-synth.html:   (7 lines — the new page)
  mobile.html:57 · desktop.html:58  (nav cards)
```

Every hit is the **new** instrument. After ORDER A and before ORDER B the same grep returned
**0 hits** in `src/`, `tools/`, `desktop.html`, `mobile.html` — the A gate, checked headed.

Outside that tree the old strings survive in `docs/`, `Archive/`, `Synth Lab/`, and
`Builddocs/` (244 hits, all `.md` receipts plus four stale `.py` sweep scripts that already
pointed at `tools/wave-synth.html`, a path deleted at the L2 split). Those are archival and
were left alone; the two Builddocs harnesses that actually import the module were renamed.

## COMMENT GREP

```
$ grep -cE "so that|instead of| must |must be|never|§|CONTRACTS|Brandon|redpen|seat |20[0-9][0-9]-[0-9][0-9]" <each authored file>
0  src/instruments/simple-synth.js
0  src/instruments/wave-synth.js
0  src/ui/knob.js
0  tools/desktop/wave-synth.html
0  tools/mobile/wave-synth.html
0  tools/desktop/simple-synth.html
0  tools/mobile/simple-synth.html
TOTAL VIOLATIONS = 0
```

Backticks inside template strings in the two new `.js` files: **0** (both build DOM with
`createElement`, and their stylesheets are arrays of single-quoted strings joined with `\n`).

Added lines in the shared files were diffed against the last commit and checked one by one;
one violation of mine was found and fixed (`simple-synth.js` `_reflectActivity`, "never
animates" → "stays still"). The remaining matches in that diff belong to pre-existing code
or to the other agent's in-flight work, not to lines I authored.

## VERIFY

**ESM parse** — every touched `.js` copied to `docs/scratchpad/wave-synth-port/*.mjs` and
`node --check`ed; every touched page's `<script type="module">` block extracted and checked
the same way. **22 of 22 PASS**, 0 fail. `tokens.css` braces balanced.

**Headed loads**, Chromium visible, `slowMo: 300`, `--autoplay-policy=no-user-gesture-required`:

| Page | pageerrors | shot |
|---|---|---|
| tools/desktop/simple-synth.html | 0 | [A-01](wave-synth-port-shots/A-01.png) |
| tools/mobile/simple-synth.html | 0 | [A-02](wave-synth-port-shots/A-02.png) |
| desktop.html | 0 | [A-03](wave-synth-port-shots/A-03.png) |
| mobile.html | 0 | [A-04](wave-synth-port-shots/A-04.png) |
| tools/desktop/sound-lab.html | 0 | [A-05](wave-synth-port-shots/A-05.png) |
| tools/desktop/harmony.html | 0 | [A-06](wave-synth-port-shots/A-06.png) |
| tools/daw.html | 0 | [A-07](wave-synth-port-shots/A-07.png) |
| tools/desktop/wave-synth.html, faders | 0 | [B-01](wave-synth-port-shots/B-01.png) |
| tools/mobile/wave-synth.html, faders | 0 | [B-02](wave-synth-port-shots/B-02.png) |
| tools/desktop/wave-synth.html, dials | 0 | [C-01](wave-synth-port-shots/C-01.png) |
| tools/mobile/wave-synth.html, dials | 0 | [C-02](wave-synth-port-shots/C-02.png) |

One 404 fires on whichever page is opened first in a browser context; an isolated re-load
with a `response`/`requestfailed` listener captured **no** failing URL, so it is the
context's own favicon probe, not a page resource. Zero pageerrors everywhere.

**Counts from the partial run** — the ten-row script was cancelled mid-flight on Brandon's
instruction, but rows 1–8 had already returned against the *fader* build of the panel. Those
numbers are recorded here as prior evidence, not as the ten-row result. The sonnet re-runs
all ten against the *dial* build.

| Row | Result |
|---|---|
| 1 | desktop 1366×768 and mobile 390×844 loaded, 0 errors |
| 2 | 1024 / 1280 / 1366 / 1600 / 1920 — body overflow 0px, doc overflow 0px at every width |
| 3 | mobile doc overflow 0px; `--tap-min` read NaN (the probe read the raw `var()` chain — fixed in the script since) |
| 4 | unison 1 → `voicePool.count` **4**; unison 2 → **8**; unison 4 → **16**; after release **0** each time |
| 5 | nine notes at unison 1 → count **8**, held notes `[61…68]`, note 60 gone |
| 6 | 56 controls, 271 positions set, **0** patch mismatches, 0 console errors |
| 7 | mono: 1 voice after note 1, **1** after the overlapping note, held note 67, voice freq **392 Hz** |
| 8 | pulse width 0.1 / 0.5 / 0.9 captured with the spectrum running |
| 9 | **not reached** — the script used `tracks.list()`, which does not exist; the API is `tracks.all`. Fixed in the script, never re-run |
| 10 | **not reached** |

No sound, click or clip is claimed anywhere in this receipt.

## SHOTS

[docs/reports/wave-synth-port-shots/](wave-synth-port-shots/) — A-01…A-07 (post-rename load
sweep), B-01…B-02 (new pages, fader build), C-01…C-02 (new pages, dial build), T01…T15 (the
partial row run, fader build).

## STRAY FILES

- [docs/scratchpad/wave-synth-port/](../scratchpad/wave-synth-port/) — the harness:
  `loadcheck.mjs` (headed load sweep), `test-wave-synth.mjs` (the ten rows, rows 9 and 3
  fixed but never re-run), and ~22 `*.mjs` parse copies of the touched files. Throwaway.
- T01…T15 in the shots folder are from the fader build and are superseded by whatever the
  sonnet captures.

## GOALS DONE

- ORDER A — the rename, grep-verified at 0 live-code hits before any new code was written
- ORDER B — the new engine: shared `voicePool`/`governor`, unison as real voices, hand-built
  ADSR with the live-value release seam, LFOs on `OscillatorNode`, 24-slot mod matrix as gain
  nodes, two-saw PWM, facade matching Simple Synth method for method
- ORDER C — two pages, TOOLS row, both navs, sound-lab button, DAW picker in all three maps
- ORDER D — the panel, then rebuilt on Brandon's dial ruling: `src/ui/knob.js` plus faders
  for the eight envelope stages

## BRANDON'S TODOS

1. **The `setInstrumentType` legacy remap is not written, and I think the spec is wrong
   here.** SPEC §2a says saved state carrying `instrumentType: 'wave-synth'` should map to
   `'simple-synth'` on load. After ORDER B, `'wave-synth'` is the new engine's live id — that
   one line would make the new Wave Synth unselectable in the DAW, silently swapping it for
   Simple Synth every time. I left it out rather than guess. Old saved projects will therefore
   open their old Wave Synth tracks on the *new* engine. Your call: accept that, add a
   save-format version marker, or drop the remap for good.
2. **Sound is unheard.** Nobody has played this engine. Two things I would listen for first:
   the pulse at high pitch (the delay-offset method detunes slightly as frequency rises — the
   spec names this as the expected gap, a worklet is the later fix), and unison 4 level, where
   the `1/√n` compensation is arithmetic, not ear-tuned.
3. **The dial's arc is thin at the default `--stroke-arc`.** It reads fine at 1366 in
   [C-01](wave-synth-port-shots/C-01.png); if you want it heavier it is one token.
4. Deferred by the spec, still deferred: tempo-synced LFO, AudioWorklet PWM, preset bank.

## TEST HANDOFF

For the sonnet running SPEC §2e. Everything below is verified against the shipped code.

**Files**

- engine — `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/instruments/wave-synth.js`
- knob — `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/ui/knob.js`
- pages — `.../tools/desktop/wave-synth.html`, `.../tools/mobile/wave-synth.html`
- test script, rows 9 and 3 already fixed but never re-run —
  `.../docs/scratchpad/wave-synth-port/test-wave-synth.mjs`
- load sweep — `.../docs/scratchpad/wave-synth-port/loadcheck.mjs`
- shots go to `.../docs/reports/wave-synth-port-shots/`

**Running Playwright.** `playwright` does not resolve from a script living in this repo. Both
scripts import it by absolute path and unwrap the CommonJS default:

```js
const pw = await import('/Users/moth3rship/Desktop/AI Design/Wayfinder/node_modules/playwright/index.js');
const chromium = (pw.default ?? pw).chromium;
```

Run them from `cd "/Users/moth3rship/Desktop/AI Design/Wayfinder" && node <abs path>`.
Server is `python3 -m http.server 8080` from the repo root.

**Reaching the instrument.** `mountStandaloneTool` parks the shell on `window.cbdawShell`;
the live instance is `window.cbdawShell.instrument`. Voice counts come from the shared pool:

```js
await page.evaluate(async () => (await import('/src/core/audio.js')).voicePool.count)
```

Internals the partial run leaned on, if you want them: `instrument._notes` is a
`Map<note, {voices, startedAt}>`, `instrument._voices` is a `Set`, and each voice carries
`.freq` and `.note`.

**Param paths and ranges** — `setParam(path, value)` / `getParam(path)`:

| Path | Kind | Range or values | Default |
|---|---|---|---|
| `osc1.wave` `osc2.wave` | enum | `sine` `triangle` `saw` `square` `pulse` | `saw` |
| `osc1.oct` `osc2.oct` | int | −2 … 2 | 0 |
| `osc1.semi` `osc2.semi` | int | −24 … 24 semitones | 0 |
| `osc1.fine` `osc2.fine` | num | −50 … 50 cents | 0 · 7 |
| `osc1.level` `osc2.level` | num | 0 … 1 | 0.6 · 0.4 |
| `osc1.pw` `osc2.pw` | num | 0.05 … 0.95 | 0.5 |
| `filter.type` | enum | `lowpass` `highpass` `bandpass` | `lowpass` |
| `filter.cutoff` | num | 20 … 18000 Hz | 4000 |
| `filter.q` | num | 0.1 … 20 | 1 |
| `env1.attack` `env1.decay` | time | 0.001 … 2 s | 0.005 · 0.12 |
| `env1.sustain` | num | 0 … 1 | 0.75 |
| `env1.release` | time | 0.001 … 4 s | 0.2 |
| `env2.attack` `env2.decay` | time | 0.001 … 2 s | 0.01 · 0.25 |
| `env2.sustain` | num | 0 … 1 | 0.3 |
| `env2.release` | time | 0.001 … 4 s | 0.3 |
| `lfo1.wave` `lfo2.wave` | enum | `sine` `triangle` `square` `saw` | `sine` · `triangle` |
| `lfo1.rate` `lfo2.rate` | num | 0.05 … 30 Hz | 5 · 0.6 |
| `voice.mode` | enum | `poly` `mono` | `poly` |
| `voice.unison` | enum | `1` `2` `4` | 1 |
| `voice.spread` | num | 0 … 50 cents | 12 |
| `voice.width` | num | 0 … 1 | 0.5 |
| `out.gain` | num | 0 … 1 | 0.8 |
| `mod.<dest>.<src>` | num | −1 … 1, 24 of them | 0 |

`<dest>` is `pitch1` `pitch2` `filter` `amp` `pw1` `pw2`; `<src>` is `env2` `lfo1` `lfo2`
`vel`. Amount 1.0 means 1200 cents on pitch, 4800 cents on filter detune, 1.0 of gain on amp,
0.45 of pulse width on pw. `getState()` returns the flat patch; its keys are the short forms
(`o1wave`, `fCut`, `e1a`, `vUnison`, `m_pitch1_lfo1`, …), not the paths.

**How the panel exposes each control**

- Root is `.wv-root`, `.wv-expanded` or `.wv-compact`. Sections are `.wv-sec`, titled by
  `.wv-sec__title`; the mod matrix section also carries `.wv-sec--wide`.
- **Dials** — everything except the eight envelope stages. Selector
  `.cbdaw-knob[data-path="<path>"]`. A dial is a focusable `div` with `role="slider"`, not an
  `input`; it publishes `aria-valuenow` (raw number, an index for enum dials),
  `aria-valuemin`, `aria-valuemax` and `aria-valuetext` (the shown string). Its readout is
  `.cbdaw-knob__value`, its caption `.cbdaw-knob__label`. **Drive it by**: vertical pointer
  drag (down-move-up; 150px is the full range, Shift = quarter speed), `wheel` (one step,
  `preventDefault`ed so it is not passive), `dblclick` (reset to the patch default), or the
  keys `ArrowUp`/`ArrowRight`/`ArrowDown`/`ArrowLeft` (one step), `PageUp`/`PageDown` (a
  tenth of the range), `Home`/`End` (min/max) while focused. A dispatched `KeyboardEvent`
  works; setting `.value` does not — there is no `.value`.
- **Faders** — `env1.*` and `env2.*` only, eight in total. Selector
  `input[type="range"][data-path="<path>"]`, vertical (`writing-mode: vertical-lr`), inside
  `.wv-fader` with a `.wv-fader__value` readout. Drive them by setting `.value` and
  dispatching an `input` event, the usual way.
- Mod-matrix dials are the same `.cbdaw-knob[data-path]` at a smaller `--knob-size`, with
  their caption removed and a `title` of the form `Filter from LFO1`.
- Compact mount shows `osc1.wave`, `filter.cutoff`, `env1` A D S R, `voice.unison`.
- The knob writes its value straight through `setParam`, so the patch is the single source of
  truth; `_syncUI()` pushes back into every knob and fader and skips one that is being dragged
  or focused.

**Row 3 note.** `--tap-min` is a `var()` chain, so `getComputedStyle(documentElement)
.getPropertyValue('--tap-min')` returns the literal `var(--sp-23)` and parses to NaN. Resolve
it through a real element instead — the fixed script appends a probe div with
`style.height = 'var(--tap-min)'` and reads its computed height (46px). On the mobile layout
`.cbdaw-knob` sets `--knob-size: var(--tap-min)`, so dials are tap-legal there; the eight
envelope faders are `--sp-28` (56px) tall and `--sp-4` (8px) wide, which is the one place a
tap target is narrow — measure it and report rather than assuming it fails.

**Row 9 note.** The tracks API is `tracks.all` (a getter), `tracks.get(id)`,
`tracks.add({name})`, `tracks.setInstrumentType(id, type)`. There is no `tracks.list()`. After
`setInstrumentType` give `wireDawShell` a moment, then the live instance is on the track
record as `tracks.get(id).instrument`.

**Known unfinished going in**

- Rows 1–10 have never all run against the dial build. Rows 9 and 10 have never run at all.
- The cap reading: SPEC §2b says "cap 8 … when it holds 8" while §2e row 4 expects 16 voices
  from 4 notes at unison 4. Those cannot both mean voices. I implemented the cap as **8 held
  notes**, each holding `unison` voices, which is the only reading that satisfies both rows 4
  and 5 — and the partial run confirmed 4/8/16 and 8. If Brandon wants a hard 8-voice cap
  instead, row 4's expected numbers change.
- `filter` mod destination writes `BiquadFilterNode.detune` (cents), not `.frequency` (Hz).
  §2b's prose says "filter frequency" but §A's block map says "filter detune"; cents is the
  musically correct one and matches Synth Lab.
- The `pw1`/`pw2` mod scale is computed from the note's frequency at trigger and does not
  re-track if pitch modulation moves the oscillator afterwards.

## CLOSER REVIEW

- Gets copy of review, not a contract.
- Rule the `setInstrumentType` legacy remap in BRANDON'S TODOS #1 — Brandon
- Rule the cap reading (8 held notes vs 8 voices) — Brandon
- Play the engine and rule the sound gate; nothing here is an ear claim — Brandon
- ORDER E, all ten rows against the dial build — the sonnet, then its own receipt
- `docs/scratchpad/wave-synth-port/` is throwaway once the sonnet is done — closer
