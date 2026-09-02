Updated 2026-09-01 — job 4 of 6, unlimited-tracks: integration

# RECEIPT — the three layers wired, teardown closed

## FILES
- [src/ui/daw-shell.js](../../src/ui/daw-shell.js)
- [src/ui/arrangement.js](../../src/ui/arrangement.js)

`src/core/tracks.js` NOT touched — the store had everything the three flows need.

## THE WIRING

`wireDawShell()` now holds the track lifecycle. It subscribes to the store's
`add`/`remove`/`update` and owns the mixer, graph, automation and instrument halves;
`Arrangement` keeps owning the lane half through its own subscriptions.

**ADD** (`onTrackAdd`, daw-shell:721) — strip slot inserted ahead of master →
`mixer.add()` + `mountCompact` → `graph.addChannel` → `automationRack.add` + gain lane.
No instrument is constructed.

**ASSIGN** (`assignInstrument`, daw-shell:704) — dispose old → `new Ctor(ctx, strip.input)`
→ `tracks.setInstrumentType` → `tracks.setInstrument` → `arrangement.bindLaneInstrument`.
The lane dropdown reaches it through `arrangement.onAssignInstrument`, set at daw-shell:718;
unset (the scratchpad harness) the dropdown still writes the store field alone.
`setInstrumentType` re-enters `onTrackUpdate`, which returns on an unchanged label — no loop.

**REMOVE** (`onTrackRemove`, daw-shell:729) — Job 2's order, with the three open rows in
front of it. `RENAME` — `mixer.rename` then `graph.refresh()`, label-guarded.

`createAutomationRack()` is wired and is the only automation release path. Master is keyed
in the rack too, so `rack.dispose()` covers it; `remove('master')` is never called.
`mixer.strips` is bound to the graph once, at construction, and never re-bound. Strip keys
are track ids.

## JOB 2's LEDGER — the three rows I owned

| # | Thing | Released by |
|---|-------|-------------|
| 32 | the track's regions | `regions.clear(t.id)` — daw-shell:730 |
| 33 | the instrument instance | `instance.dispose()` in `disposeInstrument()` — daw-shell:699, called from `onTrackRemove` (:731), from `assignInstrument` on a swap (:705), and for every live instance in `dispose()` |
| 34 | the per-lane `Capture` | `lane.capture.dispose()` — arrangement:750 (`_onTrackRemove`, Job 3's line, confirmed reached) and :727 (`_teardownLanes`) |

All three close. Row 35 (`stylesInjected`) is job 5's and untouched.

## ALSO IN MY FILES
- `+ TRACK` button, arrangement toolbar (:633) — the only way to make the first track.
- Per-lane `×` remove button (:829). **My call** — the remove flow had no trigger.
- `_teardownLanes()` now removes `lane.wash`; it leaked one overlay div per lane per rebuild.
- Selection clears when its region is gone, not only when its lane is.
- Isolate menu rebuilds on every track change — its item list is fixed at construction, so
  with zero-boot it was permanently empty.
- Dead `instrumentCtor`/`channelId` params deleted from `wireDawShell()`. They are the
  S6 done-check's headline FAIL; the instrument path is now `assignInstrument`.

## WHAT JOB 6 MUST KNOW
1. `_commitToRegion()` untouched, still provisional, still yours.
2. `arrangement.on('open')` still has no listener. The kind you need is on the track record:
   `tracks.get(region.laneId).kind`, and it can be `null`.
3. The live instrument for a lane is `instruments.get(id)` on `wireDawShell()`'s return, and
   the same reference is on the track record.
4. A track's instrument is constructed but its **DOM is never mounted** — no host is ruled
   for it. Audio works; there is no instrument UI on screen.

## NOT VERIFIED
`node --check` on both files passes. No browser run — no driver is installed here and I did
not install one. The add/assign/remove flows are unproven against a live AudioContext.

## COST
All six instrument modules are now statically imported by `index.html`'s boot path.

---

SESSION REVIEW — Chromebook DAW / unlimited tracks — 2026-09-01 22:34

EDITS
- [src/ui/daw-shell.js](../../src/ui/daw-shell.js) — track lifecycle wired: add/assign/remove, automation rack, live isolate menu, dead params dropped
- [src/ui/arrangement.js](../../src/ui/arrangement.js) — +TRACK and per-lane ×, assignment hook, wash leak, selection clear
- [INDEX.md](../../INDEX.md) — one clause on each of the two file lines
- [SESSIONLOG.md](../../SESSIONLOG.md) — one entry

STRAY FILES
- none — scratchpad empty

GOALS DONE
- three layers wired end to end through one store
- ledger rows 32, 33, 34 all have a named release line

BRANDON'S TODOS
- none

CLOSER REVIEW
- the per-lane `×` remove button is my call, not spec text — rule on it or leave it
- nothing here is browser-verified; a headed run is the next gate, not another edit
- `instrumentCtor` is gone, so the S6 done-check FAIL should be re-run, not re-read
