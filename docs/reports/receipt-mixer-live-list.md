# RECEIPT — mixer + graph read a live track list (job 2 of 6)

2026-09-01 · files owned: `src/mixer/strip.js`, `src/mixer/graph.js`, `src/mixer/automation.js`.
Nothing else touched. `arrangement.js` and `daw-shell.js` never opened.

## WHAT CHANGED

**[src/mixer/strip.js](../../src/mixer/strip.js)**
- `createStrips(ctx, specs)` fallback is `[]`, not six. No specs → master alone.
- Rack gained `add(spec)`, `remove(id)`, `rename(id, label)`, `channels`. `strips` stays the
  **same object** for the rack's life, so `graph.bindStrips()` is called once and never again.
- `remove()` recomputes solo/mute across the remaining strips — a removed solo cannot leave
  the rest silent.
- `Strip.label` is now a getter/setter; the setter repaints the mounted label. One field, two
  readers (strip head, graph node name).

**[src/mixer/graph.js](../../src/mixer/graph.js)**
- `_seedDefault(channels)` seeds master first, then one channel node per id. Zero ids is legal.
- New `addChannel(id)`, `removeChannel(id)`, `_dropInsert(id)`, `refresh()`.
- `removeNode()` refactored onto `_dropInsert` — same heal behaviour, one release path.
- `CAP_NODES` now counts **insert devices**, not total nodes. Was `_nodes.size >= 24`, which
  with unlimited tracks becomes a silent track cap: at 24 tracks every insert is refused.
  **My call, not Brandon's, not in the spec** — flagged for the Closer.
- Channel node row = channel count, then `_freeSpot` steps past collisions. The old
  `_freeSpot(x, y)` alone stalls at `WALK_LIMIT` (64) and stacks nodes on top of each other.

**[src/mixer/automation.js](../../src/mixer/automation.js)**
- New `createAutomationRack()` — `add(id, strip)` / `remove(id)` / `of` / `rebind` /
  `getState` / `setState` / `dispose`, keyed by channel id. Nothing else changed.
  `remove(id)` is the only release path for a track's lanes; not wired by me (daw-shell is
  job 3's file).

## TEARDOWN LEDGER — removing ONE track

Job 4 consumes this. **Order: graph first, then automation, then strip.**

| # | Thing created | Created by | Released by | Gap |
|---|---|---|---|---|
| 1 | `channelIn` (createChannel) | `new Strip` :230 | `strip.dispose()` → `releaseChannel` | — |
| 2 | `stripGain` GainNode | `new Strip` :232 | `strip.dispose()` disconnect | — |
| 3 | `stripPan` StereoPanner | `new Strip` :234 | `strip.dispose()` disconnect | — |
| 4 | `stripMute` GainNode | `new Strip` :236 | `strip.dispose()` disconnect | — |
| 5 | `meterTap` AnalyserNode (= `postFaderTap`) | `new Strip` :238 | `strip.dispose()` disconnect | — |
| 6 | chain edges channelIn→gain→pan→mute→tap→masterGain | `_wireChain()` | the five disconnects above | — |
| 7 | `Meter` on meterTap + its rAF | `mountCompact` | `unmount()` → `meter.dispose()` | — |
| 8 | up to 4 slot `Meter`s | `_renderSlots` | `unmount()` → each `dispose()` | — |
| 9 | fader/pan/mute/solo/slot DOM listeners | `_addListener` | `unmount()` drains `_cleanup` | — |
| 10 | strip stylesheet refcount | `acquireStyle` | `unmount()` → `releaseStyle` | — |
| 11 | strip DOM subtree | `mountCompact` | `unmount()` removes `wrap` | — |
| 12 | rack entry `strips[id]` + `channelStrips` slot | `rack.add` | `rack.remove(id)` | — |
| 13 | graph channel node | `graph.addChannel` | `graph.removeChannel(id)` | — |
| 14 | edge channel→master (port 0) | `graph.addChannel` | `removeChannel` edge filter | — |
| 15 | send edges (ports 1..n) off the channel | `connect()` | `removeChannel` edge filter | — |
| 16 | insert nodes owned by the channel | `addInsert` | `removeChannel` → `_dropInsert` each | — |
| 17 | edges into/out of those inserts | `addInsert`/`connect` | `removeChannel` edge filter (doomed set) | — |
| 18 | insert device instances (`_devices`) | `addInsert` | `_dropInsert` → `output.disconnect()` + `device.dispose()` | — |
| 19 | `_types` entries for those inserts | `addInsert` | `_dropInsert` | — |
| 20 | tap→device connections | `_repatch` | strip's `meterTap.disconnect()` (#5) | — |
| 21 | graph node DOM el + its listeners | `_buildNode` | `_renderNodes` drops non-live ids → `_dropNodeEl` | — |
| 22 | `_selected` pointing at the removed node | `_select` | cleared in `removeChannel`/`_dropInsert` | — |
| 23 | SVG wire paths + their click listeners | `_renderEdges` | `_renderEdges` clears the whole `<svg>` each pass | — |
| 24 | `AutomationLane` per target (≤4) | `createChannelAutomation` lazily | `rack.remove(id)` → `lane.dispose()` | — |
| 25 | `clock.on('tick')` per lane | `new AutomationLane` :178 | `lane.dispose()` → `clock.off` | — |
| 26 | pending `clock.schedule` ids | `_writeAt` | `lane.dispose()` → `clock.unschedule` each | — |
| 27 | pending `setTimeout` bridges | `_writeAt` | `lane.dispose()` → `clearTimeout` each | — |
| 28 | hand listeners on the strip's fader/pan DOM | `_bindHand` | `lane.dispose()` → `_unbindHand` | — |
| 29 | lane canvas listeners, ResizeObserver, IntersectionObserver, rAF | `mountCompact` | `lane.unmount()` inside `dispose()` | — |
| 30 | automation stylesheet refcount | `acquireStyle` | `unmount()` → `releaseStyle` | — |
| 31 | rack entry in `createAutomationRack` | `rack.add` | `rack.remove(id)` | — |
| 32 | **the track's regions** | `regions.add` | **NOT MINE.** `regions.clear(laneId)` exists; nobody in my files calls it | **GAP — job 4** |
| 33 | **the track's instrument instance** | job 4's assignment flow | **NOT MINE.** `tracks.remove()` drops the record only | **GAP — job 4** |
| 34 | **per-lane `Capture`** | `arrangement.js` | **NOT MINE** — job 3's file | **GAP — job 3** |
| 35 | **instrument `stylesInjected` guards** (SPEC §6) | 3 instrument files | never reset on dispose | **GAP — unassigned** |

Rows 32–35 are outside my three files. They are named, not fixed.

## WHAT JOB 4 MUST KNOW

1. **Call order on remove:** `graph.removeChannel(id)` → `automationRack.remove(id)` →
   `strips.remove(id)`. Reversed still releases, but the graph repatches against a
   half-dead strip in between.
2. **On add:** `strips.add({id, label})` → `graph.addChannel(id)` → `automationRack.add(id, strip)`.
   `graph.addChannel` no-ops its commit until strips are bound, so bind once at boot.
3. **Never re-bind strips.** `mixer.strips` is a stable object mutated in place.
4. **Rename:** `mixer.rename(id, name)` then `graph.refresh()`.
5. `graph.addChannel` uses the track id as both node id and `ref`, so strip keys must be
   track ids (`trk1`), not `ch1`.

## NOT VERIFIED

No browser run. Syntax-checked only (`node --check`, all three pass). The three files import
`AudioContext`-dependent modules; a headless run would have proved nothing real.

## KNOWN BREAKAGE OUTSIDE MY FILES

`tools/dev-splash.html:527` calls `createStrips(ctx)` with no specs and now gets an empty
rack. That page also imports `CHANNEL_IDS` from `daw-shell.js`, which job 3 is deleting — it
was already going to break. Not mine, not fixed.

---

SESSION REVIEW — Chromebook DAW / unlimited tracks — 2026-09-01 22:23

EDITS
- [src/mixer/strip.js](../../src/mixer/strip.js) — empty fallback, live add/remove/rename, label setter
- [src/mixer/graph.js](../../src/mixer/graph.js) — seeded from a track list, addChannel/removeChannel, device-cap fix
- [src/mixer/automation.js](../../src/mixer/automation.js) — createAutomationRack
- [INDEX.md](../../INDEX.md) — one line
- [SESSIONLOG.md](../../SESSIONLOG.md) — one entry

STRAY FILES
- none — scratchpad copies were harness-only and deleted

GOALS DONE
- both hardcoded-six sites in my files removed
- teardown ledger delivered, gaps named not hidden

BRANDON'S TODOS
- none

CLOSER REVIEW
- `CAP_NODES` re-read as a device cap is my judgment call, not spec text — rule on it or leave it
- rows 32–35 of the ledger have no release path in any file I own — confirm job 3/4 picked them up
- `tools/dev-splash.html` breaks on the empty rack — decide whether it gets retired
