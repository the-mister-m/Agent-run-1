Updated 2026-09-01 — job 3 of 6, unlimited-tracks: timeline

# RECEIPT — timeline reads the track store, CHANNEL_IDS dies

## FILES
- [src/ui/arrangement.js](../../src/ui/arrangement.js)
- [src/ui/daw-shell.js](../../src/ui/daw-shell.js)
- index.html — read, no change needed

## WHAT CHANGED

**daw-shell.js** — deleted `CHANNEL_IDS` export. Its three sites (mixer strip
markup, the strip-lookup loop, the isolate control's id list) now read
`tracks.all` from `core/tracks.js` instead of the hardcoded six.

**arrangement.js** — deleted the `CHANNEL_IDS` import, `DEFAULT_META`,
`defaultChannels()`. `Arrangement` now takes a fourth constructor arg
(`tracks = sharedTracks`), builds its lane list from `tracks.all` on mount,
and subscribes to the store's `add`/`remove`/`update` events — one lane
added or dropped per event, not a full rebuild, so an unrelated lane's
`Capture`/arm/punch state survives someone else's rename. `bindChannels()`
stays as a manual override (still used by `docs/scratchpad/arrangement-test.html`);
`unbindChannels()` now means "go back to following the store."

Lane head: the old plain label `<div>` is now a text `<input>` (name,
writes to the store on `change`) plus a `<select>` below it (instrument
type, writes `setInstrumentType` on `change`). Nothing else added — no
instrument construction, no channel wiring; the dropdown only writes the
field, per the brief.

`kind` is no longer coerced to `'pitched'` when absent — it passes through
`null` from the store, matching §7 (a kindless lane still draws).

## PAIRED DELETION
Both halves landed in this pass: `daw-shell.js:29`'s export gone,
`arrangement.js:2`'s import gone, no shim in between. `node --check` on
both files passes.

## LOOK DECISION (one, made alone)
Lane name input and instrument select use the file's existing button/token
pattern (`--btn-face`, `--line`, `--r-sm`, `--fs-micro`/`--fs-xs`) — same
recipe `daw-shell.js` already uses for its header/transport inputs. No new
tokens.

## FLAGGED, NOT TOUCHED
`daw-shell.js`'s mixer-strip creation (`createStrips(ctx)`, `mixer/strip.js`)
still returns a fixed ch1-ch6 set — that file is Job 2's. With boot state
at zero tracks (§7.3), `handle.strips` now only carries `master` until a
track exists, so `mixer.strips`'s ch1-ch6 instances have no DOM mount until
Job 2's half lands. Not fixed here — it's a `src/mixer/` file.

`_commitToRegion()` (arrangement.js) — untouched, Job 6's.

## SESSION REVIEW — Chromebook DAW / Agent run 1 — job 3, unlimited-tracks timeline

EDITS
- [src/ui/daw-shell.js](../../src/ui/daw-shell.js) — CHANNEL_IDS export deleted, 3 sites read tracks.all
- [src/ui/arrangement.js](../../src/ui/arrangement.js) — CHANNEL_IDS import + DEFAULT_META + defaultChannels() deleted, lanes wired to track store, lane head gets name input + instrument select

STRAY FILES
(none)

GOALS DONE
- CHANNEL_IDS deleted on both sides, no shim
- Timeline lanes read the track store, add/remove/rename handled per-lane
- Lane head: name field + instrument dropdown, nothing else

BRANDON'S TODOS
(none — none raised)

CLOSER REVIEW
- Confirm Job 2's mixer/strip.js lands a matching per-track strip lifecycle so the ch1-ch6/master DOM mismatch above resolves — closer / Brandon
