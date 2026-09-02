# RECEIPT — `node-graph` — P4/S4

Stamped 2026-08-31 23:28 EDT. Seat brief: [A-node-graph.md](A-node-graph.md). Stage:
[STAGE.md](STAGE.md). CONTRACTS §16.0, §16.0b, §16.1, §16.2, §16.4, §16.5, §16.8, §16.10,
§16.11 read (the seat table's list), plus §7 for the project-JSON shape. §16.7 skipped per
the table. S3 receipts read, not S3 source — except `strip.js`, which I call into and so
read in full, and the five device files, read only for their `static id/label/params`.

## DELIVERABLE STATE

`src/mixer/graph.js` built. 1271 lines, `node --check` clean. 167 `var(--token)` sites,
**zero fallbacks, zero raw colour/size/unit literals**, 74 distinct tokens, every one
resolving in `ui/tokens.css`. 16 of the 17 `graph + cables` tokens consumed — `--math-group`
is the patch synth's palette group and is not mine. `tokens.css` not written. No new token
needed, nothing escalated on styling.

### Verified live, headed Chromium, sound and pixels

Playwright's own Chromium, `launchPersistentContext` on a fresh `mkdtemp` profile, no
`channel`, no system Chrome, **no process kill of any kind**. Served over
`python3 -m http.server 8791` from the project root.

**Test URL:** `http://127.0.0.1:8791/docs/scratchpad/graph-verify.html` — click
*1 · start audio + build*, *2 · tone into ch1*, *3 · RUN ALL CHECKS*.

**39/39 automated checks pass. Zero page errors, zero console errors** (the two 404s in the
log are my harness page's `favicon.ico`, nothing in `src/`).

Audio was measured off `masterAnalyser`, not asserted:

| what | RMS |
|---|---|
| dry tone, ch1 → master | 0.1056 |
| gate inserted, threshold shut | **0.0000** — the insert really is in the path |
| gate reopened | 0.1054 |
| parallel branch added (dry + wet, both to master) | **0.1504** |

**A second driver did the whole thing by hand — real mouse events, no API calls:** selected
Channel 1, clicked *+ EQ* then *+ Reverb* from the palette (serial chain, rms 0.0326),
clicked the EQ→Reverb cable to cut it, dragged EQ's main port to Master, dragged Channel 1's
send port to the Reverb. Result: `ch1 -p0-> EQ -p0-> Master` and `ch1 -p1-> Reverb -p0->
Master` — two branches, both audible, both landing on master, rms 0.0995. The strip then
read `→ Master  → Reverb` on its out chip and `EQ → Master` in slot 0, which is §16.4a's
example shape exactly. An illegal hand-drag (channel → channel) was refused visibly. A node
dragged by its head moved. Screenshots: `s4-hand-1-serial.png` … `s4-hand-4-dragged.png`.

**Three real bugs found and fixed during that hand test, not shipped:**

1. **Out ports were unclickable.** They lived inside `.cbdaw-graph__node-body`, which has
   `overflow: hidden`, so the ports hanging off the node's edge were clipped to a sliver.
   Moved to be children of the node itself.
2. **A cable could never be clicked.** `_endDrags()` re-rendered every edge on *every*
   pointerup, so the path element was destroyed between mousedown and mouseup and the
   `click` never reached it. Now it re-renders only when a drag was actually live.
3. **A 2px cable is not a click target on a Chromebook.** Every edge now draws a transparent
   `--sp-5`-wide hit path under the visible stroke.

### The nine seat questions

**1 · What is a node, what is an edge.** Three node types, per §16.5, no others:
`channel` (`ref` `ch1`…`ch6`), `insert` (one device, `ref` its own `i1`-style id), `master`
(exactly one, `id: "master"`, undeletable). **There is no `send` node type — a send is a
channel node with more than one outgoing edge**, which is what "where it is being sent"
means on the strip. Legal edges: `channel → insert`, `channel → master`, `insert → insert`,
`insert → master`; `toPort` always `0`. Refused, each with its own one-line reason drawn on
screen: any edge **into** a channel · any edge **out of** master · a self-edge · a taken
`fromPort` · a second cable into one device · any edge that closes a cycle (the graph is
walked before accepting). A node with no path to master is legal, silent, and drawn with
`--node-dimmed`; it is never deleted for being unreachable.

**2 · Can a student add an insert here.** Yes, and only here. Select a channel node, click
a device chip in the graph's palette. The device is constructed, appended to that channel's
port-0 chain, and appears in that strip's slot. Verified: `Gate|→ Master` in ch1 slot 0
within one click.

**3 · Can a student build a parallel chain.** Yes — built by hand above, and audible.
Port 0 is the main path; ports 1 and 2 are branches. Two branches from one channel, both
recombining at master, both heard at once.

**4 · Is routing one-way with the strip. CHECKED — YES, and there is no STOP condition.**
I read `strip.js` end to end. `setInserts()` and `setRouting()` are the only two writers of
routing state, and neither is reachable from anything inside the file: no click handler, no
drag handler, no internal call path touches them (`this.setInserts` / `this.setRouting`
appear nowhere). The only slot interaction is `_onSlotClick` → an `onSlotPopout` callback.
`strip.js` does not import `graph.js`. **No routing-editing capability exists on a strip.**

**5 · Does it read as the curriculum's picture.** Boxes with a name and a live state line,
connected by cables, on a grid. Main-path cables are `--edge-audio`; branch cables are
`--edge-control`, so a send reads as a different *kind* of connection, not a highlight.
Nodes drag by the head, cables drag from a port, a cable is cut by clicking it. A student who
has used the patch synth's cables will recognise it. See `s4-graph-seed.png` and
`s4-hand-2-parallel.png`.

**6 · What are the limits.** 4 inserts per channel · 2 sends per channel · 24 nodes, all
enforced in this file, all liftable by `governor.noCap`, all verified both directions.
`governor.request(estimatedWeight)` is called before `new Device()` in addition to my own
caps — per §16.8 it answers a voice-count question, not a weight one, and I did not edit
`audio.js`. **Every refusal is drawn:** the reason appears in the graph's bar in
`--edge-refused` and the offending node flashes its border. Graph state is never partially
written — every check runs before anything mutates.

**7 · Does it serialize.** `getState()` returns §7's `graph` object verbatim
(`{nodes: [{id, type, ref, x, y}], edges: [{from, fromPort, to, toPort}]}`).
`getInserts()` returns §7's `channels[].inserts` keyed by channel:
`{ch1: [{id, type, bypass, state}], …}`. `setState(graph, insertsByChannel)` rebuilds both.
Verified on a **full 24-node / 26-edge graph**: `JSON.stringify` before === after, insert
states identical, strips re-patched, audio still playing after the reload.

**8 · What happens to an edge whose node is gone.** Deleting a node deletes every edge
touching it **in the same operation** — no dangling edge ever reaches `getState()`, verified.
The device is `dispose()`d and `setInserts()`/`setRouting()` are re-pushed. One addition
beyond §16.5a: **the port-0 path heals over the gap**, so deleting the middle device of a
three-device chain reconnects the two survivors rather than silently cutting the channel off
from master. Channel and master nodes refuse deletion, visibly.

**9 · Compact only, clean disposal.** One `mountCompact`, no expanded view. `unmount()` drops
every listener (per-node buckets plus the canvas's own) and releases the shared stylesheet by
reference count. `dispose()` additionally unpatches every strip, disposes every device, and
clears every map. 20 mount/unmount cycles: zero errors, stylesheet count balanced.

### How it patches — the part that is mine to explain

Three passes, in this order, on every change:

1. `strip.setInserts(serial devices)` for each channel — the port-0 chain, pre-fader. This
   is the **only** public way into the fader node, so the port-0 path must go through it.
2. `strip.meterTap.disconnect()`, then reconnect exactly what the graph declares: master if
   the port-0 walk reaches master, plus one connection per send edge. Post-fader.
3. Off-chain (branch) device outputs disconnected and rewired to their edge targets.

Pass 2 must follow pass 1 because `setInserts()` re-runs `strip._wireChain()`, which
re-asserts `meterTap → masterGain` and would wipe any branch patched before it.

## NEXT ACTION

- **`automation` (S5):** `graph.on('change', fn)` fires with the §7 graph object after every
  mutation. `graph.deviceOf(insertId)` returns the live device. Automation's four targets are
  on the strip, not here — nothing in this file needs binding for them.
- **`governor` (S5):** the caps I enforce are 4/2/24 in this file; `noCap` lifts all three.
  `governor.request()` is called before every device construction.
- **P5's save seat:** call `getState()` for the `graph` object and `getInserts()` for
  `channels[].inserts`; restore with `setState(graph, inserts)`. Both halves are needed —
  the graph object alone does not carry device types, by §7's own design.
- **Whoever wires the DAW for real:** `daw-shell.js` already has a `MOUNTS.nodeGraph` pane
  waiting. `new Graph(ctx, { strips, onDevicePopout })` then `mountCompact(handle.nodeGraph)`.
  Nothing in `index.html` constructs a Graph yet — `index.html` is frozen to this seat.

## OPEN DECISIONS

Reported, not silently patched, per my dispatch.

1. **§16.5 calls a channel node "at its post-fader output," but its own §16.5b example puts
   the port-0 chain there too — and in the shipped `strip.js` the insert chain is
   PRE-fader.** `strip.js` exposes no handle on its fader input; `setInserts()` is the only
   public route to it, and `get output()` returns the global `masterGain`, not the strip's
   own tail. So I split it: **port 0 is the pre-fader insert chain, ports 1–2 are post-fader
   sends off `strip.meterTap`.** That is the standard post-fader send, it makes §16.5b's
   example work exactly as written, and it is the only shape the shipped code permits.
   **Decider: Brandon / Troubleshooter** — if the intent was that all ports tap the same
   point, `strip.js` needs a public post-insert / pre-fader accessor, and that is not my file.
2. **I connect *from* `strip.meterTap`.** §16.4b says the meter "reads this, never
   reconnects" — that rule is written at `vis/meter.js`. Adding an outgoing connection does
   not disturb what the analyser reads. Flagging because I am the second consumer of a node
   §16.4 describes as the meter's.
3. **An insert accepts exactly one incoming cable.** §16.5 says `toPort` is always 0 and
   every device is one-in; §16.5b only ever lands two edges on *master*. One-in-per-device is
   how I read that, and it is also what makes a cycle structurally impossible (with no edge
   into a channel and none out of master, there is no route back). The cycle walk stays in as
   a guard. Noted because §16.7.6/§16.7.7's cables-per-port contradiction — which is inside
   the patch synth, not mine — is the same question one layer down.
4. **A branch device does not get a strip slot.** Only the port-0 chain does, because
   `setInserts()` wires whatever it is given in series. A branch shows on the strip as an
   entry in the `out` chip — which is exactly §16.4a's own `out: ['Master', 'Reverb']`
   example. Consequence: a channel can hold 4 inserts but display fewer than 4 slots.
5. **The 2-send cap is the port ceiling**, so a channel draws only the ports it needs plus
   one free one — compact, and `noCap` lets the count keep growing. This is why the cap is
   liftable rather than structural.
6. **`strip.getState().inserts` reports device *types*, not instance ids** (flagged by
   `mixer-strips` as its own open item 3). It does not collide with me: I own the instance
   ids and hand P5 the full `{id, type, bypass, state}` records through `getInserts()`.
   Nothing needs to change in `strip.js`.
7. **The master strip is never sent `setRouting()`**, so it draws `strip.js`'s default
   `→ Master`. §16.4a gives no `out` value for the master bus and I did not invent a label
   string (§6/§13.3). Cosmetic. **Decider: Brandon** if it should read something else.

Not rediscovered, per my dispatch: `arrangement.js`'s per-lane punch, the derived cpuWeights,
§16.7.6/§16.7.7. Untouched, per my dispatch: `src/instruments/patch-synth.js` and
`tools/patch-synth.html`.

## FILE LOCATIONS

- Built: [src/mixer/graph.js](../../../src/mixer/graph.js) — the only file this seat owns
- Written: [docs/scratchpad/graph-verify.html](../../../docs/scratchpad/graph-verify.html) —
  the 39-check harness, this seat's scratch file, named here per instruction
- Edited: [INDEX.md](../../../INDEX.md) · [SESSIONLOG.md](../../../SESSIONLOG.md) ·
  [TODO.md](../../../TODO.md) · [token-coverage.md](../../skinspecs/token-coverage.md)
- Read, never edited: `src/mixer/strip.js` (in full) · `src/core/audio.js` ·
  `src/ui/daw-shell.js` · `src/ui/tokens.css` · the five `src/devices/*.js` (statics only) ·
  CONTRACTS §7, §16 · the seven S3 receipts
- Session scratch, outside the repo, not committed:
  `…/scratchpad/pw/s4-graph-drive.mjs` (39-check driver) ·
  `…/scratchpad/pw/s4-graph-hand.mjs` (real-mouse driver) ·
  `…/scratchpad/s4-graph-seed.png` · `s4-graph-after.png` · `s4-hand-1-serial.png` ·
  `s4-hand-2-parallel.png` · `s4-hand-3-refused.png` · `s4-hand-4-dragged.png` ·
  `s4-graph-log.txt` · `s4-http.log`

## FOR THE CLOSER

- Seven open decisions above; **1 and 7 want Brandon**, the rest are recorded, not blocking.
- No file outside this seat's lane was written. No STOP condition found on any strip.
- No process kill was run at any point in this seat.
