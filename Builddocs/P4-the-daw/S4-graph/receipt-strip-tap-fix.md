# RECEIPT — `strip-tap-fix` — P4/S4

Stamped 2026-08-31 23:44 EDT. Dispatch: this seat's own launch prompt (no seat-brief file —
reads: `receipt-node-graph.md`'s "yours, not mine" section, CONTRACTS §16.0b/§16.4/§16.4a/
§16.5/§16.5b, `src/mixer/strip.js`, `src/mixer/graph.js`).

## DELIVERABLE STATE

Brandon's ruling implemented: **all outgoing ports of a channel now tap the same point —
the post-fader tap — instead of port 0 (the insert chain) tapping pre-fader while ports 1-2
(sends) tapped post-fader.**

### `src/mixer/strip.js`

- `_wireChain()` no longer threads `_devices` into the chain. It now always wires exactly
  `channelIn → stripGain → stripPan → stripMute → meterTap → masterGain`. Devices are no
  longer part of this method at all.
- Added `get postFaderTap()` — additive, returns `this._meterTap`, the same node
  `meterTap` already returns. Two names for one node: `meterTap` is the vis reader's name,
  `postFaderTap` is the name `graph.js` now uses for the point every port fans out from.
  No existing getter, setter, or method signature changed.
- `setInserts()` is untouched in signature and remains the only writer of `_devices`; it no
  longer causes those devices to be wired into the strip's own chain — that's `graph.js`'s
  job now, entirely.
- Master's default `_routing.out` changed from `['Master']` to `['Output']` — the display
  default only, set once in the constructor. No routing behavior added; `setRouting()` is
  still never called on master (§16.4a gives it no `out` value and `graph.js` still never
  calls it there).

### `src/mixer/graph.js`

- Removed `_offChainInserts()`. `_repatch()`'s three passes are now: (1) `setInserts()` per
  channel, for slot display/registry only — no longer wires audio; (2) each channel's
  `postFaderTap` disconnected and reconnected to **every** one of its outgoing edges'
  targets, port 0 included — previously port 0 was skipped here because `setInserts()`
  used to wire it; (3) **every** insert device's output disconnected and reconnected to
  its own outgoing edges' targets — previously this only ran for devices not in the port-0
  chain. Chained devices (i1→i2→…→master) now patch through this same uniform pass 3 —
  the device-to-device edges were already in `_edges` (written by `addInsert()`), this
  pass just wires them now instead of `strip.js`'s old internal loop.
- No change to the node model, edge model, cap logic, palette, or any DOM/render code.
  `_serialChain()`, `_isInChain()`, `_ownerChannel()` are unchanged and still used for
  display and the `connect()` guard that refuses branching off the middle of a chain.

## WHY THIS SHAPE, NOT ANOTHER

The old bug was structural, not just "fader doesn't reach the insert" — the fader always
did reach the insert, because in the old wiring the fader sat *between* the device chain
and master. The real bug: a send (port 1/2) tapped from `meterTap`, which in the old chain
sat *after* the entire port-0 device chain — so a send heard the port-0 chain's processed
output, not a fresh copy of the channel signal. A closed gate on port 0 would have silenced
a send too. Measured proof of the fix below isolates each path and shows they're now
independent and equally fader-scaled — which is the shape §16.5b's parallel-branch example
requires.

## VERIFIED LIVE, HEADED CHROMIUM

Playwright's own Chromium, `launchPersistentContext` on a fresh `mkdtemp` profile, no
`channel`, no system Chrome, no process kill. Served `python3 -m http.server 8792` from
the project root, stopped after verification.

**Reused the S4 harness:** `docs/scratchpad/graph-verify.html`. Ran its own 39-check suite
unmodified first — **39/39 still pass**, zero page errors beyond the same two `favicon.ico`
404s the S4 receipt already logged.

**Then, measured off `masterAnalyser`, isolating each path** (ch1: EQ on port 0 → master,
plain send on port 1 → master, tone 220 Hz saw into `ch1.input`):

| condition | RMS |
|---|---|
| both port 0 (EQ) and port 1 (send) live, gain 1.0 | 0.2112 |
| **send only** (port 0 disconnected), gain 1.0 | 0.1053 |
| send only, gain 0.25 | 0.0264 — **ratio 0.251** |
| **insert only** (send disconnected), gain 1.0 | 0.1055 |
| insert only, gain 0.25 | 0.0264 — **ratio 0.250** |

Insert-only and send-only read within 0.2% of each other at the same gain — they tap the
same point. Both scale to within 0.4% of the expected 0.25× when the fader drops from 1.0
to 0.25 — both respond to the fader identically. `strips.master.el`'s out chip read
**`→ Output`** after the run; `strips.ch1`'s own out chip still read `→ Master` (channel
routing unaffected).

## OPEN DECISIONS

1. **`postFaderTap` duplicates `meterTap`'s node, not its meaning.** §16.4b's rule ("the
   meter reads this, never reconnects") is written about `vis/meter.js`, not about
   `graph.js`. `graph.js` was already the second consumer of this node before this fix (for
   sends); it is now the sole consumer for port 0 too, under a name that says what it's
   for. Not a new concern, same one the `node-graph` receipt already flagged and Brandon
   has now ruled on. Not re-escalating.
2. **The strip's own level meter (`this._meter`, mounted on `meterTap` in
   `mountCompact()`) now reads pre-insert instead of post-insert**, since inserts moved
   from before `meterTap` to after it. §16.1's rule for `meterTap` — "post-fader, post-pan,
   post-mute" — still holds exactly as written; it says nothing about pre/post-insert.
   Cosmetic, not blocking. **Decider: Brandon**, if the strip's meter should read after
   inserts instead.
3. **"Output" is my word choice for the master out chip**, one word, per the task's
   instruction to pick something short and correct. Not `→ Speakers` — `ctx.destination` is
   the more general term and matches how `masterAnalyser → ctx.destination` is already
   described in `core/audio.js`. **Decider: Brandon**, if a different word is wanted.

## NEXT ACTION

None from this seat — task complete, in-lane, no STOP conditions found. Whoever next
touches `mixer/automation.js` (P4/S5) should know: automation's four targets
(`strip.gain/pan/mute/solo`) are unaffected by this change — none of them moved.

## FILE LOCATIONS

- Edited: [src/mixer/strip.js](../../../src/mixer/strip.js) ·
  [src/mixer/graph.js](../../../src/mixer/graph.js)
- Read, not edited: [CONTRACTS.md](../../CONTRACTS.md) §16.0b/§16.1/§16.4/§16.4a/§16.5/
  §16.5b · [receipt-node-graph.md](receipt-node-graph.md)
- Session scratch, outside the repo, not committed:
  `…/scratchpad/strip-tap-verify.mjs` (isolation/fader-ratio driver) ·
  `…/scratchpad/strip-tap-runall.mjs` (re-run of the existing 39-check harness)

## FOR THE CLOSER

- Three open decisions above, none blocking; 2 and 3 want Brandon if he'd rather they read
  differently.
- No file outside `src/mixer/strip.js` and `src/mixer/graph.js` was written.
- No process kill was run at any point.
