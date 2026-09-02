# RECEIPT — `spec-transport` (P4/S1)

Stamped 2026-08-31 21:26 EDT. Model: Opus 5 (1M). Seat brief:
[A-spec-transport.md](A-spec-transport.md) · Output: [CONTRACTS.md](../../CONTRACTS.md) §16.

## DELIVERABLE STATE

**CONTRACTS §16 Channels, Devices, and Graph — WRITTEN. Append only: 829 lines added,
0 removed (`git diff --stat`). §1–§15 untouched.**

**`src/ui/tokens.css` — 85 P4 tokens APPENDED.** See TOKENS below. This is the one `/src`
write in this seat, and it is Brandon's override of the seat brief, quoted in that section.

All twelve seat questions answered.

| Q | answered in |
|---|---|
| 1 · what is a channel | §16.1, §16.1a, §16.1b |
| 2 · what is a device | §16.2 |
| 3 · which visual, which device | §16.3 table + §16.3a–e |
| 4 · the EQ's parameters | §16.3c — **Gain · Freq · Q**, three peaking bands |
| 5 · strip vs display only | §16.4, §16.4a (`setRouting`), §16.4b |
| 6 · the graph as data | §16.5, §16.5a, §16.5b |
| 7 · graph↔strip one-way | §16.5d, §16.4 (`setInserts` has one caller) |
| 8 · what can be automated | §16.6 |
| 9 · patch synth nodes | §16.7.1–16.7.8 |
| 10 · governor and `noCap` | §16.8 — `noCap` confirmed as a runtime property, ships deployed |
| 11 · what is undecided | §16.12, seven items, decider named on each |
| 12 · the seven bind methods | §16.9, §16.9a — eight names, `attachState` struck |

### DONE-CHECK — the six S3 seats, derived from §16 alone

Each list below is what that seat produces reading only §16. **No file appears twice.**

**`mixer-strips`** → `/src/mixer/strip.js`, `/src/vis/meter.js`
`Strip` class: `constructor(ctx,{id,label,instrumentId,isMaster})` · `input` · `output` ·
`gain` · `pan` · `mute` · `solo` · `meterTap` · `setInserts(devices)` · `inserts` ·
`setRouting(view)` · `getState` · `setState` · `mountCompact` · `unmount` · `dispose`;
`createStrips(ctx, specs)`. `Meter` class: `constructor(analyser, opts)` · `mount` ·
`unmount` · `dispose` · `level` · `peak`.

**`device-dynamics`** → `/src/devices/gate.js`, `/src/devices/compressor.js`,
`/src/vis/gain-reduction.js`
Two §16.2 devices (`Gate`: threshold/attack/release, `readout {open, levelDb}`, weight 3;
`Compressor`: threshold/ratio/attack/release/makeup, `readout {reductionDb,inputDb,
outputDb}`, weight 45) + `GainReduction` visual polling `device.readout`.

**`device-spectral`** → `/src/devices/eq.js`
One §16.2 device. Three peaking bands, `band<n>.gain|freq|q`, weight 29,
`getAnalyser('spectrum')` post-filters, `new Spectrum(device)` reused unedited, curve on
its own overlay canvas.

**`device-space`** → `/src/devices/reverb.js`, `/src/devices/delay.js`
Two §16.2 devices. `Reverb`: size/damping/mix, `cpuWeight` from the live IR (§8 table).
`Delay`: time/feedback/tone/mix, weight 5. Both branch-safe, both `getAnalyser` → `null`.

**`arrangement`** → `/src/ui/arrangement.js`
Six lanes + ruler; mounts `PianoRoll` / `StepGrid` unedited; reads `clock.loop`,
`clock.position` from rAF; subscribes to `capture.on('commit')` itself and branches on
`kind` (§16.9a) instead of calling `roll.bindCapture()`.

**`patch-synth`** → `/src/instruments/patch-synth.js`
Full §2 instrument + internal node graph: `osc` `noise` `lfo` `env` `filter` `gain` `out`
`add` `multiply` `scale` `invert`; audio/control port domains; 24-node cap of its own;
`getState`/`setState` round-trips every node and cable.

**Downstream, also non-overlapping:** `node-graph` → `/src/mixer/graph.js` ·
`automation` → `/src/mixer/automation.js` · `governor` → `/src/ui/cpu-meter.js`.

**Collision risks defused in §16.11:** no `/src/devices/device.js` (three device seats
would each write it) · `meter.js` and `gain-reduction.js` are two owners, not one ·
no S3 seat imports `graph.js`, which does not exist yet.

## TOKENS — Brandon's override, 2026-08-31 21:34 EDT

**His words:** *"MAKE SURE THAT WE ARE BUILDING SO THAT THE TOKENS ARE IN THERE!!!!! I WANT
TO SKIN EVERYTHING WE BUILD WITHOUT WORRYING ABOUT HAVING TO GO BACK!!!"*

The first draft of §16.10 named 29 tokens and told seats to write `var(--token, fallback)`.
That was wrong: a fallback means the dial is not in the file, so he would have had to go
back. Fixed both ways — audited wider, and written into `tokens.css` with real values.

**Appended to `src/ui/tokens.css`, under `P4 — THE DAW`: 85 tokens, zero collisions with
the 262 already there, zero existing values changed, append only (`>>`), braces balanced.**
Colours and leaf values in a new `:root` block; the two derived tokens in a new `*` block,
per the file's own rule 2.

| surface | new | note |
|---|---|---|
| ground | 2 | `--recess` / `--raise` — the two steps the 3-step ground lacked |
| mixer strip | 13 | fader, pan, mute/solo, slot face + empty + route chip |
| meter | 4 | track, peak hold, clip, dB ticks (fills reuse `--meter-ok`/`--meter-hot`) |
| gain reduction | 3 | own track/fill/zero — reduction hangs DOWN, it is not a level |
| devices, all five | 6 | head, knob track/fill/pointer, bypass on/off |
| EQ | 6 | curve, fill, handle, three band identities |
| gate | 3 | open, closed, threshold mark |
| pop-out | 2 | ground, scrim |
| graph + patch cables | 17 | node 6, port 3, edge 5, ground/grid/drag/math-group |
| automation | 6 | ground, grid, curve, point, point-on, step |
| arrangement | 11 | ruler 3, lane 3, clip, playhead, loop, punch, arm |
| transport + header | 5 | ground, button face/active, play-on, rec-on |
| stacking | 2 | `--z-scrim` 35, `--z-drag` 45 |
| motion | 3 | transform, stroke, color transitions |
| canvas | 2 | `--canvas-lw-2` / `--canvas-lw-3`, derived, `*`-scoped |

§16.0b and §16.10 rewritten: **`var(--token)`, no fallback. A raw literal is a defect.**

**Reused rather than invented** — the existing vocabulary already covers radius (`--r-*`,
8 steps), spacing (`--sp-*`, 40 steps), type (`--fs-*`), weight, tracking, line-height,
opacity (`--op-*`), border weight (`--bw-*`), SVG stroke (`--stroke-*`), canvas alpha
(`--fade-*`), shadow, glow, duration, easing, and the whole layout/cursor/keyword axis.

**Not tokenised, deliberately, each with the reason:**
- **Geometry** — strip width, meter width, lane height, node width, port size. These
  compose from `--sp-*` (strip `--sp-30`, meter `--sp-4`, lane `--sp-14`, node `--sp-60`)
  so `--sp-unit` stays the one density dial. Giving them P4-only tokens would create a
  second dial that fights the first.
- **`vis/spectrum.js` and `vis/scope.js` internals** — frozen P1 files with their own
  token maps. The EQ reuses `Spectrum` unedited, so the spectrum's trace and grid stay on
  P1's dials. The EQ's own overlay canvas is on the new `--band-*`.
- **`--deg-*`** — not borrowed anywhere in P4. §9: a visual wearing a degree colour teaches
  a student an association that is not true. The three EQ bands got their own hues for
  exactly this.

**No P4 surface was left untokenizable.**

## NEXT ACTION

`daw-shell` (P4/S2) builds `/index.html`, `/src/ui/daw-shell.js`, `/src/core/state.js`
against §16.1 (the channel chain it mounts instruments into) and §16.11 (its file list).
`state.js` today declares `const EVENTS = ['scale']` — S2 extends that list; three shipped
P3 surfaces subscribe through `state.on('scale')` and must keep working.

Six S3 seats follow in parallel. `patch-synth` is spec'd severable at §16.7.1–16.7.8 for a
two-agent split.

## OPEN DECISIONS

Full text in **CONTRACTS §16.12**. Summary, decider named:

1. **Master inserts** — shipped empty; `audio.js`'s master chain is frozen. *Brandon.*
2. **Meter tap position** — post-fader. *Brandon* (how signal flow reads).
3. **Fader-grab rule** — default: hand wins while held, lane resumes next point. *Brandon.*
4. **Gate/reverb/delay visuals** — minimal as specified. *Brandon.*
5. **`tools/patch-synth.html` + `shell.js`'s `TOOLS` row** — in no P4 seat's lane.
   *Troubleshooter:* assign or defer to P5.
6. **EQ band type** — three peaking bands. *Brandon.*
7. **`governor.request(cost)` ignores `cost`** — stated as found, not worked around.
   `audio.js` frozen. *Troubleshooter*, only if a seat reports being bitten.

**Reported, not fixed** (frozen files, no seat may touch them):
- `piano-roll.js` `_onCaptureCommit` does not branch on capture's `kind`; `'requantize'`
  restates every note and the roll adds a duplicate copy. Latent, P4-facing.
  Routed around in §16.9a. Source: `redpen-p3` finding 7.
- `governor.request(cost)` and the missing insert/send/node caps in `core/audio.js`
  (§16.8). Callers enforce.

**Not litigated:** `Builddocs/P0-run-open/open-decisions.md` D-numbers. §16 answers the
questions its brief asked and cites §7/§8's own `PROVISIONAL` marks where they exist.

## FILE LOCATIONS

- Spec: [Builddocs/CONTRACTS.md](../../CONTRACTS.md) §16 (appended at end of file)
- Tokens: [src/ui/tokens.css](../../../src/ui/tokens.css), `P4 — THE DAW` block at end
- This receipt: `Builddocs/P4-the-daw/S1-spec/receipt-spec-transport.md`
- Brief: [A-spec-transport.md](A-spec-transport.md)
- Phase: [PHASE.md](../PHASE.md) · Stage collision map: [S3-systems/STAGE.md](../S3-systems/STAGE.md)
- Evidence read: `src/core/audio.js`, `src/core/state.js`, `src/core/clock.js`,
  `src/core/capture.js`, `src/ui/shell.js`, `src/ui/tokens.css`, `src/vis/spectrum.js`,
  `src/surfaces/piano-roll.js`, `src/surfaces/step-grid.js`,
  `src/instruments/chord-module.js`, [redpen-report.md](../../P3-harmony-tool/S7-verify/redpen-report.md)
- Stray files: none. Written this seat: `CONTRACTS.md` §16, `src/ui/tokens.css` (append
  only, Brandon's order), this receipt, one INDEX line, one SESSIONLOG line.
