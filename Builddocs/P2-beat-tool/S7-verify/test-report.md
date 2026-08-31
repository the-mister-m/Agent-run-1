# TEST REPORT — P2 Beat Tool — `test-p2` (P2/S7)

Seat: `test-p2`, TEST function. Brief: [A-test-p2.md](A-test-p2.md). Receipt:
[receipt-test-p2.md](receipt-test-p2.md).
Written: 2026-08-23 20:55 EDT. All evidence below is independently measured against the real,
shipped code (`/tools/beat.html`, `/src/core/clock.js`, `/src/core/capture.js`,
`/src/instruments/drum-synth.js`, `/src/instruments/drum-sampler.js`), via real headless
Google Chrome + Playwright served over `http://127.0.0.1`, never `file://`. No `/src`,
`/tools`, or `/assets` file was written by this seat. Raw JSON/log files: see receipt's FILE
LOCATIONS.

---

## 1 · Does the phase done-check pass?

**PASS.** Every clause of [PHASE.md](../PHASE.md) has independent, measured support:
- `/tools/beat.html` loads clean on a static file server — 0 page errors, `.bt-error` absent,
  `KitPair.pieces` matches CONTRACTS §14.1 exactly.
- Both machines wired to one shared grid/pattern — confirmed via pieces-match assertion;
  audible-trigger-count cross-check 7/7 identical.
- Triplet mode works — 0 tick drift at division=3 over 64 bars (§4 below).
- Velocity per step works — capture wrote real `{v}` values end-to-end through the live page.
- Live capture records and loops — confirmed independently (§6 below).
- Clock holds time under load — confirmed independently (§3 below).

## 2 · Does every seat's own done-check pass?

**PASS, 9/9.** The six BUILD seats (`clock`, `grid`, `drum-synth`, `drum-sampler`, `capture`,
`beat-shell`) plus the three repair seats spun up after them (`fix-clock`, `fix-grid`,
`fix-shell`) each report PASS on their own stated done-check in their own receipts. Not just
read — independently re-verified: `clock`'s 5-minute hold and 64-bar drift claims (§3/§4
below), `grid`'s triplet/velocity claims (via capture round-trip, §6), `drum-synth`/
`drum-sampler`'s governor-cap and second-kit claims (§7/§8), `capture`'s six behaviors (§6),
`beat-shell`'s mount/leak claims (§8), and `fix-clock`'s B3 loop-escape fix under a
genuinely long run — 400 wraps, 10× longer than any prior test of that bug (§3). `spec-clock`
and `recon-scheduler` (SPEC/RECON, not BUILD) were also read and cross-checked; their §3/§8
numbers matched CONTRACTS exactly (see §3/§8 below).

## 3 · Does the clock hold?

**PASS.**
- 5-minute metronome hold, unloaded: **0.000000 ms** accumulated drift. 601 beats scheduled,
  worst `|beat time − ideal|` = 0.000000 ms, 0 dropped windows, 0 doubled windows.
- 5-minute metronome hold, repeated under 32 voices/tick + 2 animating rAF visuals for the
  **whole run**: **0.000000 ms** accumulated drift. 601 beats scheduled, 0 dropped windows,
  0 doubled windows, both visual canvases sustained 18,014 frames each over the run.
- Scheduler jitter, idle vs. 32 voices + 2 animating rAF canvases (3 s samples): idle
  **p50 25.10 ms / p95 25.60 ms / max 26.20 ms**; loaded **p50 24.90 ms / p95 26.60 ms /
  max 27.30 ms**. Matches CONTRACTS §3's measured 25 ms interval figures.
- Genuinely-long loop run for the B3 loop-escape bug (`fix-clock`'s fix), 400 wraps (10× the
  longest prior test of this bug): **400 of 400 wraps completed, 0 doubled ticks, 0 dropped
  ticks at the seam, 0 escapes.**

## 4 · Does triplet-to-tick conversion drift over 64 bars?

**PASS — 0 ticks.** Accumulated error over 64 bars: **0 ticks**, both division=4 (16ths) and
division=3 (triplets), re-derived independently against the live `clock.js` (last step
122,880 ticks, expected 122,880 ticks, both divisions).

## 5 · Does the tab-background case recover?

**UNVERIFIED for the real 60-second backgrounding trigger** — automated Chrome tab
switching (two tabs, one context, `bring_to_front`) never reaches the OS-level focus change
Chrome's throttle keys off: `document.visibilityState` stayed `"visible"`, 0 `hidden` events
fired. This is the third independent confirmation of the same automation ceiling
`recon-scheduler` hit twice already.

As a proxy (same technique the `clock` seat used when it hit this same wall, scaled to a
genuine 3-second main-thread stall rather than the full 60 s): transport recovered cleanly.
Exactly 1 `resync` event fired, reseeked forward from tick 369 to tick 3150 (matching the
real wall-clock gap of ~2.90 s), `clock.state` stayed `'playing'` throughout, and the
scheduler resumed ticking normally afterward — no hang, no crash. This is supporting
evidence of recovery behavior, not a verification of the real 60-second trigger.

## 6 · Does capture do what it claims?

**PASS for six of seven. UNVERIFIED for the seventh (MIDI hardware), as instructed by this
seat's own brief.**
- **Record: PASS.** 2/2 hits captured to the correct lane.
- **Capture/keepLast: PASS.** Not refused — 1 hit committed from the rolling buffer with the
  transport merely playing, not recording.
- **Loop-overdub: PASS.** 2 passes; kick from pass 1 and hat from pass 2 both survive
  (additive, as designed).
- **Loop-replace: PASS.** A silent pass erases nothing already present after it — confirmed,
  not just cited.
- **Punch: PASS.** Armed lane written, unarmed lane's hit dropped and counted, untouched
  lanes came back byte-identical.
- **Count-in: PASS.** 1 hit dropped during count-in and counted as dropped, 1 hit after
  count-in captured.
- **Undo/redo: PASS.** before=1 → undo=0 → redo=1, exact.
- **Velocity from MIDI: UNVERIFIED.** No real MIDI hardware exists in this environment; per
  this seat's own brief, not claimed as a pass. A simulated-plumbing check (fake
  `MIDIAccess`/port object, real `input.attachMIDI()`) confirms wiring is intact — velocity
  20/127 → 0.1575, 127/127 → 1.0, both landed correctly on the grid — but this is supporting
  evidence, not a hardware verification.

## 7 · Does a second kit work with no code change?

**PASS.** `/assets/kits/kits.json` already lists two real kits, `["808", "acoustic"]`
(`acoustic` added by `drum-sampler`, P2/S4, as its own second-kit proof, zero source edits).
Independently re-verified live: both kits list, both load (`kitStatus.status === 'ready'`
for each), static `pieces` unchanged. This seat did not add a third kit under
`/assets/kits/` — that directory is out of this seat's lane — the existing two-kit history
already answers the question and was re-verified rather than re-created.

## 8 · What are the metrics?

- **Scheduler jitter, idle:** p50 **25.10 ms** / p95 **25.60 ms** / max **26.20 ms**.
- **Scheduler jitter, loaded (32 voices + 2 rAF visuals):** p50 **24.90 ms** /
  p95 **26.60 ms** / max **27.30 ms**.
- **Voices before glitch, `noCap` off:** **32** (60-note synchronous burst, `voicePool.count`
  held exactly at the CONTRACTS §8 default cap of 32, correctly enforced by the §11.2a
  synchronous-steal fix).
- **Voices before glitch, `noCap` on:** **60** (uncapped, same burst). "Glitch" itself is
  **UNVERIFIED** — no audio device exists in this environment, a standing limitation every
  prior seat has already named.
- **`governor.load` at 8/16/32 voices:** **0.0000** at all three — a known, already-flagged
  gap (`fix-clock` receipt, OPEN DECISIONS 1; not a new failure, not reported as one per this
  seat's brief). `clock.schedulerLoad` (the real, honest number `fix-clock` built) captured
  alongside: **0.0003** at 8 voices, **0.0001** at 16 voices, **0.0001** at 32 voices.
- **Sample decode time, real 8-file kit (`808`):** **5.70 ms.**
- **Page weight / cold load, `/tools/beat.html`:** **422,945 bytes** total, **12 resources**,
  **≈258 ms** cold load (headless Chrome, this hardware — a ceiling, not a Chromebook
  number, same standing caveat every prior seat carries).
- **Leak counts over 20 mount/dispose cycles:** **0 growth.** Outstanding (add − remove)
  listener count held **exactly 175** on every one of the 20 cycles — flat, no drift. DOM
  node count stayed 867–869 throughout. After a final full dispose: DOM down to 12, listeners
  down to 17 residual (the three module-lifetime singletons `audio.js`/`input.js`/`clock.js`
  are deliberately not disposed, per `beat-shell`'s own documented design).

## 9 · What failed, and who owns it?

**TWO ITEMS, BOTH ALREADY KNOWN AND FLAGGED, BOTH STILL UNFIXED.** No new functional failure
was found by this seat's own independent testing beyond these two — everything this seat
drove directly (clock, capture, kits, disposal, governor cap enforcement) matched its
contract.

1. **`src/ui/shell.js` line 58** — `{ id: 'beat', available: false, phase: 'P2' }` is still
   `false` even though Beat is fully built and shipped. Flagged by `beat-shell` (P2/S6) as
   its own OPEN DECISIONS item 2; unfixed by any of the three repair seats. **Owner:
   `tone-shell` (P1/S4, wrote `shell.js`) / Troubleshooter to route.** Low severity — the
   file menu on `wave-synth.html`/`overtone-synth.html` (and P4's future `index.html`) still
   labels Beat "not built yet."
2. **`src/instruments/drum-synth.js` and `src/instruments/drum-sampler.js`** — both inject
   stylesheets defining the same class names (`.ds-root`, `.ds-expanded`, `.ds-pads`,
   `.ds-pad`, `.ds-title`) with different values; on a page mounting both (`beat.html`),
   whichever injects second wins every tie. Flagged by `beat-shell` as its own OPEN DECISIONS
   item 12; unfixed. **Owners: `drum-synth` and `drum-sampler` (both P2/S4).** Cosmetic
   only — both machines still render and play correctly despite the collision.

---

Handoff: this file to `redpen-p2` and the Troubleshooter, per this seat's brief.
