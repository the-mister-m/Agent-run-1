# Devbar Token Attribution — receipt

Per-entry `var(--…)` attribution for the 28 devbar entries in
`tools/dev-splash.html`, plus the collapsible-devbar edit built on top of it.

## Corrections to the brief

- **GLOBAL set is 41 tokens, not 45.** `--flex-0-0-auto`, `--fs-xs`,
  `--justify-center`, `--sp-30` each sit in only 3-4 of the 7 groups
  (checked by group, not by file — a token counts once per group even if
  several files in that group use it). They belong in SHARED. Recomputed
  from scratch against the "5+ of 7 groups" rule; the other 41 named
  tokens all check out.
- **3 of the 5 "false positives" are real tokens, not comment prose.**
  `--deg-*` (5 names), `--bw-*` (2/3/5), and `--knob-*` (fill/track/pointer)
  are declared in `src/ui/tokens.css` (lines 17-23, 388-390, 447-449) and
  used in real `var()` calls in diatonic-keys.js, piano-roll.js,
  step-grid.js, arrangement.js, eq.js, and all five device files. Only
  `--token` and `--x` are genuine false positives — every instance of
  those two is inside a comment (`` `var(--token, fallback)` `` as prose,
  `` `var(--x, …)` `` as a counterexample). Excluded `--token`/`--x` from
  every entry's count; kept `--deg-*`/`--bw-*`/`--knob-*`.
- **`--note-deg` / `--row-deg` — confirmed, not declared, and why.**
  Neither is in tokens.css. Both are set at runtime, per-element, via
  `el.style.setProperty('--row-deg', \`var(${degreeColor(...)})\`)` in
  piano-roll.js. `degreeColor()` (src/theory/scale.js:334) returns the
  name of a real token that IS in tokens.css (one of the `--deg-*` family
  above). So `--row-deg`/`--note-deg` are an indirection layer local to
  piano-roll.js — a variable pointing at a token name, not a token
  declaration themselves. Flagged as module-local, same bucket as
  `--kbd-*`, `--grid-*`, etc.
- **FRAME entries don't render from shell.js.** `mountProjectHeader`,
  `mountTransportBar`, `mountPlayingSurface` are defined in
  `src/ui/daw-shell.js` (lines 442, 517, 639), not `src/ui/shell.js`.
  shell.js is the P1 tool-shell (owns `/tools/wave-synth.html` etc. per
  its own file header) that daw-shell.js borrows shared chrome from —
  `createScaleControl`, `createCpuMeter`, `createSurfaceSwitcher`,
  `createFileMenu`, `acquireShellStyle`/`releaseShellStyle`. Checked: none
  of the three daw-shell.js function bodies contain a single `var(--…)` —
  all their CSS lives in shell.js's `STYLE_TEXT` (one monolithic template
  string, line 148), injected wholesale by `acquireShellStyle()`, not
  scoped per component. Header calls `createScaleControl` + `createCpuMeter`;
  Surface Block calls `createSurfaceSwitcher`; Transport Bar calls neither
  helper and has no local CSS of its own — it rides on whichever of the
  other two already injected the shared stylesheet. True per-piece
  splitting would mean tracing every className each function renders
  against every rule in STYLE_TEXT — out of scope for this pass. Used the
  brief's stated fallback: all of shell.js attributed to all three FRAME
  entries, called out here so it isn't mistaken for real per-piece data.

## Counts table

| Entry | Group | Own | Shared | Global | Total |
|---|---|---|---|---|---|
| Project Header | FRAME | 17 | 32 | 34 | 83 |
| Transport Bar | FRAME | 17 | 32 | 34 | 83 |
| Playing Surface Block | FRAME | 17 | 32 | 34 | 83 |
| 12-Note Keyboard | SURFACES | 6 | 16 | 31 | 53 |
| Diatonic Keys | SURFACES | 7 | 17 | 34 | 58 |
| Scale Circle | SURFACES | 6 | 10 | 27 | 43 |
| Comp Builder | SURFACES | 18 | 27 | 29 | 74 |
| Piano Roll | SEQUENCING | 17 | 25 | 39 | 81 |
| Step Grid | SEQUENCING | 13 | 19 | 39 | 71 |
| Arrangement | SEQUENCING | 16 | 28 | 27 | 71 |
| Strip | MIXER | 11 | 13 | 28 | 52 |
| All 7 Strips | MIXER | 11 | 13 | 28 | 52 |
| Node Graph | MIXER | 3 | 42 | 30 | 75 |
| Automation: gain | MIXER | 1 | 9 | 22 | 32 |
| Automation: pan | MIXER | 1 | 9 | 22 | 32 |
| Automation: mute | MIXER | 1 | 9 | 22 | 32 |
| Automation: solo | MIXER | 1 | 9 | 22 | 32 |
| Gate | DEVICES | 7 | 7 | 20 | 34 |
| Compressor | DEVICES | 4 | 5 | 21 | 30 |
| EQ | DEVICES | 7 | 16 | 33 | 56 |
| Reverb | DEVICES | 5 | 4 | 16 | 25 |
| Delay | DEVICES | 5 | 4 | 16 | 25 |
| Wave Synth | INSTRUMENTS | 13 | 27 | 33 | 73 |
| Overtone Synth | INSTRUMENTS | 1 | 5 | 16 | 22 |
| Drum Synth | INSTRUMENTS | 8 | 21 | 29 | 58 |
| Drum Sampler | INSTRUMENTS | 7 | 13 | 28 | 48 |
| Patch Synth | INSTRUMENTS | 6 | 58 | 34 | 98 |
| Spectrum (ch1 instrument) | VIS | 0 | 0 | 4 | 4 |
| Scope (ch1 instrument) | VIS | 0 | 0 | 4 | 4 |
| Meter (master tap) | VIS | 0 | 0 | 6 | 6 |
| Governor Meter | VIS | 0 | 2 | 15 | 17 |

## GLOBAL set (41 tokens — used by 5+ of 7 groups)

`--align-center` `--bg` `--box-border-box` `--bw` `--color-transparent`
`--cur-pointer` `--disp-block` `--disp-flex` `--flexdir-column`
`--font-inherit` `--font-ui` `--fs-sm` `--line` `--none` `--num-tabular`
`--ov-hidden` `--panel` `--pct-100` `--pe-none` `--pos-absolute`
`--pos-relative` `--r-body` `--r-cell` `--r-ctl` `--r-sm` `--sp-0` `--sp-1`
`--sp-1h` `--sp-2` `--sp-3` `--sp-4` `--sp-5` `--sp-6` `--ta-center` `--text`
`--text-dim` `--touch-none` `--usel-none` `--w-bold` `--w-med` `--warn`

## Per-entry OWN / SHARED lists

### Project Header — FRAME
Files: src/ui/shell.js (see correction above — daw-shell.js calls it)
- OWN (17): --align-baseline, --dropdown-offset, --flex-0-1-auto, --flex-1-1-240, --grid-1-115, --grid-minmax-0-1fr, --ls-none, --op-mid, --shadow-lifted, --shell-gap, --sp-17, --sp-33, --tr-width, --track-tight, --vh-100, --ws-prewrap, --z-popover
- SHARED (32): --accent, --align-flex-start, --align-start, --auto, --cur-not-allowed, --disp-grid, --disp-none, --flex-1-1-auto, --flexwrap-wrap, --font-mono, --fs-base, --fs-md, --fs-xl, --justify-space-between, --lh-base, --meter-hot, --meter-ok, --op-dim, --pct-0, --r-panel, --r-pill, --shadow-raised, --sp-13, --sp-15, --sp-2h, --sp-3h, --sp-60, --sp-7, --sp-8, --ta-left, --track-label, --tt-label
- NOT IN tokens.css: --shell-gap (module-local)

### Transport Bar — FRAME
Same set as Project Header (see correction above).

### Playing Surface Block — FRAME
Same set as Project Header (see correction above).

### 12-Note Keyboard — SURFACES
Files: src/surfaces/keyboard.js
- OWN (6): --kbd-accent, --kbd-dim, --kbd-line, --kbd-text, --key-border, --pct-62
- SHARED (16): --accent, --align-flex-end, --flexwrap-wrap, --fs-base, --fs-lg, --fs-md, --fs-xs, --justify-center, --sp-13, --sp-15, --sp-28, --sp-7, --sp-84, --tr-background, --z-raise-1, --z-raise-2
- NOT IN tokens.css: --kbd-accent, --kbd-dim, --kbd-line, --kbd-text (all module-local)

### Diatonic Keys — SURFACES
Files: src/surfaces/diatonic-keys.js
- OWN (7): --deg-altered, --deg-aug, --deg-dim, --deg-major, --deg-minor, --filter-brighten, --tr-filter
- SHARED (17): --accent, --cur-default, --flex-1-1-0, --flexwrap-wrap, --fs-lg, --fs-md, --fs-xs, --justify-flex-end, --lh-none, --op-faint, --sp-13, --sp-15, --sp-28, --sp-7, --sp-8, --sp-84, --sp-9

### Scale Circle — SURFACES
Files: src/surfaces/scale-circle.js
- OWN (6): --dominant-baseline-central, --op-full, --sp-95, --text-anchor-middle, --tr-opacity-stroke, --w-heavy
- SHARED (10): --accent, --auto, --disp-none, --flexwrap-wrap, --fs-md, --justify-center, --op-soft, --ov-visible, --sp-230, --stroke-dash

### Comp Builder — SURFACES
Files: src/surfaces/comp-builder.js
- OWN (18): --aspect-square, --cb-cell, --font-style-italic, --fs-chord, --fs-em-62, --fs-numeral, --grid-1fr, --grid-60-140, --justify-flex-start, --lh-loose, --r-chip, --ring-off, --sp-4h, --sp-5h, --sp-7h, --sp-em-14, --sp-em-21, --track-mid
- SHARED (27): --accent, --align-flex-end, --align-start, --cur-default, --cur-grab, --cur-grabbing, --disp-grid, --flex-1, --flexwrap-wrap, --fs-base, --fs-em-70, --fs-lg, --fs-md, --fs-tiny, --fs-xs, --justify-center, --justify-flex-end, --lh-base, --lh-none, --line-dashed, --op-faint, --sp-20, --sp-2h, --sp-3h, --sp-9, --sp-em-36, --sp-hair
- NOT IN tokens.css: --cb-cell (module-local)

### Piano Roll — SEQUENCING
Files: src/surfaces/piano-roll.js
- OWN (17): --align-stretch, --bw-3, --bw-5, --fs-2xl, --fs-3xl, --line-dotted, --line-double, --line-groove, --note-deg, --roll-gutter, --roll-row-h, --row-deg, --sp-23, --sp-31, --sp-ch-4, --td-underline, --wc-left
- SHARED (25): --accent, --cur-ew-resize, --cur-grab, --cur-ns-resize, --flex-0-0-auto, --flex-1-1-0, --flex-1-1-auto, --flexwrap-wrap, --fs-base, --fs-lg, --fs-micro, --fs-xs, --justify-flex-end, --lh-none, --line-dashed, --line-solid, --op-soft, --pct-0, --pe-auto, --sp-12, --sp-2h, --sp-39, --sp-9, --sp-hair, --ws-nowrap
- NOT IN tokens.css: --note-deg, --roll-gutter, --roll-row-h, --row-deg (all module-local — see correction above for --note-deg/--row-deg)

### Step Grid — SEQUENCING
Files: src/surfaces/step-grid.js
- OWN (13): --align-stretch, --fs-2xl, --fs-3xl, --grid-accent, --grid-bg, --grid-dim, --grid-line, --grid-panel, --grid-text, --grid-warn, --sp-23, --sp-37, --wc-left
- SHARED (19): --accent, --bw-2, --flex-0-0-auto, --flex-1-1-0, --flex-1-1-auto, --flexwrap-wrap, --fs-base, --fs-micro, --fs-tiny, --fs-xs, --lh-none, --op-soft, --pct-0, --sp-13, --sp-20, --sp-7, --sp-hair, --to-ellipsis, --ws-nowrap
- NOT IN tokens.css: --grid-accent, --grid-bg, --grid-dim, --grid-line, --grid-panel, --grid-text, --grid-warn (all module-local)

### Arrangement — SEQUENCING
Files: src/ui/arrangement.js
- OWN (16): --arm-on, --arr-bar-w, --arr-zoom, --clip-fill, --lane-head, --lane-row, --lane-row-alt, --loop-region, --playhead-line, --pos-sticky, --punch-region, --ruler-ground, --ruler-tick-bar, --ruler-tick-beat, --strip-sel, --z-sticky
- SHARED (28): --btn-face, --bw-2, --cur-ew-resize, --cur-grab, --cur-grabbing, --disp-grid, --disp-none, --flex-0-0-auto, --flex-1-1-0, --fs-base, --fs-micro, --fs-xs, --justify-center, --lh-none, --op-faint, --op-soft, --popout-ground, --raise, --recess, --sp-10, --sp-14, --sp-230, --sp-28, --sp-60, --sp-84, --ws-nowrap, --z-raise-1, --z-raise-2
- NOT IN tokens.css: --arr-bar-w, --arr-zoom (module-local)

### Strip / All 7 Strips — MIXER
Files: src/mixer/strip.js (identical set, both entries render the same component)
- OWN (11): --fader-fill, --fader-thumb, --fader-track, --mute-on, --pan-center, --pan-thumb, --pan-track, --slot-empty, --slot-face, --slot-route, --solo-on
- SHARED (13): --cur-default, --cur-ew-resize, --cur-ns-resize, --flex-0-0-auto, --flex-1, --fs-micro, --fs-tiny, --raise, --sp-30, --sp-9, --sp-hair, --to-ellipsis, --ws-nowrap

### Node Graph — MIXER
Files: src/mixer/graph.js
- OWN (3): --dur-med, --stroke-med, --tr-transform
- SHARED (42): --auto, --btn-face, --cable-drag, --cur-grab, --cur-grabbing, --ease, --edge-audio, --edge-control, --edge-hover, --edge-refused, --flex-0-0-auto, --flex-1, --fs-micro, --graph-grid, --graph-ground, --justify-center, --justify-space-between, --lh-none, --node-border, --node-dimmed, --node-dragging, --node-fill, --node-head, --node-selected, --op-dim, --ov-visible, --pe-auto, --port-active, --port-in, --port-out, --r-pill, --shadow-raised, --sp-60, --sp-8, --sp-hair, --stroke-bold, --stroke-dash, --to-ellipsis, --tr-stroke, --ws-nowrap, --z-drag, --z-raise-1

### Automation: gain / pan / mute / solo — MIXER
Files: src/mixer/automation.js (all four lanes render off the same file)
- OWN (1): --lane-ground
- SHARED (9): --flex-0-0-auto, --flex-1, --fs-micro, --justify-space-between, --raise, --sp-14, --sp-hair, --to-ellipsis, --ws-nowrap

### Gate — DEVICES
Files: src/devices/gate.js
- OWN (7): --bypass-off, --bypass-on, --device-head, --gate-closed, --gate-open, --gate-threshold, --knob-fill
- SHARED (7): --flex-1, --fs-xs, --r-pill, --sp-30, --sp-em-36, --ta-right, --tr-background

### Compressor — DEVICES
Files: src/devices/compressor.js
- OWN (4): --bypass-off, --bypass-on, --device-head, --knob-fill
- SHARED (5): --flex-1, --fs-xs, --sp-30, --sp-em-36, --ta-right

### EQ — DEVICES
Files: src/devices/eq.js
- OWN (7): --bypass-off, --bypass-on, --device-head, --knob-fill, --knob-pointer, --knob-track, --sp-em-46
- SHARED (16): --bw-2, --cur-ew-resize, --flex-0-0-auto, --flex-1, --fs-md, --fs-xs, --justify-space-between, --pct-0, --popout-ground, --r-pill, --sp-em-16, --ta-right, --tr-background, --track-label, --track-title, --tt-label

### Reverb / Delay — DEVICES
Files: src/devices/reverb.js, src/devices/delay.js (near-identical device shells)
- OWN (5): --bypass-off, --bypass-on, --device-head, --knob-fill, --knob-track
- SHARED (4): --fs-xs, --popout-ground, --sp-16, --tr-color

### Wave Synth — INSTRUMENTS
Files: src/instruments/wave-synth.js
- OWN (13): --anim-pulse, --color-current, --content-empty, --r-lg, --r-xl, --scale-pulse-peak, --scale-pulse-rest, --sp-11, --sp-65, --sp-em-17, --sp-em-35, --stroke-heavy, --z-behind
- SHARED (27): --accent, --disp-none, --flex-1, --flexwrap-wrap, --fs-base, --fs-micro, --fs-xl, --fs-xs, --lh-none, --op-faint, --op-soft, --sp-10, --sp-12, --sp-13, --sp-16, --sp-20, --sp-30, --sp-39, --sp-7, --sp-8, --sp-9, --sp-em-16, --sp-em-36, --ta-right, --track-label, --track-title, --tt-label

### Overtone Synth — INSTRUMENTS
Files: src/instruments/overtone-synth.js
- OWN (1): --tr-shadow
- SHARED (5): --accent, --flex-1, --flexwrap-wrap, --meter-ok, --sp-60

### Drum Synth — INSTRUMENTS
Files: src/instruments/drum-synth.js
- OWN (8): --dur-fast, --fs-em-65, --fs-em-75, --fs-em-85, --grid-repeat4-1fr, --r-xl, --sp-18, --sp-em-38
- SHARED (21): --accent, --align-flex-start, --disp-grid, --disp-none, --ease, --flex-1, --flexwrap-wrap, --fs-base, --fs-em-70, --fs-xl, --justify-center, --sp-14, --sp-30, --sp-7, --sp-8, --sp-9, --sp-em-36, --ta-right, --track-label, --track-title, --tt-label

### Drum Sampler — INSTRUMENTS
Files: src/instruments/drum-sampler.js
- OWN (7): --anim-hit-flash, --anim-miss-flash, --fs-em-75, --fs-em-85, --grid-repeat4-1fr, --grid-repeat4-minmax90, --touch-manipulation
- SHARED (13): --accent, --disp-grid, --flexwrap-wrap, --fs-base, --fs-em-70, --fs-xl, --justify-center, --line-dashed, --op-dim, --sp-16, --sp-20, --sp-9, --track-title

### Patch Synth — INSTRUMENTS
Files: src/instruments/patch-synth.js
- OWN (6): --angle-vertical, --glow, --math-group, --stroke-heavy, --stroke-semi, --tr-bg-border
- SHARED (58): --accent, --align-flex-end, --cable-drag, --cur-ew-resize, --cur-grab, --cur-grabbing, --cur-not-allowed, --disp-grid, --disp-none, --edge-audio, --edge-control, --edge-hover, --edge-refused, --flex-0-0-auto, --flex-1-1-0, --flexwrap-wrap, --font-mono, --fs-base, --fs-micro, --fs-xs, --graph-grid, --graph-ground, --justify-space-between, --lh-none, --line-solid, --node-border, --node-dimmed, --node-dragging, --node-fill, --node-head, --node-selected, --op-dim, --op-faint, --ov-visible, --port-active, --port-in, --port-out, --r-panel, --r-pill, --raise, --recess, --sp-10, --sp-60, --sp-hair, --stroke-bold, --stroke-dash, --ta-left, --to-ellipsis, --tr-background, --tr-color, --tr-stroke, --track-label, --track-title, --tt-label, --ws-nowrap, --z-drag, --z-raise-1, --z-raise-2

### Spectrum / Scope (ch1 instrument) — VIS
Files: src/vis/spectrum.js, src/vis/scope.js
- OWN (0), SHARED (0) — these two files only use the 4 GLOBAL layout tokens (`--box-border-box`, `--disp-block`, `--pct-100`, `--pos-relative`). Canvas color is resolved to real color strings at draw time, not read via `var()` — noted in a spectrum.js comment ("A canvas needs real color strings, not `var(--x)`").

### Meter (master tap) — VIS
Files: src/vis/meter.js
- OWN (0), SHARED (0) — 6 GLOBAL tokens only.

### Governor Meter — VIS
Files: src/ui/cpu-meter.js
- OWN (0)
- SHARED (2): --edge-refused, --meter-hot

## dev-splash.html edit — Task 2

Rebuilt the devbar as expand/collapse rows, per group and per entry.

- Group headers (FRAME, SURFACES, …) are now buttons that toggle a
  `data-collapsed` state per group; collapsed by default except the group
  holding the currently-selected entry.
- Each entry row got a details toggle. Expanded, it lists its own tokens
  in three tiers — OWN first (bold, full opacity), SHARED next (normal
  weight), GLOBAL last (dimmed, `--text-dim` + `--op-faint`) — plus a
  count badge (`N own / N shared / N global`).
- Token data for all 28 entries is baked into a `TOKEN_ATTRIBUTION` object
  literal near the top of the script block, generated from this receipt's
  numbers, keyed by entry id (matches `CATALOG_BY_ID`).
- Existing selection/render logic at `railRows()` (~1040) and the mount
  loop (~1254) untouched — the new expand/collapse state lives in its own
  `Set` of open group names and an entry-row click handler that only
  toggles a class, never calls `mount`/`select`.
- No new hex literals — badge and tier styling reuses `--panel`, `--line`,
  `--text`, `--text-dim`, `--accent`, `--r-sm`, `--op-faint`, spacing
  tokens already declared in dev-splash.html's own `<style>` block.

---

SESSION REVIEW — dev-splash devbar token attribution — 2026-09-02

EDITS
- [tools/dev-splash.html](../../tools/dev-splash.html) — devbar rebuilt as expand/collapse rows with per-entry token tiers + count badges

STRAY FILES
- none — scratch python/grep work stayed in the scratchpad tmp dir, not written into the repo

GOALS DONE
- Task 1: per-entry token attribution for all 28 devbar entries, GLOBAL/SHARED/OWN buckets, not-in-tokens.css flags
- Task 2: devbar rebuilt as collapsible group/entry rows showing the attribution

BRANDON'S TODOS
- none raised

CLOSER REVIEW
- Gets copy of review, not a contract.
- GLOBAL set correction (41 not 45) and the shell.js/daw-shell.js FRAME correction are load-bearing — worth a look — Brandon / closer
- INDEX.md entry for this receipt — closer
