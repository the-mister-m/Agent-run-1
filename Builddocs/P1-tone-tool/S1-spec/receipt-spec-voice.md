# RECEIPT — spec-voice — P1/S1

Seat: `spec-voice`. Task: [A-spec-voice.md](A-spec-voice.md). Stage: [STAGE.md](STAGE.md).

---

## 2026-08-22 23:50 EDT — start

DELIVERABLE STATE: Read A-spec-voice.md, STAGE.md, PHASE.md, CONTRACTS.md (frozen
§1-§10), findings-webaudio.md, ROSTER.md, BUILDPLAN.md. All handoff-in material read.
Beginning the eight seat questions in order.
NEXT ACTION: Answer Q1 — what is a voice.
OPEN DECISIONS: none yet.
FILE LOCATIONS: no writes yet.

---

## 2026-08-22 23:51 EDT — Q1, Q2

DELIVERABLE STATE: Q1 (what is a voice) and Q2 (voice stealing) answered in
CONTRACTS.md §11.1–11.2. `Voice` class signature (allocate/trigger/release/steal/free)
written. Node ownership and `cpuWeight` matched to `recon-webaudio` Q2 exactly for the
plain (Wave Synth) voice — 2 nodes, 10 units, off the measured table verbatim. Overtone
Synth voice marked PROVISIONAL (17 units, 17 nodes) since recon never measured a
multi-oscillator voice — floor only, flagged for live measurement. Voice stealing (Q2)
is not redefined — §10-A is already frozen and already general; §11.2 adds the missing
`voicePool` registry (named but undefined in §1) so stealing is provably the same rule
across all six instruments, and states the allocate sequence that calls it.
NEXT ACTION: Answer Q3 — the envelope contract.
OPEN DECISIONS: Overtone voice cpuWeight=17 is a floor, not a measurement — logged as
open decision #2 in CONTRACTS.md, decider `overtone-voice`/Troubleshooter.
FILE LOCATIONS: [CONTRACTS.md §11.1–11.2](../../CONTRACTS.md)

---

## 2026-08-22 23:51 EDT — Q3

DELIVERABLE STATE: Q3 (envelope contract) answered in CONTRACTS.md §11.3. Four
`setParam` paths — `env.attack`, `env.decay`, `env.sustain`, `env.release` — matching
§10-G's frozen defaults exactly (0.005 / 0.08 / 0.7 / 0.15) and the curriculum's four
stage names verbatim. Units and ranges stated (seconds for three, unitless 0–1 level for
sustain). Declared present on every voice-bearing instrument so §11.4/§11.5 don't repeat
it.
NEXT ACTION: Answer Q4 — Wave Synth's exact parameter surface.
OPEN DECISIONS: envelope ranges are this seat's own reasonable defaults, not measured or
curricular — logged as open decision #4, decider Brandon if he wants different bounds.
FILE LOCATIONS: [CONTRACTS.md §11.3](../../CONTRACTS.md)

---

## 2026-08-22 23:51 EDT — Q4

DELIVERABLE STATE: Q4 (Wave Synth's exact surface) answered in CONTRACTS.md §11.4.
Exactly four controls: `osc.wave` (sine/triangle/square/saw), `osc.octave` (−2…+2),
`out.gain` (0–1), plus the inherited `env.*` four. Nothing more, matching the brief's
"it is the simple synth." `getAnalyser('spectrum')` wired, `getAnalyser('scope')` returns
null, matching PHASE.md's inversion.
NEXT ACTION: Answer Q5 — Overtone Synth's exact parameter surface and partial count.
OPEN DECISIONS: none added this question.
FILE LOCATIONS: [CONTRACTS.md §11.4](../../CONTRACTS.md)

---

## 2026-08-22 23:51 EDT — Q5

DELIVERABLE STATE: Q5 (Overtone Synth's exact surface) answered in CONTRACTS.md §11.5.
Partial count set to **8** (indices 0–7, harmonic series ×1–×8), reasoned as an
instrument-design choice in this seat's lane, not music theory — logged as an open
decision anyway since it's a number Brandon may want to override. `partial.0.level`
(fundamental, no multiplier path — fixed ×1), `partial.1..7.multiplier` (integer ≥1,
`Math.round` + floor 1, enforcing the whole-number constraint the curriculum requires),
`partial.1..7.level`. No `osc.octave`, no `out.gain` — task 5 named exactly three things
and this seat held to that list, same restraint as Wave Synth's "nothing more."
NEXT ACTION: Answer Q6 — the analysis tap.
OPEN DECISIONS: partial count = 8 logged as open decision #1 (decider Brandon); no
Overtone `out.gain` logged as open decision #3 (decider overtone-voice/Troubleshooter,
only if clipping becomes a real build-time finding).
FILE LOCATIONS: [CONTRACTS.md §11.5](../../CONTRACTS.md)

---

## 2026-08-22 23:51 EDT — Q6

DELIVERABLE STATE: Q6 (the analysis tap) answered in CONTRACTS.md §11.6. Did not
redefine `getAnalyser()` — that interface is already frozen in §2's amendment block.
§11.6 states where each P1 synth's single, per-instrument (not per-voice) `AnalyserNode`
sits (post-mix, pre-`out`) and which tap each synth answers — spectrum for Wave Synth,
scope for Overtone Synth, null for the other, completing PHASE.md's inversion rule.
Restated that `scopes` reads it on rAF only, never the scheduler (§3), and that
`cpuWeight` must fold in this always-on node, citing §8's existing floor/UNVERIFIED
caveat rather than inventing a new number.
NEXT ACTION: Answer Q7 — the playing-surface interface, §12.
OPEN DECISIONS: none added this question — analyser live-cost measurement is already
§8's open item, owned by `scopes`, not restated as a new decision here.
FILE LOCATIONS: [CONTRACTS.md §11.6](../../CONTRACTS.md)

---

## 2026-08-22 23:51 EDT — Q7

DELIVERABLE STATE: Q7 (playing surface as an interface) answered in CONTRACTS.md
§12.1–12.3. `Surface` class defined — `sourceId`, `constructor(el, input)`, mount/
unmount/dispose — that only ever touches the shared `core/input.js` bus, never an
instrument. Named the producer-side pair (`input.emitNoteOn`/`emitNoteOff`) to §5's
already-frozen consumer-side `input.on`, without altering §5's text. Stated how
`octaveShift`/`positionShift`/`overlay` (§5, §6, all frozen) are read but not owned by a
surface. §12.2 ties this to what P1's `keys-input` builds; §12.3 states why this is what
makes P3's diatonic-keys and scale-circle interchangeable later, per BUILDPLAN.
NEXT ACTION: Answer Q8 — open decisions, close out the receipt.
OPEN DECISIONS: none added this question — §12 introduces no new open items.
FILE LOCATIONS: [CONTRACTS.md §12](../../CONTRACTS.md)

---

## 2026-08-22 23:52 EDT — Q8 and DONE-CHECK, seat closed

DELIVERABLE STATE: Q8 answered — all four open decisions collected in CONTRACTS.md's
new "OPEN DECISIONS — spec-voice" block, each with a named decider (Brandon on two,
`overtone-voice`/Troubleshooter on two), none blocking. None is a music-theory question,
so none escalated to Brandon directly per this seat's ESCALATION section — they're
logged, not asked.

**DONE-CHECK — the exact `setParam` path list, per the brief's own test:**

Wave Synth: `osc.wave`, `osc.octave`, `out.gain`, `env.attack`, `env.decay`,
`env.sustain`, `env.release`. Seven paths, all unambiguous (§11.4).

Overtone Synth: `partial.0.level`, `partial.1.multiplier` … `partial.7.multiplier`,
`partial.1.level` … `partial.7.level`, `env.attack`, `env.decay`, `env.sustain`,
`env.release`. Twenty paths, all unambiguous (§11.5).

A reader holding only §2, §5, §11, §12 can write both synths and the keyboard with no
further questions — the stage DONE-CHECK (STAGE.md) and this seat's own DONE-CHECK both
pass. §11 and §12 appended to CONTRACTS.md, append-only, §1-§10 untouched. No `/src` file
written. No file touched outside this seat's lane.

NEXT ACTION: none — seat is done. Do not start S2. State-change message posted to the
Troubleshooter/session. Stopping here per the brief.
OPEN DECISIONS: 1) Overtone partial count = 8 — decider Brandon. 2) Overtone voice
`cpuWeight` = 17 is PROVISIONAL — decider `overtone-voice` (live-measure), report to
Troubleshooter. 3) No Overtone `out.gain` — decider `overtone-voice`/Troubleshooter, only
if clipping surfaces as a real build finding. 4) Envelope parameter ranges are this
seat's own defaults — decider Brandon if he wants different bounds. Full text in
CONTRACTS.md's OPEN DECISIONS block.
FILE LOCATIONS: [CONTRACTS.md §11](../../CONTRACTS.md) · [CONTRACTS.md §12](../../CONTRACTS.md)
· [CONTRACTS.md OPEN DECISIONS — spec-voice](../../CONTRACTS.md) · this receipt.
