# RECEIPT — drum-sampler (P2/S4)

Header stamp: 2026-08-23 18:51 EDT

---

## SEAT QUESTION 1 — How does Brandon add a kit? (2026-08-23 18:51 EDT)

**DELIVERABLE STATE**
Answered per CONTRACTS §14.4: drop a folder under `/assets/kits/<kit>/`, add a `kit.json`
naming the eight files against §14.1's fixed roles, add the folder name to
`/assets/kits/kits.json`. No code change, no rebuild. Documented in full, with a copyable
`kit.json` template and the failure table from §14.3, at
`Builddocs/P2-beat-tool/S4-kits/HOWTO-add-a-kit.md`. Not a README (Brandon's rules forbid
those).

**NEXT ACTION**
Move to seat question 2 — bind `static pieces` to CONTRACTS §14.1's fixed table in the
instrument file.

**OPEN DECISIONS**
None from this question. The seven non-Kick labels are `PROVISIONAL` per §14.1 and already
escalated to Brandon by `spec-clock` (2026-08-23), not by this seat — noted, not
re-escalated.

**FILE LOCATIONS**
- `Builddocs/P2-beat-tool/S4-kits/HOWTO-add-a-kit.md`

---

## SEAT QUESTION 2 — Which eight pieces, in what order? (2026-08-23 18:52 EDT)

**DELIVERABLE STATE**
`static pieces` in `src/instruments/drum-sampler.js` is CONTRACTS §14.1's table verbatim —
index 0–7, notes 36/38/42/46/39/45/50/49, in that order, frozen (`Object.freeze`) so the
grid's assumption "genuinely static" holds. `NOTE_TO_INDEX` is the one place a MIDI note
maps to a piece; a kit manifest's own `note` field is read but never used for that mapping
(design decision 2 in the file's header comment) — §14.1: "index and note are fixed by
this table. A kit may not move them." This is the same table `drum-synth` binds to
(parallel seat, no shared files, but same CONTRACTS section), so the grid cannot tell the
two machines apart, per §14.5's requirement.

**NEXT ACTION**
Seat question 3 — decode timing and the ready() contract.

**OPEN DECISIONS**
Same as question 1: the seven labels are Brandon's, provisional, already escalated by
`spec-clock`, not blocking this seat.

**FILE LOCATIONS**
- `src/instruments/drum-sampler.js` — `PIECES`, `NOTE_TO_INDEX`, `static pieces`

---

## SEAT QUESTION 3 — When are files loaded, what happens while they load? (2026-08-23 18:53 EDT)

**DELIVERABLE STATE**
`static needsLoad = true`; `async ready()` resolves immediately when no kit load is in
flight, and awaits the current kit's decode when one is. `kits.json` is fetched
fire-and-forget from the constructor (`_bootstrapKitsList`) — per §3, nothing blocks
startup; the instrument is fully constructed, mountable, and clickable before any network
call resolves. A step/pad played before a kit is ready makes no sound and is not an error
(§14.5's own rule, applied). findings-scheduler.md Q6 measured decode cost on a real
8-file kit at 4.0 ms total (0.2–1.0 ms/file) on an M4 Max with no audio device — cheap
enough that "while it loads" is a narrow window in practice, but the async path is honored
regardless of how fast it resolves, since the contract (§2 amendment 1) exists precisely
because a constructor cannot `await`.

**NEXT ACTION**
Seat question 4 — failure behavior for a missing kit or a bad file.

**OPEN DECISIONS**
None.

**FILE LOCATIONS**
- `src/instruments/drum-sampler.js` — `static needsLoad`, `ready()`, `_bootstrapKitsList()`, `_loadKit()`, `_doLoadKit()`
- `Builddocs/P2-beat-tool/S2-recon/findings-scheduler.md` Q6 — decode-cost source

---

## SEAT QUESTION 4 — What happens when a kit is missing or a file fails to decode? (2026-08-23 18:54 EDT)

**DELIVERABLE STATE**
Implements CONTRACTS §14.3's failure table exactly:
- `kits.json` missing/unparseable → `listKits()` returns `[]`, kit picker says so, Drum
  Sampler and the rest of the page still work.
- a listed kit folder has no `kit.json` → that kit's load fails, named
  (`kitStatus.error`), the page and any previously working kit are untouched.
- `kit.json` with other than 8 pieces, or a bad/duplicate `index` → refused and named, same
  as above.
- one `.wav` fails to decode → the kit still reaches `ready`; that one piece's buffer stays
  `null` (silent, drawn as failed via `.ds-pad-failed`); the other seven play.
- a failed kit-switch attempt never clears the previously loaded kit's buffers — a working
  kit stays playable even if the next thing you try to load is broken (a design choice
  beyond what §14.3 states outright, logged as design decision territory, not an
  escalation — it strictly strengthens "never breaks the page").

Verified against real decode failures (not just reasoned about) — see DONE-CHECK evidence
under seat question 8.

**NEXT ACTION**
Seat question 5 — full §2 method coverage, getState/setState kit round-trip.

**OPEN DECISIONS**
None.

**FILE LOCATIONS**
- `src/instruments/drum-sampler.js` — `_doLoadKit()`, `_failKit()`, `noteOn()`'s missing-buffer branch

---

## SEAT QUESTION 5 — Does it implement CONTRACTS §2 completely? (2026-08-23 18:55 EDT)

**DELIVERABLE STATE**
Every §2 member is present: `id`/`label`/`playable`, `constructor(ctx, out)`, `noteOn`/
`noteOff`/`allNotesOff`, `setParam`/`getParam`, `getState`/`setState`, `voiceCount`,
`cpuWeight`, `mountCompact`/`mountExpanded`/`unmount`/`dispose`, plus all four §2 amendment
additions (`needsLoad`/`ready()`, `getAnalyser()`, `static pieces`, `emitsNotes`/
`onNoteOut`/`offNoteOut`). `getState()` returns `{ kit: this._kitName }` — plain,
JSON-safe, `null` until a kit is chosen — and `setState()` reads it back through the same
`setParam('kit', …)` path a live control uses, so a project reload asks for the same kit it
saved. Confirmed by an actual `JSON.stringify`/`JSON.parse` round-trip in the test harness,
not just read by eye.

**NEXT ACTION**
Seat question 6 — velocity.

**OPEN DECISIONS**
None.

**FILE LOCATIONS**
- `src/instruments/drum-sampler.js` — whole file; `getState()`/`setState()` specifically

---

## SEAT QUESTION 6 — Does velocity change the sound? (2026-08-23 18:56 EDT)

**DELIVERABLE STATE**
Yes, two ways. Level: linear gain, 0–1, matching every other instrument's convention.
Playback rate: mapped into a narrow 0.94–1.06 band (`velocityToPlaybackRate`) — a softer
hit plays very slightly lower/slower, a harder hit very slightly higher/faster/brighter.
Both are parameters on nodes the voice already owns (`AudioBufferSourceNode.playbackRate`,
its `GainNode`), so this costs no extra node and no extra `cpuWeight`. Design decision 5 in
the file header names this explicitly as the "what moves besides level" answer, and states
the reasoning (a static one-shot sounding identical on every hit is the thing this avoids).

**NEXT ACTION**
Seat question 7 — the governor.

**OPEN DECISIONS**
None.

**FILE LOCATIONS**
- `src/instruments/drum-sampler.js` — `velocityToPlaybackRate()`, `Voice.trigger()`

---

## SEAT QUESTION 7 — Does it ask the governor? (2026-08-23 18:57 EDT)

**DELIVERABLE STATE**
Yes. `noteOn` calls `governor.request(cost)` before allocating a voice, with the same
allocate/steal/retry sequence §11.2 (and §11.2a's synchronous-steal fix) specifies for
Wave Synth and Overtone Synth — this instrument's voices live in the same shared
`voicePool`, can be stolen by another instrument, and can steal from one, exactly as §11.2
requires ("the same rule regardless of which instrument is asking").

`cpuWeight` per triggered one-shot is `SAMPLE_VOICE_COST = 10` — an honest estimate, not a
direct measurement. findings-scheduler.md Q6 measured a sample trigger's wall-clock cost
(0.006 ms, cheaper than a synth voice's 0.008 ms) but never assigned it a §8 cost unit. 10
is priced off §8's "plain voice (osc+gain+env) = 10" as the closest measured analog by
node count (one `AudioBufferSourceNode` + one `GainNode`, the same two-node shape as a
plain voice minus its envelope automation). Flagged `PROVISIONAL` here, same standing
pattern §8 already uses for `AnalyserNode` and §11.1a uses for Overtone Synth's voice
weight — **not an escalation to Brandon** (it's not sample content or a music question),
informational for whichever TEST seat next measures live `cpuWeight` numbers.

A 40-hit synchronous burst was driven through the real instrument in the test harness;
`voicePool.count` never exceeded the 32-voice default and nothing threw.

**NEXT ACTION**
Seat question 8 — compact/expanded/dispose, and running the full DONE-CHECK.

**OPEN DECISIONS**
`SAMPLE_VOICE_COST = 10` is `PROVISIONAL` (estimate, not measured). Decider if a live
figure is wanted: a future TEST seat measures and reports to the Troubleshooter, same
pattern as `AnalyserNode`/Overtone Synth's weight. Not blocking.

**FILE LOCATIONS**
- `src/instruments/drum-sampler.js` — `SAMPLE_VOICE_COST`, `noteOn()`'s governor sequence

---

## SEAT QUESTION 8 — Compact, expanded, and clean disposal? (2026-08-23 18:58 EDT)

**DELIVERABLE STATE**
`mountCompact`/`mountExpanded` both draw a kit picker (`<select>` over `listKits()`, a
status line) and 8 pads in §14.1's fixed index order, reading the loaded kit's per-piece
`label` override when present and falling back to the default role label otherwise
(design decision 1 — the grid never sees this override, only this instrument's own UI
does). `unmount()` clears DOM and drops every listener it attached, returning a count.
`dispose()` frees every live voice immediately (no fade, matching wave-synth.js's own
teardown rule for the same reason — nothing should fire against a node about to be
disconnected), disconnects the mix node, drops decoded buffer references (§2 amendment:
"release decoded buffers"), and orphans any in-flight kit load so a late `fetch`/`decode`
result is silently dropped instead of resurrecting state on a disposed instance.

**DONE-CHECK — run against the real, unmodified file, real Chrome, real decode:**
Harness at `docs/scratchpad/drum-sampler-test/` (`gen_kit_assets.py`, `test_page.html`,
`run_test.py`, mirrors `recon-scheduler`'s own Playwright-over-http technique). 33/33
checks passed, zero unexpected throws:
- loaded `808` from `/assets/kits/`, mounted compact + expanded (8 pads each)
- triggered all eight pieces by note/index, voices registered and later self-freed
- `getState()`/`setState()` round-tripped through real `JSON.stringify`/`parse`, kit name
  intact
- survived a request for a kit never listed in `kits.json` (error status, page unaffected,
  previously loaded kit stayed playable)
- survived a kit with one deliberately-missing `.wav` (that piece silent, other 7 played)
- switched to a second real kit, **`acoustic`**, with zero code edits — only asset files
- `allNotesOff()` panic-stopped all voices; a 40-hit synchronous burst respected the
  32-voice governor cap
- `dispose()` returned `{nodesDisconnected: 1, listenersDropped: 18}`, cleared both mounts,
  freed every voice, and left `noteOn()` a safe no-op afterward

Both `Builddocs/P2-beat-tool/S4-kits/HOWTO-add-a-kit.md` and both real kit names —
**`808`** and **`acoustic`** — as the seat brief's DONE-CHECK requires.

**WHAT IS MISSING / LEFT TO DO** (seat brief's own closing question)
Nothing in this seat's lane. Two things outside it, named so nobody re-discovers them
blind: (1) the seven non-Kick piece labels are `PROVISIONAL`, Brandon's, already
escalated by `spec-clock` — a one-line edit to `PIECES` in this file whenever he rules.
(2) `SAMPLE_VOICE_COST`'s exact value is an estimate pending a live measurement (seat
question 7) — not blocking, informational only.

**NEXT ACTION**
None — seat's task is complete. Deliver the handoff, post one state-change message to the
Troubleshooter, stop. Do not look for more work.

**OPEN DECISIONS**
Carried from question 7 (`SAMPLE_VOICE_COST` estimate) and the standing, already-escalated
`PROVISIONAL` piece labels from CONTRACTS §14.1. Nothing new.

**FILE LOCATIONS**
- `src/instruments/drum-sampler.js` — full implementation
- `assets/kits/kits.json`, `assets/kits/808/`, `assets/kits/acoustic/` — the two real,
  shipped kits (kit.json + 8 .wav each)
- `Builddocs/P2-beat-tool/S4-kits/HOWTO-add-a-kit.md`
- `docs/scratchpad/drum-sampler-test/` — `gen_kit_assets.py`, `test_page.html`,
  `run_test.py`, `results.json` — the DONE-CHECK harness and its passing run

---

*End of receipt. All 8 seat questions answered, in order, each with its own timestamped
write, per the seat brief's RECEIPT section.*
