# RECEIPT — `daw-shell` (P4/S2)

Stamped 2026-08-31 21:53 EDT. Seat brief: [A-daw-shell.md](A-daw-shell.md) — superseded in
part, see DEVIATIONS below. Stage: [STAGE.md](STAGE.md).

## DELIVERABLE STATE

**TASK 1 — the shell. DONE.** `/index.html` + `src/ui/daw-shell.js` built to the dispatch
prompt's TASK 1 exactly: named, empty mount points only. No instrument, no device, no
surface, no store instantiated. Verified in real headless Chrome — `python3 -m http.server`,
DOM dump shows all 15 `data-mount` points present, screenshot shows the frame laid out
(header band, transport band, three workspace panes, six strips + master, hidden pop-out).

Mount points built, by `data-mount` name: `project-header` · `transport-bar` ·
`arrangement` · `node-graph` · `automation-lanes` · `device-popout` · `strip-ch1..ch6` ·
`strip-master`. `mountDawShell(host)` returns `{root, header, transport, arrangement,
nodeGraph, automationLanes, devicePopout, strips: {ch1..ch6, master}, unmount()}` — both a
handle object and `data-mount` attributes, so an S3 seat can bind either way. `MOUNTS` and
`CHANNEL_IDS` are exported constants naming the contract in code, not just here.

Every visual value in both files is `var(--token)`, no fallback. Reused existing base
tokens (`--bg` `--transport-ground` `--recess` `--strip-head` `--strip-sel` `--ruler-ground`
`--graph-ground` `--lane-ground` `--popout-ground` `--scrim` `--z-scrim` `--sp-30` for strip
width, per the tokens.css comment naming that exact composition) plus layout/keyword axis
tokens (`--disp-flex`, `--flexdir-column`, `--flex-*`, `--align-*`, `--box-border-box`,
`--pos-absolute`, `--ov-hidden`, etc.). No new token needed; none invented; `tokens.css`
untouched.

**`src/core/state.js` — NOT touched.** Confirmed unmodified: `git status` shows it clean at
HEAD before and after this seat. See DEVIATIONS.

**TASK 2 — token coverage doc. DONE.** [Builddocs/skinspecs/token-coverage.md](../../skinspecs/token-coverage.md) —
whole-project TOKENIZED / NOT TOKENIZED, pulled from the four named sources only, not
re-derived.

**TASK 3 — the EQ canvas. DONE, landed whole.** Assessed after TASK 1 per Brandon's order.
Finding: the "73 canvas-context assignments" TODO.md flagged were mostly **already**
resolved — `spectrum.js`/`scope.js` already read `--bg --panel --line --text --text-dim
--accent --warn` via `readTokens()`/`getComputedStyle`, predating this seat. The real,
narrower gap was the 8 literal `_fade(color, alpha)` alpha numbers, and every one of the 8
is an exact value match to an existing `--fade-*` token (`--fade-faint/mid/strong/label` in
spectrum.js, `--fade-half/near` in scope.js) — those tokens were sized from these exact call
sites. Mechanical, value-for-value, zero visual change. Done in both files, all 8 sites,
verified: `tools/wave-synth.html` and `tools/overtone-synth.html` loaded in real headless
Chrome, screenshotted — spectrum grid/dB-axis/"no signal" state and scope
flatline/gridlines/"no signal" state all draw correctly, no console errors. Full table and
the "not touched" boundary (textAlign/textBaseline/lineJoin/lineWidth — exact tokens exist,
not wired, ~15-20 sites, second pass) is in token-coverage.md, not repeated here.

## DEVIATIONS FROM STANDING DOCS — read before assigning follow-on work

Three real conflicts between the dispatch prompt that ran this seat and older docs already
in the repo. Followed the dispatch prompt in all three (it is the direct, current
instruction); flagging so nobody downstream assumes the older doc is what shipped.

1. **`state.js` ownership.** `STAGE.md`, `A-daw-shell.md`, and CONTRACTS §16.11 all say
   `daw-shell` owns/extends `src/core/state.js` (add a 'project' slice, per S1's receipt
   NEXT ACTION). The dispatch prompt explicitly listed `state.js` under "Reuse what exists.
   Do not respec or rewrite," grouped with `audio.js`/`shell.js`/`clock.js`/`capture.js`.
   Followed the prompt — **`state.js` untouched.** Consequence: `EVENTS = ['scale']` is
   still the only event; a 'project' slice for header-owned scale/tempo/meter state does
   not exist yet. Whoever wires the project header (mixer-strips, or a later stage) needs
   it and will hit this.
2. **Wiring vs. empty mounts.** `A-daw-shell.md`'s seat questions and `STAGE.md`'s
   done-check both describe a *wired* shell — header actually sets scale/time/BPM, at least
   one P1-P3 instrument mounted compact and playing, surface switcher working, scale change
   visible on a mounted P3 surface. The dispatch prompt's TASK 1 explicitly says "Mount
   points are empty holders. Wire nothing. Instantiate no instrument, no device, no
   surface." Followed the prompt — **nothing is wired.** `createScaleControl`,
   `createCpuMeter`, `ToolShell`, and every instrument/surface named as "available to reuse"
   in the dispatch prompt were read for API shape only, never called.
3. **File menu isolate control.** `A-daw-shell.md` asks for the file menu extended with an
   isolate-one-instrument control. Not in the dispatch prompt's TASK list. Not built.

None of these are this seat's call to resolve — named here so the Troubleshooter/Brandon
can see the gap between what the older seat brief asked for and what actually shipped, and
decide whether an S3 seat picks up the state.js extension and the wiring, or whether that
comes back to S2.

## NEXT ACTION

Six S3 seats mount into `mountDawShell()`'s return value / the `data-mount` DOM. Whoever
wires the project header first needs `state.js`'s `EVENTS` list extended with a project
slice (scale/tempo/meter ownership) — not done here, see DEVIATIONS item 1. The
`--canvas-textalign-*`/`--canvas-textbaseline-*`/`--canvas-round` wiring for
spectrum.js/scope.js named in token-coverage.md is a small, separate, unstarted pass.

## OPEN DECISIONS

None blocking. The three DEVIATIONS above are reported, not decisions this seat made
unilaterally — they follow directly from the dispatch prompt's explicit text.

## FILE LOCATIONS

- Built: [/index.html](../../../index.html) · [src/ui/daw-shell.js](../../../src/ui/daw-shell.js)
- Edited (TASK 3): [src/vis/spectrum.js](../../../src/vis/spectrum.js) ·
  [src/vis/scope.js](../../../src/vis/scope.js) — 8 `_fade()` alpha sites each, no other change
- Written: [Builddocs/skinspecs/token-coverage.md](../../skinspecs/token-coverage.md)
- This receipt: `Builddocs/P4-the-daw/S2-shell/receipt-daw-shell.md`
- Read, not edited: CONTRACTS §16 (16.0, 16.1, 16.4, 16.9, 16.10, 16.11) · PHASE.md FIXED
  DESIGN · STAGE.md · A-daw-shell.md · S1's receipt · `src/core/state.js` ·
  `src/core/clock.js` (`clock.bpm`, `clock.timeSignature`) · `src/ui/shell.js`
  (`createScaleControl`, `createCpuMeter` — signatures only, not called) · `src/ui/tokens.css`
- Verification artifacts (not committed, local only):
  `/tmp/dom_dump.html`, `/tmp/daw_shell_screenshot.png`, `/tmp/wave_synth_full.png`,
  `/tmp/overtone_synth_full.png`

---

## CORRECTION PASS — `daw-shell-fix`, stamped 2026-08-31 22:09 EDT

Dispatched to build the three DEVIATIONS above to `A-daw-shell.md`. Authority order given:
Brandon > BUILDPLAN/PHASE fixed decisions > CONTRACTS §16 > seat brief. Where §16 (parallel
six-seat model, written after this brief) conflicts with `A-daw-shell.md`'s DONE-CHECK
(written before §16 existed), §16 wins; reported below where that changed the build.

### DELIVERABLE STATE

**1 — `state.js` extended.** Added `'project'` to `EVENTS`. New slice
`{ recordArmed, punch: {on, startBar, endBar} }`, mutators `setRecordArmed(bool)` /
`setPunch(patch)`, generic `commitProject()` mirroring the existing scale `commit()`.
Nothing else in the file touched — `on`/`off`/`dispose`/`listenerCount` already iterate
`EVENTS` generically, so they cover `'project'` with no further edit.

**Disagreement found and NOT silently picked:** the original DEVIATIONS entry assumed
`state.js` needed a slice for "header-owned scale/tempo/meter." Read `core/clock.js`
(shipped, frozen P2) — it already owns `bpm`, `timeSignature`, `songLengthBars`, `loop`,
`countIn`, `metronome` as public read/write properties, matching §3 and §7 exactly. Adding
a second copy of that state to `state.js` would be a second source of truth. Did not add
it. `recordArmed` and `punch` have no other owner anywhere in the app — those two are
genuinely new and are what got added.

**2 — the shell wired.** New additive exports on `daw-shell.js`, `mountDawShell()` itself
byte-for-byte unchanged (same signature, same 15 mount points, same returned keys, plus
one addition — see below):

- `MOUNTS.playingSurface` / `data-mount="playing-surface"` — one new mount point, between
  the transport band and the body. `mountDawShell()`'s returned object gained the matching
  `playingSurface` key. No existing mount renamed, moved, or removed.
- `wireDawShell(handle, {instrumentCtor, channelId})` — the single new entry point.
  Wires the header (isolate control, scale, BPM, time signature, song length, CPU meter),
  the transport bar (play/stop/record, position readout, metronome, count-in, loop, arm,
  punch), the playing surface (`shell.js`'s own `createSurfaceSwitcher`, unedited), and one
  instrument mounted compact + wired to the shared input bus. Returns `{dispose()}`.
- Header's scale control and both registered P3 surfaces (`diatonic-keys`, `scale-circle`)
  already default to the same shared `core/state.js` singleton — moving the header's tonic
  updates a mounted surface with no extra wiring, confirmed by reading both constructors.
- `index.html` calls `mountDawShell()` then `wireDawShell(shell, {instrumentCtor:
  WaveSynth, channelId: 'ch1'})`.

**Instrument-on-channel — scoped narrow, on purpose.** §16.1/§16.4 give channel creation
and the fader/pan/mute chain to `mixer-strips`' `strip.js`, which this seat still does not
touch. `wireDawShell()`'s demo instrument uses only `core/audio.js`'s `createChannel()` (a
read-only, universally-reusable free function, same one `shell.js`'s `ToolShell` already
calls) plus the instrument's own `mountCompact()`/`noteOn`/`noteOff` — no `Strip` class, no
fader, no insert slots, no graph. This is the same shape `ToolShell` already uses per tool;
it is not "building the mixer."

**Reported, not resolved:** this demo instrument is mounted straight into
`strips.ch1`'s DOM node, which `mixer-strips` (running now, in parallel) will also want to
fill. If that seat's `Strip.mountCompact()` appends into the same element rather than
clearing it first, the two will sit side by side rather than collide — but nobody tore this
demo down first. Troubleshooter's call whether `mixer-strips` should clear the host before
mounting, or whether this demo should come out once a real `Strip` exists.

**3 — file-menu isolate control, built.** Reuses `shell.js`'s `createFileMenu()` unedited,
in the header, with `items` = the six channel ids + master. Selecting one hides every other
strip element (`strip.hidden = true`); selecting it again shows all. Selecting/hiding only
touches elements this seat already owns (the strip containers) — no instrument content.

**Verified, real headless Chrome** (`python3 -m http.server`, Chrome
`--headless=new --dump-dom` / `--screenshot`, window 1366×768): header, transport, isolate
menu, surface switcher (three buttons, keyboard live by default), and the Wave Synth
mounted compact on ch1 all render with no `cbdaw-shell__error` box and no page console
errors. `node --check` passed on both edited files.

**Styling.** Every new rule in `daw-shell.js`'s injected stylesheet is `var(--token)`, no
fallback — grep-verified, zero literal px/hex/rgba in the additions. New rules draw only
from tokens already in `tokens.css` (P4 transport/header set: `--btn-face` `--btn-active`
`--play-on` `--rec-on` `--arm-on` `--loop-region` `--punch-region` `--recess`, plus reused
base tokens). `tokens.css` itself untouched.

**Comments.** Everything added to `state.js` and `daw-shell.js` in this pass states
function or state only — no contract citation, no rationale, no banner dividers. Checked
against the corrected rule before reporting.

### NEXT ACTION

`mixer-strips` / `node-graph`: decide what happens to the ch1 demo instrument when the real
`Strip` lands there — see the ch1 note above. `arrangement`/other S3 seats: nothing in this
pass touches arrangement, node-graph, automation, or device mount points; unaffected.

### OPEN DECISIONS

None blocking. The ch1 host-collision note above is reported, not decided, per this pass's
own instruction not to touch the mixer.

### FILE LOCATIONS

- Edited: [src/core/state.js](../../../src/core/state.js) — `'project'` event + slice
- Edited: [src/ui/daw-shell.js](../../../src/ui/daw-shell.js) — `playingSurface` mount +
  `wireDawShell()` and its private builders
- Edited: [index.html](../../../index.html) — calls `wireDawShell()`
- Edited: [Builddocs/skinspecs/token-coverage.md](../../skinspecs/token-coverage.md) —
  P4 transport/header tokens now marked consumed
- Read, not edited: `src/core/clock.js`, `src/core/audio.js`, `src/core/input.js`,
  `src/ui/shell.js`, `src/instruments/wave-synth.js`, `src/surfaces/diatonic-keys.js`,
  `src/surfaces/scale-circle.js`, CONTRACTS §16 (16.0b, 16.1, 16.2, 16.4, 16.9, 16.11)
- Verification artifacts (not committed, local only, scratchpad):
  `dom_dump2.html`, `daw_shell_final.png`, `console.log`
