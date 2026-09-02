# RECEIPT — `automation` — P4/S5

Stamped 2026-08-31 23:55 EDT. Seat brief: [A-automation.md](A-automation.md). Stage:
[STAGE.md](STAGE.md). CONTRACTS §16.0, §16.1, §16.6, §16.10, §16.11 read, per the seat
table. Read receipts, not source, per the brief: `receipt-mixer-strips.md`,
`receipt-arrangement.md` — then read `src/mixer/strip.js` and `src/core/clock.js` directly
anyway, because the receipts don't state the exact accessor/scheduling API an automation
writer needs to call and §16.6 names literal AudioParam methods this seat had to reconcile
against what `strip.js` actually exposes.

## LAUNCH CONFLICT, RESOLVED BEFORE ANY WRITE

The launch prompt named `src/ui/automation-lane.js`. The seat brief and CONTRACTS §16.11's
file-ownership table both name `/src/mixer/automation.js`. Neither file existed yet, so this
wasn't a code-vs-contract disagreement — held all writes and messaged the coordinator before
touching anything. Answer: brief + CONTRACTS were correct, the launch prompt was stale.
Built `/src/mixer/automation.js`.

## DELIVERABLE STATE

**Eight seat questions, answered:**

1. **What can be automated.** Exactly four targets, `AUTOMATION_TARGETS` /
   `TARGET_DOMAIN`: `strip.gain` (0…1.5), `strip.pan` (-1…1), `strip.mute` (0/1),
   `strip.solo` (0/1). `AutomationLane`'s constructor throws on any other string. Nothing
   else is wired — no synth param, no LFO, no envelope anywhere in this file.
2. **Continuous interpolation.** Linear in the target's own domain between adjacent points,
   held flat before the first point and after the last (`valueAt()`). §16.6 names
   `setValueAtTime`/`linearRampToValueAtTime` directly on the AudioParam — `strip.js`
   exposes no raw `AudioParam`, only value-setter accessors (`strip.gain = v`, which itself
   calls `setTargetAtTime` at `ctx.currentTime`), and `strip.js` is frozen to this seat. So
   `automation.js` reimplements the interpolation itself and resamples it at 50 Hz
   (`SAMPLE_S = 0.02`) through `clock.on('tick')`'s window, writing through the strip's own
   setter each time — never through a second, competing AudioParam write. Verified this
   sounds like a continuous fade, not a staircase, in real audio (see VERIFICATION).
3. **Stepped behavior.** No interpolation. A point's value is written exactly at its tick
   and held — nothing is written before a stepped target's first point (unlike continuous,
   which is anchored from the start so a ramp has something to ramp from).
4. **Drawing and editing a lane.** `AutomationLane.mountCompact(el)` — a canvas, token-only
   styling, sized `--sp-14` tall to match the arrangement's own lane height. Continuous
   targets: pointerdown+pointermove paints points along the dragged path (a literal
   hand-drawn fade); stepped targets: a click toggles an on/off block at the nearest beat.
   `clear()` and a visible `clear` button empty the lane. Compact only, no `mountExpanded`.
5. **Reads the clock, never schedules from rAF.** All strip writes originate from
   `clock.on('tick')`'s `{fromTick, toTick, timeOf, secPerTick}` window, scheduled through
   `clock.schedule(atTime, fn)`. `requestAnimationFrame` in this file draws the canvas
   (grid, curve, playhead position from `clock.positionTicks`) only — it never touches a
   strip target. Enforced, not just claimed: the test harness wraps `requestAnimationFrame`
   and monkeypatches `Strip.prototype`'s four accessors to flag any write made while inside
   an rAF callback. Zero violations across every run (see VERIFICATION).
   **Timing note, disclosed rather than hidden:** `clock.schedule`'s own docstring says its
   callback fires up to `LOOKAHEAD_S` (100 ms) *before* `atTime`, "early enough for the
   callee to schedule real audio for that exact instant" — i.e. it expects the callee to
   hold a real `AudioParam` and call `setValueAtTime(v, atTime)` itself. Lacking that,
   `automation.js` bridges the gap with a short residual `setTimeout` computed from
   `strip.ctx.currentTime` (`_writeAt()`), landing the actual write within single-digit ms
   of the intended instant instead of up to 100 ms early. This is the closest fidelity
   achievable against the frozen `strip.js` API without either a raw `AudioParam` getter or
   a scheduled-write method on `Strip` — flagged under OPEN DECISIONS for whoever might add
   one later.
6. **Serialization.** `AutomationLane.getState()` → `{target, points: [{tick, value}]}` or
   `null` if empty (an empty lane is not written, per §16.6). `setState()` reads it back.
   `createChannelAutomation(strip)` composes up to four lanes into exactly §7's per-channel
   `automation` array, empty lanes omitted, ordered `gain, pan, mute, solo`. Round-tripped
   through real `JSON.stringify`/`parse` in the live test with a byte-identical result.
7. **Automation vs. a student's hand.** The hand wins while held; the lane resumes once
   released — CONTRACTS §16.12 item 3's stated default, not re-litigated. Mechanism:
   `strip.js` keeps its own fader-drag state private (a closure-local `dragging` var, no
   public hook), so this seat listens for `pointerdown`/`pointerup`/`pointercancel`
   directly on the strip's own rendered fader/pan elements (`strip.wrap.querySelector(...)`,
   `.cbdaw-strip__fader` / `.cbdaw-strip__pan` — public, stable BEM classes `strip.js`
   already renders) rather than editing `strip.js`. `_held` gates both new scheduling and
   every pending write's final commit, so a write already in flight when the grab starts is
   still caught. `rebind()` exists for a lane built before its strip is mounted. Mute/solo
   need no such lock — a click and an automation write are both instantaneous, so ordinary
   last-write-wins is correct and is what the code already does.
8. **Compact only, clean disposal.** No `mountExpanded` anywhere. `dispose()` unsubscribes
   `clock.on('tick')`, unschedules every pending `clock.schedule` id, clears every pending
   residual timeout, unbinds the hand listeners, and unmounts the DOM/canvas/observers.
   `createChannelAutomation(...).dispose()` does this for all four lanes on a channel.

## VERIFICATION — real audio, real browser, not a passing assertion

Playwright's own bundled Chromium (`channel` not set), headed, `launchPersistentContext` on
a fresh `mkdtemp` profile outside the repo, installed to this session's own scratch dir
only. Served `python3 -m http.server 8000` from the project root, stopped after. No `pkill`,
no system Chrome touched.

Harness: [docs/scratchpad/automation-test.html](../../../docs/scratchpad/automation-test.html)
— a real `Strip`, a real oscillator into `strip.input`, a real `AutomationLane` per target,
`clock.bpm` raised to 480 only to compress a 4-bar fade into ~2 s of wall time.
Driver: [docs/scratchpad/automation-verify.mjs](../../../docs/scratchpad/automation-verify.mjs)
— 12/12 checks pass:

- no page or console errors (the two `favicon.ico` 404s the other P4 receipts also log,
  confirmed by URL and excluded)
- rAF never wrote a strip target (instrumented, not assumed)
- a gain lane drawn across 4 bars fades from 0.05 to 1.20 — the exact domain endpoints
- **the fade is audible**: `masterAnalyser`'s mean sampled level rises from 0.13 to 0.60
  across the run, measured off the real master bus, not asserted from the automation data
- a pan lane moves `strip.pan` from -0.93 to 1.00 across the same window
- a mute lane switches to `true` for the entirety of its bar-to-bar window and is `false`
  immediately outside it — no partial/interpolated state ever observed
- fader-grab: grabbing mid-fade holds the gain flat (`0.750` → `0.750` across 350 ms of
  continued playback) and releasing lets it resume climbing (`0.750` → `1.086`)
- `getState()` matches §7's shape field-for-field
- a `getState()` → `JSON.stringify` → `JSON.parse` → new lane's `setState()` → `getState()`
  round-trip is byte-identical
- an empty channel's `createChannelAutomation(...).getState()` is `[]`

## NEXT ACTION

None from this seat — every DONE-CHECK item met and independently measured. Whoever wires
channels into the arrangement/mixer for real (P5, or a later P4 integration pass) is the
next reader: `createChannelAutomation(strip)` is the entry point, one per channel; call
`.rebind()` after the strip's own DOM mounts if the automation lane was constructed first.

## OPEN DECISIONS

1. **`strip.js` has no raw `AudioParam` getter and no scheduled-write method.** §16.6 names
   `setValueAtTime`/`linearRampToValueAtTime` directly on the param; this seat cannot reach
   one without editing a file it does not own. Worked around with self-computed
   interpolation, 50 Hz resampling, and a residual `setTimeout` bridging `clock.schedule`'s
   early-fire gap (see seat question 5 above) — measured audibly correct, but not the
   literal mechanism §16.6 describes. **Decider: Troubleshooter** — only relevant if a
   future seat needs tighter-than-audible-tolerance timing than this already provides.
2. **Fader-grab detection reads `strip.js`'s rendered DOM by class name**
   (`.cbdaw-strip__fader`, `.cbdaw-strip__pan`), not a public API `strip.js` declares for
   this purpose. Those classes are stable and already relied on elsewhere in this codebase
   as an implicit contract, but nothing document-level promises they won't change. If
   `strip.js` ever grows a real drag-state hook (an event, a getter), this seat should move
   to it. **Decider: Troubleshooter**, not blocking.
3. **Master is not wired.** §7's schema gives `master` no `automation` array (only
   `channels[]` entries have one), so `createChannelAutomation()` is never called against
   the master `Strip`. Mechanically nothing stops it — `AutomationLane` would work against
   master's `.gain` and no-op harmlessly against its `.pan`/`.mute`/`.solo` — but building it
   would be outside what §7 defines. Not built. Flagged, not picked silently.

## FILE LOCATIONS

- Built: [src/mixer/automation.js](../../../src/mixer/automation.js) — the only file this
  seat owns
- Written, scratch, named per the brief:
  [docs/scratchpad/automation-test.html](../../../docs/scratchpad/automation-test.html) —
  DONE-CHECK harness ·
  [docs/scratchpad/automation-verify.mjs](../../../docs/scratchpad/automation-verify.mjs) —
  Playwright driver, re-runnable
- Session scratch, outside the repo, not committed: Playwright + Chromium installed under
  this session's own scratch dir (`.../scratchpad/pw/`), used only to run the two files
  above; nothing there is part of the deliverable
- Read, not edited: CONTRACTS §16.0, §16.0b, §16.1, §16.1a, §16.1b, §16.6, §16.10, §16.11,
  §16.12, §7 · `src/mixer/strip.js` · `src/core/clock.js` · `src/core/audio.js` ·
  `Builddocs/P4-the-daw/S3-systems/receipt-mixer-strips.md` ·
  `Builddocs/P4-the-daw/S3-systems/receipt-arrangement.md` ·
  `Builddocs/P4-the-daw/S4-graph/receipt-strip-tap-fix.md` (confirms the four automation
  targets were untouched by that seat's parallel edit)
- Verification: `node --check` clean · every `var(--token)` name in the file's injected
  stylesheet and its `TOKENS` read-list cross-checked against `tokens.css`, zero raw
  literals, zero fallback syntax · live Playwright run above, 12/12
