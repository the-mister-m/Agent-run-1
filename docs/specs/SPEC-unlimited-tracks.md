# SPEC — UNLIMITED NAMED TRACKS, INSTRUMENT INSTANCES

Written 2026-09-01 by the session agent. Brandon's ask, verbatim:

> "how tall of an order is it to actually make it unlimited tracks that you can name,
> and instead of each instrument being its own track, you pick an instance of that
> instrument?"

Sized by grep before writing, not guessed. Findings in section 1.

---

## 0 · WHAT CHANGES, IN ONE LINE

The mixer stops being a fixed rack of six and becomes a list. A track holds an
instrument instance instead of *being* an instrument.

---

## 1 · WHAT THE GREP ALREADY PROVED — do not re-litigate

Four facts, measured. Build on them.

1. **Every instrument is `export default class`.** No singleton instances are exported
   anywhere in `src/instruments/`. They are already constructible many times.
2. **The only module-level mutable state is `stylesInjected`** — in `wave-synth.js:379`,
   `drum-synth.js:549`, `drum-sampler.js:714`. That is a one-per-document stylesheet
   guard, which is the *correct* pattern for multi-instance. See the bug in §6.
3. **`createChannel()` keys by the returned node object, not by instrument id**
   (`core/audio.js:75-81`). Two Wave Synths get two independent channels today. There is
   no collision to solve.
4. **`regions.js` never counts and never caps.** It keys by an arbitrary `laneId` string.
   `Arrangement.bindChannels()` accepts any list of any length. The timeline needs
   essentially nothing.

---

## 2 · THE TRACK RECORD

A track is the new unit. It replaces the `{id, kind, label}` channel object that
`arrangement.js`'s `defaultChannels()` invents today.

```
{
  id,              // 'trk1' — stable, generated, never reused
  name,            // 'Bass', user-typed, defaults to the instrument's name + ordinal
  instrumentType,  // 'wave-synth' | 'overtone-synth' | 'drum-synth' | ...
  instrument,      // the live instance, or null until constructed
  kind,            // 'pitched' | 'drum' — derived from instrumentType, not stored twice
  color,           // optional, for the region blocks
}
```

`kind` is **derived**. Do not let a caller pass it in and drift from `instrumentType`.

Where this lives is the builder's call, but it must NOT live in `arrangement.js` —
the mixer, the graph and the timeline all read it. A `core/tracks.js` store built the
way `core/regions.js` is built (factory, closed event list, `on()` returns an
unsubscribe, frozen records, `dispose()` returns counts) is the obvious shape and
matches the house idiom. `core/state.js` and `core/regions.js` are both worked
examples; read one before writing.

---

## 3 · THE FIVE PLACES THAT HARDCODE SIX

Each one is small. There are no others — this list came from grep, not memory.

| # | Site | What it does now | What it becomes |
|---|------|------------------|-----------------|
| 1 | `ui/daw-shell.js:29` | `CHANNEL_IDS = ['ch1'…'ch6']` | reads the track store |
| 2 | `ui/daw-shell.js:307` | `CHANNEL_IDS.map(stripMarkup)` | strips built/torn down on demand |
| 3 | `ui/daw-shell.js:319, 361` | `[...CHANNEL_IDS, 'master']` loops | same loops over the live list |
| 4 | `mixer/graph.js:351` | `for (let i = 1; i <= 6; i++)` in `_seedDefault` | seeds one node per track |
| 5 | `ui/arrangement.js` `DEFAULT_META` | six hardcoded id→instrument rows | deleted; lanes come from the store |

`CHANNEL_IDS` is exported and imported by `arrangement.js`. Removing it is a breaking
change to that import — fix both sides in one pass, do not leave a shim.

---

## 4 · ADD / REMOVE / RENAME

**Add a track.** One flow, in this order, and it must be reversible:

1. Track record created in the store.
2. Instrument instance constructed from `instrumentType`.
3. `createChannel()` → channel node.
4. `Strip` built and mounted.
5. Graph node added, edged to master.
6. Lane appears in the arrangement (already automatic via `bindChannels`).

**Remove a track.** The same six, backwards, and every one must actually release:
`releaseChannel(node)`, `strip.dispose()`, graph node and its edges removed,
`instrument.dispose()`, the store record deleted, and **the track's regions deleted** —
`regions.clear(laneId)` already exists and returns a count.

**Rename.** A text input on the lane head writing `name` to the store. The strip label
and the graph node label both read the same field. One source, three readers.

---

## 5 · WHAT MUST NOT REGRESS

- **The timeline.** Zoom, the cycle strip, ruler seek, region drag and the playhead all
  work today. They read `this._channels` and nothing else. If a change to them is needed
  to finish this, that is a signal the track store is in the wrong place.
- **`bindChannels()`'s contract.** It already takes `{id, kind, label}`. Either keep that
  shape and map the track record onto it at the call site, or change both together.
  Do not half-change it.
- **Per-lane `Capture`.** Each lane owns its own `Capture` instance. Adding a track adds
  one; removing a track must dispose one.
- **Arm and punch state** live per lane in `arrangement.js`, not in `core/state.js`
  (`recordArmed` was deliberately dropped there on 2026-08-31). Keep it that way.

---

## 6 · THE BUG THIS WILL EXPOSE — fix it, it is in scope

`stylesInjected` is set `true` on first mount and **never reset on dispose**, in three
files:

- `src/instruments/wave-synth.js:379`
- `src/instruments/drum-synth.js:549`
- `src/instruments/drum-sampler.js:714`

Today nothing ever removes an instrument, so nobody has hit it. The moment tracks can be
deleted: remove the last Wave Synth, add a new one, and its stylesheet is gone — the
instrument mounts unstyled.

`ui/arrangement.js` and `surfaces/*.js` already carry the correct pattern —
`acquireStyle()` / `releaseStyle()` with a refcount. Port it. Three files, and it is not
optional.

---

## 7 · OPEN — BRANDON'S CALL, NOT THE BUILDER'S

Do not decide these alone. Ask.

1. **Track limit.** "Unlimited" is the ask. There is a real ceiling — voice count and CPU,
   which `core/audio.js`'s governor already meters. Whether the UI refuses a new track at
   some count, warns, or says nothing, is Brandon's.
2. **Two instances of one instrument sharing a view.** The instruments were built one to a
   page. Whether two Wave Synths can both be open at once, or only the focused track shows
   its instrument, is a UI decision nobody has made.
3. **Default track on boot.** Today six lanes exist before you do anything. Whether a new
   project opens empty, or with one track, is Brandon's.

---

## 8 · SIZE

**60–90k tokens.** The mixer and the graph are most of it. The timeline is nearly free.

This is a fixed rack becoming a list. It is not a rewrite, and any plan that turns into
one has gone wrong — stop and say so.

---

## 9 · STILL OPEN, NOT IN THIS SPEC

**Phase D — the region editor.** Region blocks exist and hold notes, but nothing opens
one. `Arrangement` fires `on('open', region)` on double-click and nothing listens.
`_commitToRegion()` in `arrangement.js` is **provisional** — it writes a take into the
region under the playhead and invents one over the punch range if there is none. That is a
placeholder, disclosed, and D replaces it.

D needs `surfaces/piano-roll.js` (1696 lines), `surfaces/step-grid.js` (1060) and
`core/capture.js` (1206) read in full. It is the expensive phase and it is unspecced.
