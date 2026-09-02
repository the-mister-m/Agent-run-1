# RECEIPT — `governor`, P4/S5

2026-08-31 23:51 EDT

## DELIVERABLE STATE

`src/ui/cpu-meter.js` shipped. Exports `createGovernorMeter({ instrument, graph })` and
`restoreNoCap()`. Wraps `ui/shell.js`'s `createCpuMeter` (load bar, voice count, `noCap`
checkbox, audio-state/unlock) rather than duplicating it — reused via
`acquireShellStyle`/`releaseShellStyle` and by mounting the base widget's own `.el` inside
mine. Named `createGovernorMeter`, not `createCpuMeter` — `shell.js` already exports that
name and a P5 integration file will need both without aliasing.

Verified in a real headed Chromium (Playwright's own bundled build, `channel` unset, fresh
`mkdtemp` profile, never the system Chrome binary; served over `python3 -m http.server`,
never `file://`). 24/24 assertions pass. Harness:
[docs/scratchpad/governor-verify.html](../../../docs/scratchpad/governor-verify.html)
(throwaway, named here — imports `core/audio.js`, `mixer/graph.js`, and `cpu-meter.js`
directly; constructs a real `Graph` unmounted, since `_render`/`_repatch` both no-op when
unmounted/unbound, so no DOM graph editor is needed to exercise the logic). Driver script
lived in this session's own scratch dir, not in the repo.

### Seat questions

1. **What does the meter show?** `governor.load`, smoothed, live, inherited unchanged from
   `shell.js`'s base meter (0.00-1.00, band-colored `--meter-ok`/`--warn`/`--meter-hot`).
   Verified tracking through voicePool counts of 1, 8, 16, and 32 (registered directly via
   `voicePool.register()`, since a real instrument's `noteOn` never truly refuses — see Q5),
   and through injected scheduler-pass load via `governor.reportSchedulerPass()`.

2. **Does it show what is consuming the budget?** Yes — a breakdown row: `nodes X/24`,
   `inserts X/4`, `sends X/2`. Nodes is `graph.nodeCount`. Inserts/sends are the **busiest
   channel's** counts, computed by walking the graph's own public `nodes`/`edges` the same
   way `graph.js`'s private `_serialChain`/`connect()` do (port-0 chain length for inserts,
   `fromPort > 0` edges off a channel node for sends) — read-only, no private method calls,
   no edits to `graph.js`. A student who sees `inserts 4/4` on the badge knows which
   channel to go fix. Recomputed only on the graph's `'change'`/`'refused'` events, not on
   rAF — see Q6.

3. **Where is the no-cap toggle, and who can reach it?** The checkbox `shell.js`'s base
   meter already builds — one click, no dev console, no query string, no hidden gesture,
   inside the mounted widget. My file adds persistence on top of the same input element,
   it does not build a second toggle. Placement (transport bar, next to tempo, always
   visible) is already settled by CONTRACTS §8/§16.8 and the brief's own "Big picture"
   line — not re-escalated.

4. **What does the meter do when `noCap` is on?** Verified live: `governor.load` still
   reads and still bands to `hot` with `noCap` on (nothing about `noCap` touches load — it
   only gates `governor.request()` and the graph's own cap checks, both already frozen /
   out of my lane). The breakdown badges switch to `X/∞` and stop painting hot, since
   nothing is capped to compare against.

5. **What does a refusal look like when `noCap` is off?** `graph.js` already draws
   insert/node/send refusals inline on its own canvas with a reason (frozen, not mine, not
   duplicated). My meter adds a second, transport-bar-visible surface: on `graph.on('refused', …)`
   it shows the same reason string in a banner, cleared on the next successful `'change'`
   (not a timer — no token exists for an auto-hide delay, and a `setTimeout` literal in a
   P4 file would be an invented dial with nothing to back it). Verified: filling `ch1` to
   its 4-insert cap and adding a 5th produced `refused === false` and the banner text
   `"ch1 is full — 4 inserts."` **Voices are a separate case — §10-A: a note is never
   refused, `wave-synth.js`/`overtone-synth.js`/`drum-synth.js`/`drum-sampler.js` all steal
   and retry rather than dropping a note, so there is no voice-refusal UI to build.**

6. **Does the meter cost anything?** Measured, not assumed: 200 `addInsert`/`removeNode`
   round trips on the real graph, timed with the meter bound vs. unbound
   (`performance.now()`). Added cost was ~13-15µs per graph `'change'` event across three
   runs — the only place this file does any work beyond what the wrapped base meter
   already did. No rAF loop of my own; the breakdown only recomputes on graph events, never
   per frame, which is the architectural choice that keeps this "nearly free."

7. **Does it persist?** Yes. `noCap` is written to `localStorage` (`cbdaw.governor.noCap`)
   on every toggle, read back via the standalone exported `restoreNoCap()`, guarded
   try/catch on both sides — same pattern `devbox.js` already uses for a guest-mode
   Chromebook that throws on storage access. Default is OFF (conservative) on a clean
   store. Verified: toggle on → `localStorage` reads `'1'` → `governor.noCap` reset to
   `false` (simulating a fresh module load) → `restoreNoCap()` puts it back to `true`.
   **Integration note, not this seat's file to fix:** `restoreNoCap()` must run before
   *any* `createCpuMeter()` call anywhere reads `governor.noCap`, including `daw-shell.js`'s
   own header meter (see FILE LOCATIONS) — whoever wires boot order in P5 calls it first.

8. **Compact only, and clean disposal.** One compact widget, no expanded variant (none of
   §16.8's data needs one). `dispose()` unbinds the graph listeners (via `graph.off`, not
   an unsubscribe return — see KNOWN DEFECT below), disposes the wrapped base meter,
   removes its own DOM and stylesheet ref. Verified: rAF frame count stops advancing after
   `dispose()`, and the mount no longer contains the meter's root.

## A REAL BUG FOUND MID-BUILD, FIXED BEFORE SHIPPING

`mixer/graph.js`'s `on(event, fn)` returns `this` (the `Graph` instance), not an
unsubscribe function — unlike `state.js`'s `bindState`-style convention in CONTRACTS
§16.9. A first draft of `bindGraph`/`unbindGraph` assumed the unsubscribe-return shape and
would have thrown on `unbindGraph()`. Fixed to store the handler reference and call the
graph's own `off(event, fn)`. Caught by running the harness, not by reading — logged here
because it is exactly the kind of cross-seat API mismatch this stage's collision map exists
to prevent, and `graph.js` is correct as shipped; nothing there needed a report.

## KNOWN DEFECT — reported, not fixed (audio.js is frozen, not my file)

`governor.request(cost)` in `core/audio.js` takes `cost` and never reads it — it returns
`voicePool.count < 32` regardless of what is being asked for, or `true` when `noCap` is on.
Confirmed live: registering 32 fake voices makes `governor.request(3)` (a `gate` device's
`estimatedWeight`) refuse even though a gate costs nothing like a 33rd voice; releasing the
voices makes the same call succeed again. **What a fix would take:** `audio.js` would need
either a second weight-based ledger alongside `voicePool.count`, or `request(cost)` would
need to fold `cost` into an admission test against a real budget instead of a flat
voice-count comparison — a P1 design change, not a P4 one, and `audio.js` is frozen to
every P4 seat, not just mine. §16.8 already states this as found rather than picked, and
lists the mitigation already in place: `graph.js` enforces its own CAP_NODES/CAP_INSERTS/
CAP_SENDS **before** ever calling `governor.request()`, so a real insert never actually
leans on the broken weight check to get refused — it gets refused by `graph.js`'s own
count caps first. Owner if this is ever revisited: whoever owns `core/audio.js` (P1).

## NEXT ACTION

For P5's package seat: import `createGovernorMeter` from `ui/cpu-meter.js`, call
`restoreNoCap()` as early as possible in boot (before `daw-shell.js`'s header meter or any
other `createCpuMeter()` call reads `governor.noCap`), bind it to the real `Graph` instance
once one exists on the page (`meter.bindGraph(graph)`), and mount `meter.el` in the
transport bar next to tempo per the brief's "Big picture" line. `daw-shell.js` is frozen to
this seat, so the actual mount-point wiring was not done here — flagged, not silently
skipped: TODO.md's `node-graph` entry already says *"Nothing constructs a `Graph` yet…
`index.html` is frozen to the S4 seat, so wiring it is a later seat's job"* — the same is
true for this file. `test-p4` and `redpen-p4` can drive `cpu-meter.js` standalone with the
scratch harness pattern above; it needs no page wiring to exercise every seat question.

## OPEN DECISIONS

None escalated. Toggle placement and reachability were already settled by CONTRACTS
§8/§16.8 and the brief itself (see Q3) — restated as a decision made explicit, not
re-litigated. `governor.request(cost)` ignoring `cost` is CONTRACTS' own open item
(§16.12 #7, "Decider: the Troubleshooter, if a P4 seat reports that the voice-count-only
answer bit them") — reported above; this seat did not hit a case where it needed to be
fixed to ship, since `graph.js`'s own caps front-run it.

## FILE LOCATIONS

- [src/ui/cpu-meter.js](../../../src/ui/cpu-meter.js) — this seat's only owned file.
  `createGovernorMeter({ instrument, graph })`, `restoreNoCap()`. Zero raw literals —
  every colour/size/spacing/weight/radius is `var(--token)`, no fallback, grep-verified.
- [docs/scratchpad/governor-verify.html](../../../docs/scratchpad/governor-verify.html) —
  throwaway browser harness, 24 assertions, kept as the receipt for the headed-Chromium
  run. Not imported by anything shipped.
- Read, not written: [src/ui/shell.js](../../../src/ui/shell.js) `createCpuMeter`,
  `acquireShellStyle`, `releaseShellStyle` (§5) — wrapped, not duplicated.
  [src/mixer/graph.js](../../../src/mixer/graph.js) — public `nodes`/`edges`/`nodeCount`/
  `on`/`off`, `CAP_NODES`/`CAP_INSERTS`/`CAP_SENDS` — read only, frozen to this seat.
  [src/core/audio.js](../../../src/core/audio.js) — `governor`, frozen, defect reported
  above, not touched.
