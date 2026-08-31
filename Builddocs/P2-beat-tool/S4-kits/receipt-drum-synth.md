# RECEIPT — drum-synth — P2/S4

Seat: `drum-synth`. Task: [A-drum-synth.md](A-drum-synth.md). Stage: [STAGE.md](STAGE.md).

---

## 2026-08-23 18:42 EDT — start, Q1 (the eight pieces, in order)

DELIVERABLE STATE: Read A-drum-synth.md in full (lane, seven seat questions, done-check,
escalation, receipt schema, timestamp rule). Read CONTRACTS §2 and its `[AMENDED
2026-08-22]` block (`ready()`, `getAnalyser()`, `static pieces`, `onNoteOut`/`offNoteOut`),
§8 (governor, the measured cpuWeight table), and §14 (KITS, in full — §14.1 through
§14.5) plus the P2/`spec-clock` OPEN DECISIONS list. Read STAGE.md (P2/S4's collision
map — no file in this stage is written by more than one seat) and the sibling receipts
this seat's brief pointed at implicitly by convention: `wave-synth.js` and
`overtone-synth.js` (P1) for house style, and `core/audio.js` for the real, frozen
`voicePool`/`governor` export shape. Confirmed `/src/instruments/drum-synth.js` does not
exist yet.

**Q1 — which eight pieces, in what order.** CONTRACTS §14.1's table, exactly, index and
note taken as FROZEN (index 0 by §10-E; the rest by General MIDI, per §14.1's own stated
reasoning for the note numbers) and label taken exactly as §14.1 prints it — PROVISIONAL,
unchanged:

| index | note | label |
|---|---|---|
| 0 | 36 | Kick |
| 1 | 38 | Snare |
| 2 | 42 | Closed Hat |
| 3 | 46 | Open Hat |
| 4 | 39 | Clap |
| 5 | 45 | Low Tom |
| 6 | 50 | High Tom |
| 7 | 49 | Crash |

**On the brief's own escalation clause — "the eight piece names go to Brandon only if §14
leaves ambiguity; check what spec-clock actually wrote there first."** Checked. §14.1
already states the labels are provisional AND states `spec-clock` "escalated this to
Brandon in chat on 2026-08-23 and did **not** wait" and that OPEN DECISIONS item 1 (P2/S1)
names Brandon as decider and explicitly "not blocking." Nothing about the table left this
seat unable to build: index, note, and count are unambiguous and frozen; the only open
part is a display word, and §14.1 itself explains why that is designed to be swappable
without touching anything downstream (a kit's manifest may override a piece's `label`; the
role does not move). Per the brief's own wording, this does not meet "ambiguity" — it is a
resolved, usable table with one flagged-open cosmetic field. **This seat did not
re-escalate.** If Brandon overwrites the seven labels, only the `label` field in this
file's `PIECE_DEFS` table needs to change — index/note/weight/params/recipes are untouched
by that edit, exactly as §14.1 designed for.

`static pieces` is implemented as `PIECE_DEFS.map(d => ({index, note, label}))` — the
literal §2-amendment shape the grid consumes (§14.5: "the grid's entire knowledge of an
instrument is two frozen §2 members" — `pieces` and `noteOn`). Verified live in the
DONE-CHECK test page: `DrumSynth.pieces` deep-equals the table above, in order.
NEXT ACTION: Q2 — state each piece's synthesis recipe (oscillator/noise/envelope/filter),
in code and in this receipt.
OPEN DECISIONS: none yet.
FILE LOCATIONS: no writes yet at this entry.

---

## 2026-08-23 18:43 EDT — Q2 (synthesis recipes)

DELIVERABLE STATE: `/src/instruments/drum-synth.js` written. **Q2 — how each piece is
synthesized, node recipe, per the brief's own framing ("every piece is a teaching
artifact — a student who opens the Patch Synth in P4 should recognize these shapes").**
Built from exactly four reusable recipes, so the eight pieces are three tunings of two
families plus two single pieces, not eight bespoke synths:

- **THUMP** (Kick idx0, Low Tom idx5, High Tom idx6) — one `OscillatorNode` (sine),
  pitch-swept downward via `exponentialRampToValueAtTime` from a velocity-brightened start
  frequency down to the piece's tuned base, into one `GainNode` carrying a fast-attack /
  exponential-decay amplitude envelope. 2 nodes. The textbook 808-style kick shape, at
  three tunings/decay times.
- **NOISE+TONE** (Snare idx1) — a short triangle-oscillator tone burst (its own
  osc+gain, ~180Hz) blended with a filtered noise burst (`AudioBufferSourceNode` through a
  bandpass `BiquadFilterNode`, ~1800Hz center), summed into one mix gain. 6 nodes.
- **CLUSTER** (Closed Hat idx2, Open Hat idx3, Crash idx7) — three detuned square
  `OscillatorNode`s at inharmonic ratios (`1, 1.47, 2.03`× a root frequency) summed into
  one gain (which doubles as the voice's envelope, matching the codebase's own established
  pattern of one node carrying both a mix role and an envelope role), through a highpass
  `BiquadFilterNode`. The inharmonic counterpart to Overtone Synth's harmonic partial
  stack — same "several oscillators, one filtered sum" shape, different ratio set. 7 nodes
  (3 osc, 2 trim gains, 1 mix/env gain, 1 filter). Closed Hat and Open Hat are the SAME
  recipe at the same cpuWeight, differing only in decay time and filter cutoff — Crash is
  the same recipe again, tuned lower and much longer.
- **BURST NOISE** (Clap idx4) — one filtered noise voice whose single gain node is
  shaped into three quick bursts (12ms apart, simulating several hands slightly out of
  sync) before its tail, via extra `AudioParam` automation points on the same node — no
  extra nodes needed for the multi-burst effect. 3 nodes.

Full per-piece parameter defaults/ranges (`tune`, `sweep`, `sweepTime`, `decay`, `tone`,
`filterFreq`, `root`, `burstSpacing`, `level` — whichever apply to that piece's family) are
in `PIECE_DEFS` in the file, each exposed at `setParam('piece.<index>.<key>', value)` —
this file's own addition, since CONTRACTS names no fixed path list for a drum synth the
way §11.4/§11.5 name one for Wave/Overtone Synth. Verified live in the test page: all
eight pieces produce a real, non-silent signal on `getAnalyser('spectrum')` when triggered
by index through the exact grid call shape §14.5 specifies
(`inst.noteOn(pieces[i].note, velocity, atTime)`).
NEXT ACTION: Q3 — confirm §2 is implemented completely, `getState`/`setState` round-trip.
OPEN DECISIONS: (1) Hi-hat choking (a Closed Hat cutting off a ringing Open Hat) is a real
drum-machine behavior this file does NOT implement — each `noteOn` call knows nothing of
any other piece or any other live voice by design (§14.5: "the grid never touches the
sound"; nothing in §2/§14 gives one piece a hook into another). Decider: Troubleshooter/
Brandon, if wanted — this is a sequencer/grid-level feature (which pieces choke which),
not a single-instrument synthesis question, and does not block this seat. (2) Noise-source
cpuWeight (`AudioBufferSourceNode` + its own `GainNode`, priced at 10, the same unit as an
oscillator+gain) is a PROVISIONAL floor, not a direct measurement — recon-webaudio Q2
never isolated a noise-buffer source from an oscillator. Same reasoning §11.1a already
used for Overtone Synth's own cpuWeight. Decider: a future `scopes`-style live-measurement
seat, if one is assigned to drum instruments; not blocking.
FILE LOCATIONS: [/src/instruments/drum-synth.js](../../../src/instruments/drum-synth.js)
(PIECE_DEFS, the four recipe functions `triggerThump`/`triggerNoiseTone`/`triggerCluster`/
`triggerBurstNoise`).

---

## 2026-08-23 18:44 EDT — Q3 (§2 completeness, JSON round-trip)

DELIVERABLE STATE: **Q3 — does it implement §2 completely, does `getState`/`setState`
round-trip through JSON.** Every base-§2 method present: `static id/label/playable`,
`constructor(ctx, out)`, `noteOn/noteOff/allNotesOff`, `setParam/getParam`,
`getState/setState`, `voiceCount`/`cpuWeight` getters, `mountCompact/mountExpanded/
unmount/dispose`. All four `[AMENDED 2026-08-22]` additions present: `static
needsLoad`(false)/`ready()`(resolves immediately, nothing to decode — pure math),
`getAnalyser(which)` (one post-mix `AnalyserNode`, returned for both `'spectrum'` and
`'scope'` since nothing in CONTRACTS restricts a drum instrument's tap to one — this
seat's own reasonable default, logged rather than assumed), `static pieces` (Q1, above),
`emitsNotes`(false)/`onNoteOut`/`offNoteOut` (both no-op — this instrument only consumes
notes).

**One deliberate, documented departure from the two P1 synths' shape:** `noteOn`'s `note`
argument is a PIECE SELECTOR here (matched against §14.1's fixed table), never converted
through `midiToFreq()` the way Wave/Overtone Synth use it as a pitch — each piece's own
`tune`/`root` param carries its real synthesis frequency. This is what §14.5 requires
("a piece is played by its note through noteOn, exactly as every other instrument in this
app is played") without also requiring the note number to BE a pitch, which GM percussion
numbers are not.

`getState()` returns `{ gain, pieces: [ {…8 entries, index-ordered, only that piece's own
param keys…} ] }` — plain numbers only, no functions/nodes/`undefined`. `setState(obj)` is
a silent no-op on anything that isn't a plain object (§11.7b's precedent — see Q3
verification below), otherwise walks the same shape back through `setParam`'s own clamps.
Verified live in the test page, for real, not asserted: captured `getState()`,
`JSON.stringify`/`JSON.parse`'d it, mutated several params away, called `setState(parsed)`,
re-captured `getState()` — **byte-identical to the original JSON.** Also verified
`setState('not an object')`, `setState(null)`, `setState(42)` — none threw.
NEXT ACTION: Q4 — confirm velocity moves more than level.
OPEN DECISIONS: §11.7's "instrument uniformity" rules (missing velocity defaults to 0.8;
unrecognized path/malformed state is a silent no-op, never a throw) are stated as
"binding on every instrument from here forward," not only the two P1 synths that forced
them — this file follows both, and follows neither for §11.7's third rule (live `env.*`
propagation), since this instrument exposes no `env.*` path surface at all (each piece's
envelope is fully scheduled at trigger time, not a sustained ADSR a student holds open —
see NOTE ON NOTE-OFF in the file header). Decider: Troubleshooter, if this reading of
§11.7c's scope needs confirming; not blocking, since the rule's own text only binds
`env.*` paths and this file has none.
FILE LOCATIONS: [/src/instruments/drum-synth.js](../../../src/instruments/drum-synth.js)
(class header, `getState`/`setState`, `setParam`/`getParam`).

---

## 2026-08-23 18:45 EDT — Q4 (velocity beyond level)

DELIVERABLE STATE: **Q4 — does velocity actually change the sound, not just the level.**
Every one of the four recipes moves at least one more thing besides loudness:

- **Thump:** velocity raises the pitch-sweep's starting frequency
  (`startFreq = tune + sweep × (1 + velocity×0.6)`) — a harder hit clicks brighter on top
  of the same fundamental thump.
- **Noise+Tone (Snare):** velocity raises the noise branch's bandpass filter cutoff
  (`filterFreq + velocity×800`) and shifts the tone/noise balance toward more noise energy
  at higher velocity — a harder hit is audibly brighter, not just louder.
- **Cluster (hats/Crash):** velocity raises the highpass filter cutoff
  (`filterFreq + velocity×1500`) AND widens the detune spread on the two upper oscillators
  (`spread = 1 + velocity×0.01`) — two independent moves, brighter and more shimmer.
- **Burst Noise (Clap):** velocity raises the bandpass filter cutoff
  (`filterFreq + velocity×600`), same brightening move as the Snare's noise branch.

Every recipe also scales peak gain by velocity, so loudness moves too — the requirement is
"not JUST the level," not "level doesn't move." Verified live in the test page two ways:
(1) the exact filter-cutoff arithmetic re-derived from the instrument's own live
`getParam('piece.1.filterFreq')` at velocity 0.1 vs. 0.95 — 1880Hz vs. 2560Hz, a real,
audible timbral difference, not a rounding artifact; (2) two live Snare hits at those same
velocity extremes both produced real, distinctly-different-magnitude non-silent signal on
`getAnalyser('spectrum')` (15/128 vs. 104/128 deviation).
NEXT ACTION: Q5 — governor.request(cost), honest per-piece cpuWeight.
OPEN DECISIONS: none new at this entry.
FILE LOCATIONS: [/src/instruments/drum-synth.js](../../../src/instruments/drum-synth.js)
(the velocity terms inside all four `trigger*` functions).

---

## 2026-08-23 18:46 EDT — Q5 (governor, honest cpuWeight)

DELIVERABLE STATE: **Q5 — does it ask the governor, is `cpuWeight` reported honestly per
piece.** `noteOn` calls `governor.request(cost)` before allocating, `cost` = the piece's
fixed §8-derived weight, looked up from `PIECE_DEFS` — never a flat guess. On refusal:
`voicePool.steal()` (§11.2a — deregisters synchronously) + `.steal(atTime)` on the result
+ retry once, exactly matching `wave-synth.js`'s/`overtone-synth.js`'s own allocate/
steal-retry shape; §10-A's "a note is never refused" is honored with the same defensive
`console.warn` fallback those two files use.

**Weights, computed from §8's own measured table (GainNode=1, BiquadFilterNode=9, plain
voice osc+gain=10), not invented flat:**

| Piece | Family | Nodes | cpuWeight | Why |
|---|---|---|---|---|
| Kick, Low Tom, High Tom | thump | osc+gain | **10** | §8's exact "plain voice" |
| Snare | noiseTone | 2×(osc/src+gain) + filter + mix gain | **30** | 10+10+9+1 |
| Closed Hat, Open Hat, Crash | cluster | osc0+gain(10) + 2 trim gains(1each) + filter(9) | **21** | 10+1+1+9 |
| Clap | burstNoise | noise+gain + filter | **19** | 10+9 |

Directly satisfies the brief's own instruction ("a noise-plus-filter piece costs more than
a sine thump"): 30/21/21/19 all exceed 10. `cpuWeight` getter returns the live running sum
— every live voice's fixed weight **plus** this instrument's always-on `AnalyserNode`
floor (2, §8/§11.6's "must include the analyser, not just the voices" reading, matching
both P1 files). Verified live: filled the DAW-wide 32-voice cap with the cheapest piece
(Kick, weight 10) — `cpuWeight` read exactly `322` (32×10+2), `governor.request(10)`
correctly refused at the cap, and a 33rd hit still sounded via steal-and-retry
(`voicePool.count` held at 32, never 33, never a dropped hit).
NEXT ACTION: Q6 — compact vs. expanded mounts.
OPEN DECISIONS: (2) from the Q2 entry, restated — the noise-source-as-plain-voice-unit
pricing (Snare/Clap's "10" for source+gain) is a PROVISIONAL floor, not a direct
measurement; not blocking.
FILE LOCATIONS: [/src/instruments/drum-synth.js](../../../src/instruments/drum-synth.js)
(`PIECE_DEFS[].weight`, `noteOn`'s allocate/steal-retry block, `cpuWeight` getter).

---

## 2026-08-23 18:47 EDT — Q6 (compact and expanded)

DELIVERABLE STATE: **Q6 — compact and expanded.** `mountCompact(el)` renders eight small
pads only (`.ds-compact`, tight 4-column grid, 11px type) — the DAW channel view, "the
grid triggers by index" satisfied by each pad calling `noteOn(piece.note, 0.8)` directly.
`mountExpanded(el)` renders the same eight pads PLUS, for every piece, its own section
showing every one of that piece's live, playable parameters as range sliders (tune/sweep/
decay/filterFreq/etc., whichever apply, per `PIECE_DEFS`) with a live readout, plus a
per-piece velocity slider used the next time that pad is clicked, plus a running
`voices N · cpuWeight N` meter and an `out.gain` control — "each piece's parameters are
visible and playable," verbatim. Both mounts read the SAME instrument state
(`this._params`); an edit in the expanded mount's slider calls `setParam` directly, and
`_syncUI()` pushes any change into every live mount, both-mounts-live-at-once, same
dual-mount pattern `wave-synth.js`/`overtone-synth.js` already established, with the
`document.activeElement` guard so a slider mid-drag is never overwritten. Styles read
`/src/ui/tokens.css` custom properties with fallbacks confirmed byte-identical to that
file's real values (`--bg #0a0d13`, `--panel #1b2332`, `--line #3a485f`, `--text #f2f6fc`,
`--text-dim #93a1b8`, `--accent #34e5b4`) per §9, matching the D-7 fix precedent the two
P1 files carry. Verified live in the test page: compact renders exactly 8 pads, expanded
renders exactly 8 per-piece param sections, clicking a compact pad triggers the real
instrument (`voiceCount` moved 0→1), and editing an expanded param slider moved the live
instrument's own `getParam` value (distinguished from that piece's velocity slider via a
`data-param-key` attribute added specifically so this was testable, not guessed).
NEXT ACTION: Q7 — clean dispose, then run the DONE-CHECK test page for real and close the
seat.
OPEN DECISIONS: none new at this entry.
FILE LOCATIONS: [/src/instruments/drum-synth.js](../../../src/instruments/drum-synth.js)
(`_paint`, `_syncUI`, `_reflectActivity`, the injected `<style id="drum-synth-styles">`
block).

---

## 2026-08-23 18:52 EDT — Q7 (clean dispose), DONE-CHECK run, seat closed

DELIVERABLE STATE: **Q7 — does it dispose clean, zero leaked nodes/listeners.**
`dispose()` calls `unmount()` first (drops every DOM listener across both mounts, clears
every pending pad-flash `setTimeout`, returns a count), force-frees every live voice
immediately — bypassing any natural tail, teardown not a musical event, so no orphaned
timer can later fire against a node about to be disconnected — then disconnects the two
nodes this instrument itself owns (`_masterGain`, `_analyser`) and returns
`{nodesDisconnected, listenersDropped}` so a caller can verify by count, same return shape
`core/audio.js`'s and both P1 instruments' own `dispose()` use. `Voice.free()` is
idempotent and disconnects every node a given hit owns (2 for a thump, 6 for the
noise+tone snare, 7 for a cluster, 3 for burst noise), tracked per-voice so the count is
exact regardless of which pieces were live.

**DONE-CHECK — run for real in headless real Chrome via Playwright, not simulated,** local
static file server (`http.createServer` at `127.0.0.1`, since ES module imports do not
load over `file://` — the same constraint §10's amendments already document) with the
network otherwise disabled — nothing in this file or the test page fetches, imports a
sample, or reaches any host. Test page:
[test-drum-synth.html](test-drum-synth.html). Runner script lived outside the project
tree, scratchpad-only. Covered, matching the brief's DONE-CHECK line item for item: all
eight pieces trigger by index (via the exact grid call shape §14.5 names) and each
produces real, non-silent, per-piece-distinct signal; velocity moves brightness beyond
level (Q4, both derivation and live audible-signal check); `getState`/`setState`
round-trips losslessly through `JSON.stringify`/`JSON.parse`; `cpuWeight` reports honestly
per piece and at the 32-voice cap (exactly 322); the cap fills exactly, refuses the 33rd
`governor.request`, and the 33rd hit still sounds via correct steal-and-retry (§10-A never
a dead pad); `mountCompact`/`mountExpanded` both render live and share state; `dispose()`
reports a verified-by-count zero-leak teardown, including with a voice live at the moment
of disposal. Two real bugs were caught and fixed by this run before it went green, not
waved through: (1) an early check's own wait time was too short for the Crash piece's 1.8s
tail — test timing fix, not a source fix; (2) the expanded-mount playability check
originally selected the wrong `<input type="range">` (a piece's velocity slider, which is
deliberately not wired to `setParam`, comes before its param rows in the DOM) — fixed by
adding `data-param-key` to the actual param inputs, a small, real, permanent improvement to
the source file's testability, not a test-only patch.
**42 of 42 checks passed, 0 failed, 0 console errors, 0 page errors, final clean run.**

**What is UNVERIFIED, same standing discipline as the P1 receipts:** hearing any of the
eight pieces — this environment has no audio output device (`outputLatency === 0`,
findings-webaudio.md), Brandon's hardware recon per A53 is what will confirm sound in
practice. Whether the eight pieces are spectrally/perceptually correct as drum sounds
(a real ear judgment on the kick's punch, the snare's crack, the hats' metallic character)
— this seat verified each produces genuine, distinct, velocity-responsive signal on a real
analyser and reasoned the synthesis design from established drum-machine technique (pitch-
swept sine kicks, filtered-noise snares, inharmonic-oscillator-cluster hats — all standard,
documented approaches), not that a listener will judge them musically satisfying.

**What is missing / left for `capture` (S5):** nothing on this file — all seven seat
questions answered in code and in this receipt, DONE-CHECK passes clean. `capture` still
needs to route the grid's step data into this instrument's `noteOn` calls at scheduled
times and wire this file alongside `drum-sampler.js` and `step-grid.js` into the beat
tool's shell — none of that is this seat's to build per the brief ("do not build a grid").

NEXT ACTION: none — seat is done. Handoff delivered. One state-change message going to the
Troubleshooter next. Not looking for more work, not loading a file, not building a grid,
per the brief's own closing instruction.
OPEN DECISIONS (full list, restated together for the Troubleshooter/Brandon):
1. Hi-hat choke groups are not implemented — a grid/sequencer-level feature, not this
   single instrument's contract to invent. Decider: Troubleshooter/Brandon if wanted; not
   blocking.
2. Noise-source cpuWeight (10, same unit as osc+gain) is a PROVISIONAL floor, following
   §11.1a's own precedent for an unmeasured node combination. Decider: a future live-
   measurement seat, if assigned; not blocking.
3. §11.7c's live-envelope-propagation rule does not apply to this file — it exposes no
   `env.*` path surface (every piece's envelope is fully scheduled at trigger time, one-shot
   by design, matching real drum-machine behavior where releasing a pad does not cut the
   sound). Decider: Troubleshooter, if this reading needs confirming; not blocking.
4. The seven PROVISIONAL piece labels (§14.1) are Brandon's, per §14.1's own marking — this
   seat did not re-escalate (see the Q1 entry above for why) and changing them later is a
   one-field edit to `PIECE_DEFS`, nothing else in this file moves.
FILE LOCATIONS: [/src/instruments/drum-synth.js](../../../src/instruments/drum-synth.js)
(whole file) · [test-drum-synth.html](test-drum-synth.html) (the DONE-CHECK test page,
throwaway, lives in this seat's own stage folder, path also recorded here per the brief) ·
this receipt.

---
