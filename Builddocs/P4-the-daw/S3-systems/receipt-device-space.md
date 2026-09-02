# RECEIPT — device-space — P4/S3

Stamped 2026-08-31 22:03 EDT.

## DELIVERABLE STATE

Both devices built, verified in real headless Chromium (Playwright, chromium via
`test-device-space.html`), 19/19 checks pass. Answering the eight seat questions:

1. **Reverb, curriculum framing.** `ConvolverNode` fed by a generated impulse response.
   `size` (0.1–4.0 s) sets IR length — the room's dimension. `damping` (0–100%) shapes a
   one-pole smoothing pass over the IR noise before the decay envelope — how much the
   high end dies as it bounces. `mix` blends wet against dry. Adjusting `size` audibly
   changes room scale, not an abstract number.

2. **Delay, curriculum framing.** `DelayNode` + feedback loop: `delayNode → feedbackGain →
   toneFilter (lowpass) → delayNode`. `time` sets the repeat interval, `feedback` sets how
   many repeats survive, `tone` darkens each successive repeat through the filtered
   feedback path, `mix` blends the repeats against the source. The repeat is the
   `DelayNode`; the manipulation is the filtered feedback loop.

3. **Reverb affordability.** `estimatedWeight = 135` (§16.2's pre-construction ask).
   `cpuWeight` reads live off `size` via the §8 table (0.1s→133 … 4.0s→325), interpolated
   between rows, verified against all six table rows in the test harness. **This already
   differs from the brief's "8 cost units"** — CONTRACTS §8's own `[AMENDED 2026-08-22]`
   block supersedes that number (its own text: "getting reverb from 8 to ~247 mattered").
   §16.3d and §16.2 both already carry the corrected 135/133–325 figures, so my
   implementation matches CONTRACTS as written, not the brief's stale "8." Per my brief:
   I did not change any number — I built to the figure CONTRACTS itself already carries.
   **Flagging per my brief's escalation clause** since my measurement (135–325) differs
   from the "8" the brief cites — see ESCALATION below.
   Refusal handling is not mine: §16.3d has the graph call `governor.request()` before
   `new Reverb()` runs; a refused reverb is never constructed. Nothing in `reverb.js`
   touches the governor.

4. **Device interface, exact.** Both implement §16.2 verbatim: `static id/label/
   estimatedWeight/params`, `constructor(ctx)`, `get input()/output()`, `setParam/
   getParam`, `get/set bypass`, `getState/setState`, `getAnalyser(which)`, `get readout`,
   `mountCompact/unmount/dispose`, `get cpuWeight`. No extra method on either class.

5. **What they show.** Parameter readouts only — a label, a slider, a live value+unit per
   param, plus a bypass toggle. No picture, no canvas, no analyser draw. Matches §16.3's
   table row for both.

6. **Parallel chain.** `mix` is wet/dry balance built entirely inside each box (§16.3f).
   Neither device imports or reads the graph. Test harness ran reverb on an explicit
   branch (`oscGain → [sink directly, reverb.input]`, `reverb.output → sink`, `mix=100`)
   and it behaved identically to inline — no assumption of position anywhere in either
   file.

7. **State round-trip.** `getState()` returns only the three/four param values (JSON-safe,
   no `bypass`, no nodes) — `bypass` is its own getter/setter per §16.2, sibling to
   `state` in §7's insert shape, not inside it. Round-tripped through
   `JSON.parse(JSON.stringify(...))` into a fresh instance for both devices in the test
   harness; values matched exactly.

8. **Dispose.** Every node created in the constructor is disconnected in `dispose()`
   (7 nodes for delay, 5 for reverb); `unmount()` removes every DOM listener it added and
   clears `innerHTML`. 20 create/mount/dispose cycles in the test harness: 0 thrown
   errors, 0 leaked listeners. Neither device uses `requestAnimationFrame` — readouts sync
   only on `setParam`/`setState` calls — so there are no frames to leak.

**Styling.** Every colour, radius, spacing, weight, and transition in both files is
`var(--token)`, no fallback. Consumes the six `devices` tokens
(`--device-head --knob-track --knob-fill --knob-pointer --bypass-on --bypass-off`),
`--popout-ground` for the pop-out body, and reused base/scale tokens
(`--text --text-dim --line --font-ui --bw --w-med --tr-color --r-body --r-ctl --r-sm
--r-cell --fs-sm --fs-xs --sp-1 --sp-2 --sp-3 --sp-4 --sp-16`). No new token needed —
nothing escalated on styling.

**Test URL:** `Builddocs/P4-the-daw/S3-systems/test-device-space.html`, served from the
project root and driven headlessly (Playwright/Chromium) — click "Run Test" to reproduce.
19/19 checks passed, including the reverb cpuWeight table, both state round-trips, the
parallel-branch run, and the 20-cycle dispose sweep.

**Reverb's measured cost:** matches §8/§16.2 exactly — 133/150/165/184/235/325 across the
six IR-length rows, `estimatedWeight` 135. Confirmed live in the harness, not asserted.

## NEXT ACTION

None on this seat. Handoff is the two files, ready for `node-graph` (S4) to insert and
for `mixer-strips` to place in a strip's insert slots.

## OPEN DECISIONS

None raised by this seat beyond the ESCALATION below. No panning built (out of lane, on
`mixer-strips`). No routing editing built (STOP condition, respected).

## ESCALATION

Per my brief: "Escalate: if reverb's measured cost differs from CONTRACTS §8. You do not
change a cap." My build's cost (135 estimated, 133–325 live) matches CONTRACTS §8 and
§16.2 as currently written — both already carry the corrected, superseded-from-8 numbers.
It differs only from the "8 cost units" my brief itself quotes, which is CONTRACTS's own
pre-amendment figure. I did not change any number; I built to what CONTRACTS currently
says. Flagging so the Troubleshooter can confirm the brief's "8" is understood as stale
against the shipped §8/§16.2 text, not a live discrepancy I introduced.

## FILE LOCATIONS

- `src/devices/reverb.js` — reverb device
- `src/devices/delay.js` — delay device
- `Builddocs/P4-the-daw/S3-systems/test-device-space.html` — throwaway verification page
- `Builddocs/skinspecs/token-coverage.md` — updated, device-space's token consumption added
