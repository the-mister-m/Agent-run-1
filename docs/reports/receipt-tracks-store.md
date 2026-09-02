# RECEIPT — `src/core/tracks.js` — unlimited-tracks job 1 of 6

Built `createTrackStore()`, mirroring `core/regions.js`: factory, closed event list
(`add`/`remove`/`update`/`change`), `on()` returns an unsubscribe, frozen records,
`dispose()` returns `{listenersDropped, tracksHeld}`, module singleton `tracks` +
default export.

Record: `{id, name, instrumentType, instrument, kind, color}`. `kind` derives from
`instrumentType` through one lookup table, never accepted from a caller. `add()` is
always empty — no instrument args accepted. `setInstrumentType` re-derives `kind`;
`setInstrument` stores/clears the live reference only — store never constructs or
disposes one. `update()` for `name`/`color`. `reorder(id, toIndex)` — order held
separately from the id map. No clock import, no audio import, no regions import.

**Exported:** `createTrackStore`, `tracks` (singleton), default = `tracks`.

**Spec gap, filled by judgment:** §2 names only `wave-synth`/`overtone-synth` in its
`instrumentType` example and trails off with `...`. `ls src/instruments/` shows six
files: `wave-synth`, `overtone-synth`, `chord-module`, `patch-synth` (pitched),
`drum-synth`, `drum-sampler` (drum). Built the kind-derivation table off that listing,
not off spec text — flagging in case that grouping is wrong.

**Not built:** `serialize()`/`load()`. `regions.js` has them; `instrument` here holds a
live object, not JSON-safe, and nothing in the ruled sections asked for persistence.

Smoke-tested inline via `node --input-type=module`: add, type-swap re-deriving kind,
setInstrument, reorder, remove, dispose, closed-event-list throw, frozen-record throw.
All passed. Not saved as a script — nothing to hand downstream jobs that regions.js's
saved smoke test doesn't already model.

---

SESSION REVIEW — tracks-store (job 1 of 6) — grep transcript for timestamps

EDITS
- [src/core/tracks.js](../../src/core/tracks.js) — new file, the track store
- [INDEX.md](../../INDEX.md) — one-line entry added
- [SESSIONLOG.md](../../SESSIONLOG.md) — one entry appended

STRAY FILES
- none

GOALS DONE
- `src/core/tracks.js` built to spec §2/§4/§5/§7, mirroring `regions.js`

BRANDON'S TODOS
- none — no gate hit requiring his call

CLOSER REVIEW
- Kind-derivation table (chord-module, patch-synth → pitched) is this job's judgment,
  not spec text — flag for Closer / downstream jobs to confirm
- No persistence methods — confirm nothing downstream expects `serialize()`/`load()`
