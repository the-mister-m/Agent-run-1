# RECEIPT — `shell-cleanup` — P4 post-S3

2026-08-31 22:38 EDT

## DELIVERABLE STATE

**TASK 1 — demo instrument pulled. DONE.** `wireDawShell()` no longer mounts an instrument
anywhere. Deleted `mountChannelInstrument()` (the demo-only helper) and its call site.
`mountProjectHeader()` now always gets `instrument: null` for the CPU meter — same path it
already used when no `instrumentCtor` was passed. `index.html` no longer imports
`WaveSynth` or passes `instrumentCtor`/`channelId`; `wireDawShell(shell)` takes no args.
`mountDawShell()` untouched — same signature, same 15 named mount points (plus the
pre-existing `daw-root`/`mixer` DOM ids, unrelated to this pass — 16 `[data-mount]`
elements total in the live DOM, unchanged by this edit). `wireDawShell()`'s own exported
signature (`handle, {instrumentCtor, channelId}`) is untouched — the params are simply no
longer read, so a caller passing them is a silent no-op, not an error.
Verified headed Chromium (Playwright, session scratch dir): `strip-ch1` has 0 DOM children
after `wireDawShell()` runs. Zero page/console errors on load.

**TASK 2 — arm/punch reconciled. DONE**, per Brandon's ruling (punch global, arm per-lane).
- `src/core/state.js` — `project.recordArmed` and `setRecordArmed()` deleted.
  `project` is now `{ punch: {on, startBar, endBar} }` only.
- `src/ui/daw-shell.js` — transport bar's global ARM checkbox/label/listener removed
  entirely (markup, DOM refs, init, change listener, `store.on('project', …)` repaint).
  PUNCH checkbox/steppers untouched — still global, still `store.project.punch` /
  `store.setPunch()`. CSS rule for `[data-role="arm"]` dropped from the injected
  stylesheet; `--arm-on` itself is not orphaned — `arrangement.js` still consumes it for
  its own per-lane arm buttons.
- `src/ui/arrangement.js` — **read, not edited.** It never imported `core/state.js` and
  never read `project.recordArmed`/`project.punch` — its six lanes each own a private
  `Capture` instance for arm AND punch, fully self-contained. The contract it consumes
  (`CHANNEL_IDS` from `daw-shell.js`) did not change shape, so nothing here broke and
  nothing needed editing. Confirmed by grep: zero references to `state.js`, `recordArmed`,
  or `store.project` anywhere in the file.

**TASK 3 — device-dynamics verified live. PASS, no defect.** Ran
`docs/scratchpad/device-dynamics-test.html` headed (Playwright Chromium, session scratch
dir), clicked all 8 buttons in order: gate open/closed dot + threshold readout rendered,
compressor gain-reduction bar rendered, state round-trip both `true`/`true`, `cpuWeight`
read back 3 (gate) / 45 (compressor) matching §16.2's table, dispose reported
`nodesDisconnected: 6/8`, `listenersDropped: 4/6`. Zero page errors, zero console errors on
a clean repeat run. Nothing to fix in `gate.js`/`compressor.js`/`gain-reduction.js`.

## NEXT ACTION

None from this seat. `mixer-strips`/`node-graph` still decide what fills `strip-ch1`'s DOM
for real (now genuinely empty, not fighting a demo mount).

## OPEN DECISIONS

- **`arrangement.js`'s punch model conflicts with Brandon's ruling, not fixed — not this
  seat's file.** Brandon: punch is a global timeline range, in `state.project`. But
  `arrangement.js` builds punch PER LANE (its own `punchState` object, stepper UI, and
  `capture.punchIn/punchOff` call per lane — see `_buildLane`), independent of
  `state.project.punch` entirely, and does not consume it. TASK 2's instruction was to edit
  arrangement.js only if the contract it consumes changed shape — it didn't (see above), so
  per-lane punch stands, unedited. Flagging because the ruling is now decided and
  arrangement.js's shipped behavior does not match it. **Decider: Brandon/Troubleshooter** —
  whether `arrangement.js` gets a follow-on pass to drop its per-lane punch UI in favor of
  reading/writing the one global `state.project.punch`, keeping only arm per-lane.
- **`instrumentCtor`/`channelId` params on `wireDawShell()` are now dead weight.** Kept per
  the hard constraint ("every existing export name and signature stays"). No caller in the
  repo passes them anymore. Not removed — flagging in case a later seat wants the signature
  trimmed once nothing depends on it staying stable.

## FILE LOCATIONS

- Edited: [src/ui/daw-shell.js](../../../src/ui/daw-shell.js) — demo instrument removed,
  global arm removed
- Edited: [src/core/state.js](../../../src/core/state.js) — `recordArmed` dropped from the
  `project` slice
- Edited: [index.html](../../../index.html) — no longer imports `WaveSynth` / passes demo args
- Read, not edited: [src/ui/arrangement.js](../../../src/ui/arrangement.js) — see OPEN
  DECISIONS
- Read: `Builddocs/CONTRACTS.md` §16.0, §16.0b, §16.1, §16.4, §16.9, §16.9a, §16.11 · seat
  table · `receipt-daw-shell.md` (incl. CORRECTION PASS) · `receipt-arrangement.md` ·
  `receipt-device-dynamics.md`
- Verification, local only (session scratchpad, not committed):
  `/private/tmp/.../scratchpad/pw/verify-shell.mjs`,
  `/private/tmp/.../scratchpad/pw/verify-device-dynamics.mjs`,
  `/private/tmp/.../scratchpad/shell-cleanup-verify.png`,
  `/private/tmp/.../scratchpad/device-dynamics-verify.png` — Playwright + Chromium
  installed into this session's own scratch dir only, not this repo
