# SPEC — UNLIMITED NAMED TRACKS, INSTRUMENT INSTANCES

Written 2026-09-01 by the session agent. Revised same day: §7 rewritten with Brandon's
seven rulings (one overturns the old text), §2 and §4 amended to match, §9 emptied,
§10 added for Phase D.

Brandon's ask, verbatim:

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
  instrumentType,  // 'wave-synth' | 'overtone-synth' | ... | null until assigned
  instrument,      // the live instance, or null
  kind,            // 'pitched' | 'drum' | null — derived from instrumentType
  color,           // optional, for the region blocks
}
```

`kind` is **derived**. Do not let a caller pass it in and drift from `instrumentType`.

A track is born with `instrumentType: null` (§7.6). `kind` is therefore `null` too, and a
kindless track's lane draws but opens no editor. Changing `instrumentType` on a live track
re-derives `kind` (§7.5) — it is not fixed at creation.

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

**Add a track.** Two flows, because a track is born empty (§7.6).

*On add* — record only:

1. Track record created in the store, `instrumentType: null`.
2. `createChannel()` → channel node.
3. `Strip` built and mounted.
4. Graph node added, edged to master.
5. Lane appears in the arrangement (already automatic via `bindChannels`).

*On instrument assignment* — the lane's dropdown writes `instrumentType`:

6. Old instance, if any, disposed.
7. New instance constructed and wired to the track's existing channel node.
8. `kind` re-derives; the lane redraws.

The channel, strip and graph node belong to the **track**, not the instrument. They survive
an instrument swap (§7.5). Only step 6-7 runs again.

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

## 7 · RULED BY BRANDON — 2026-09-01

Seven rulings, all Brandon's, all in this session. Build to these; do not reopen them.

The previous §7 carried three rulings written without attribution. Item 1 below **overturns**
what that section said. Anything not listed here was never ruled.

1. **Track limit — none, and no warning.** No cap, no refusal, and no governor warning
   surfaced at add-track time. The prior text said to warn; that is overturned. "No warning
   yet" — the hook is not being built in this pass.
2. **Two instances of one instrument — both open at once.** Two Wave Synths visible
   simultaneously with independent state.

   **This costs nothing. Verified by grep 2026-09-01 — do not re-investigate.** All six
   instruments are `export default class`, so `new` gives isolated instances. Every DOM
   lookup is scoped to a passed-in host (`root`/`el`/`host`/`view.canvas` + `[data-*]`),
   never a document id. The only `getElementById` calls are three inject-CSS-once style
   guards (`wave-synth-styles`, `drum-synth-styles`, chord-module's `STYLE_ID`), which are
   correctly shared. `patch-synth`'s `node.id` is graph identity claimed through
   `this._claimId`, not a document id. `overtone-synth` has no id usage at all.
   Module-level state across the set is three style guards and one `noiseBuffers` sample
   cache — all shared by design.
3. **Default track on boot — empty.** A new project opens with no tracks. First action is
   always "add track." The six lanes that exist today go away entirely; they are not
   replaced by one.
4. **Editor placement is not this spec's call.** Where a region editor appears on screen is
   settled by the UI matrix Brandon is building. Phase D specifies the seam, not the layout.
5. **A track's kind can change.** `instrumentType` is reassignable on a live track;
   `kind` re-derives from it. Swapping a pitched instrument for a drum one on a track that
   already holds regions is legal — the regions' `notes` payload is opaque to the store
   (§1.4), so nothing in `regions.js` breaks. What the editor does with a note payload it
   no longer understands is Phase D's problem, named in §10.5.
6. **Add-track makes an empty track.** No instrument is chosen at creation. The instrument
   is assigned afterward, from the lane's own control. Step 2 of §4's add flow
   (construct the instrument) therefore does not run at add time — it runs on assignment.
7. **Deleting a track deletes its regions.** Confirmed, matching §4's remove flow —
   `regions.clear(laneId)`.

**Lane head controls (Brandon's words):** track name on top, click-and-type to edit;
instrument dropdown below it. Both live in the timeline lane head, not in the mixer strip.

---

## 8 · SIZE

**60–90k tokens.** The mixer and the graph are most of it. The timeline is nearly free.

This is a fixed rack becoming a list. It is not a rewrite, and any plan that turns into
one has gone wrong — stop and say so.

---

## 9 · STILL OPEN, NOT IN THIS SPEC

Nothing. Phase D moved into §10.

---

## 10 · PHASE D — THE REGION EDITOR

### 10.1 · The state today

`Arrangement` fires `on('open', region)` on double-click (`arrangement.js:974`) and nothing
listens. `_commitToRegion()` (`arrangement.js:1027`, 18 lines) is **provisional** — it writes
a take into the region under the playhead and invents one over the punch range if there is
none. Disclosed placeholder. D replaces it.

### 10.2 · The seam — grep-measured 2026-09-01

The prior §9 claimed D needs `piano-roll.js` (1696), `step-grid.js` (1060) and `capture.js`
(1206) read in full, ~110k tokens. **That is wrong.** The surfaces already expose a
get/set/mount/dispose contract, and it is the whole seam:

| Surface | Read notes | Write notes | Mount | Tear down |
|---------|-----------|-------------|-------|-----------|
| `PianoRoll` | `getNotes()` :798 | `setNotes(notes)` :809 | `mount(el, variant)` :951 | `dispose()` :992 |
| `StepGrid` | `getPattern()` :495 | `setPattern(pattern)` :502 | `mount(el, variant)` :590 | `dispose()` :636 |

Read those four methods per surface plus their constructors. Not the files.

### 10.3 · Open a region

1. `on('open', region)` fires.
2. Look up the region's track; read its `kind`.
3. `kind: null` → no editor. Nothing happens. Say nothing.
4. `pitched` → `PianoRoll`; `drum` → `StepGrid`.
5. `setNotes(region.notes)` / `setPattern(region.notes)`. `notes` is opaque to the store
   (§1.4) — the surface is the only thing that interprets it.
6. `mount()` into whatever host the UI matrix hands over (§7.4).

### 10.4 · Close a region — replaces `_commitToRegion()`

On close: `getNotes()` / `getPattern()` → `regions.setNotes(region.id, …)` → `dispose()`.

The editor owns the region it was opened on. It does not guess from the playhead, and it
does not invent regions. `_commitToRegion()`'s playhead lookup and punch-range invention
both go away — **live recording still needs a destination**, and that is 10.6.

### 10.5 · The kind-swap hazard

§7.5 permits changing a track's instrument, including pitched → drum. A region written by
`PianoRoll` then opens in `StepGrid`. `setPattern()` will be handed a note array it did not
write.

**RULED BY BRANDON 2026-09-01:** the piano-roll notes get handed to StepGrid. No guard, no
conversion, no prompt. `setPattern()` takes the payload it is given. Do not ask, do not
build a migration. If the grid renders it badly, that is acceptable and out of scope.

### 10.6 · Live recording, after the provisional goes

Each lane owns its own `Capture` (`arrangement.js:748`), armed per lane, committing per
lane. That part is right and stays. What changes is only *where the take lands* — the
provisional playhead-and-punch rule. Replacing it is its own decision and belongs to the
builder's brief with Brandon, not to this section.

Note for whoever reads `capture.js`: `_armed` (`capture.js:163`) is a `Set` of **fixed lane
indices 0–7**, and `disarm` hardcodes `[0,1,2,3,4,5,6,7]`. Those are §14.1 drum-lane roles
inside one instrument. They are **not** track indices and they do not need to scale with
track count. Do not "fix" them.

### 10.7 · Size

**25–40k tokens**, on the get/set/mount/dispose seam. Not 110k. If it grows past that,
something is being read that §10.2 said not to read.
