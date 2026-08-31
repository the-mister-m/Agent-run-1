# OPEN DECISIONS — P2 (Beat Tool) — Brandon only

Task: every question P2 raised that the contract cannot answer, plus repair-seat items
still awaiting a ruling. Written by: Troubleshooter, at P2 close. 2026-08-23 21:20 EDT.
Sources: [redpen-report.md](S7-verify/redpen-report.md) · [test-report.md](S7-verify/test-report.md) ·
[receipt-fix-clock.md](S6-shell/receipt-fix-clock.md) · [receipt-capture.md](S5-capture/receipt-capture.md) ·
[CONTRACTS.md](../CONTRACTS.md) §13/§14

Numbered independently from [P0's open-decisions.md](../P0-run-open/open-decisions.md)
(D-1–D-28) to avoid collision — these are **P2-1** through **P2-9**. Nothing here blocks
P3 from starting; each item names what it does block, if anything.

---

### P2-1 · Time-signature bottom: symbol, digit, or nothing? — raised 3× before this ruling was asked for
Outline line 22: "I use the symbol for the bottom number." The app ships `4/4`, plain
digits. Three seats (`spec-clock`, `grid`, `beat-shell`) each independently declined to
reopen it, citing §13.4/**D-20**. `redpen-p2` read D-20 itself rather than repeat them:
your answer — *"it doesn't need to be there"* — has two readings that produce different
apps: drop the **symbol** (keeps `4/4`, what's shipped) or drop the **bottom number**
entirely (renders `4`). The adjacent ruling **D-13** says "FOLLOW THE SCOPE," and the
scope (outline) says symbol.

- **Brandon:** OH SHIT if there is no standard notation, then leave the bottom number out.  What symbol gets the beat is irrelivant, in the DAW the click track is the beat (did we build one of those? lol) so no symbol needed.  

**CLOSED 2026-08-24** — written into CONTRACTS §13.4. No click track exists yet; not built in P0–P2, not this decision's scope.

### P2-2 · Tempo wording: "BPM" vs. the outline's "beats per second" — new, not raised before


- **Brandon:** I wouldn't call it a mismatch, this is an example of good judgement (I assumed this)

**CLOSED 2026-08-24** — no contract or code change.

### P2-3 · Does `audio.js` take the CPU-meter hook? — blocks nothing, but the meter reads 0.0000 until answered
`fix-clock` built real scheduler-pass timing (`clock.schedulerLoad`, correctly scaled and
verified) but the frozen P1 governor has no method to receive it. The exact ~6-line
addition is written out verbatim in [receipt-fix-clock.md](S6-shell/receipt-fix-clock.md)
OPEN DECISIONS 1. `clock.js` already calls it duck-typed — no second edit needed there
either way.

- **Brandon:** apply the patch

**QUEUED, not closed** — this is a code change (the ~6-line patch in receipt-fix-clock.md OPEN DECISIONS 1), not a doc update. Build task for the next session; see TODO.md.

### P2-4 · Quantization default for captured takes
`capture.js` recommendation (built as the shipped default, not yet ruled on): quantize
**ON**, snap to the lane's own division, snap shown visibly (drift reported per hit, e.g.
"3 of 4 hits moved · avg 14 ticks"). Reasoning: the beat tool teaches where the beat is,
it's reversible (raw take kept underneath), and P2 always plays from the grid so an
unsnapped hit would look and sound different. Counter-consideration it flagged itself: a
student with good time being told the computer corrected them may stop trusting their own
timing.

- **Brandon:** if students are clicking then snap is default, if they've performed and recorded from the keyboard then snap is NOT default.  I want the mistakes to be captured when they actually play it but the clicks ot be super easy to line up to the grid

**RULING written into CONTRACTS §13.5** (the same snap-by-input-source rule P2-5 restates). **Implementing it in `capture.js` is a build task, not closed here** — see TODO.md.


### P2-5 · §13.5/§13.6 conflict — off-grid notes can never be marked
§13.6 requires a captured note that lands off-grid be "marked off-grid" for the student to
see. §13.5 fixes a step's data at `null | {v}` — velocity only, no field to carry the
mark. The grid ships dead CSS for exactly this (`[data-off-grid="true"]`) that can never
fire. Not a BUILD seat's mistake — two subsections of your own contract ask for different
things. `spec-clock`'s section (§13) is where this gets resolved.

- **Brandon:** the contract was a mistake from an agent.  Wire however you need to in order for it to be accurate and faitfuul to how how the students actually performed it when they recorded, and allow the students to leave teh grid if they choose when inputting notes (default snap in programming, default slop in performance lol)

**CLOSED 2026-08-24** — mechanism written into CONTRACTS §13.5/§13.6 (an off-grid `tick` field on the step, save no longer re-quantizes it). **Wiring the grid/capture code to actually write and read it is a build task** — see TODO.md.

### P2-6 · `clock.js`'s undocumented public surface — P3/P4 will bind to it either way
`clock.js` publishes eight members and a full `'tick'` payload shape that no CONTRACTS
section defines (`positionTicks`, `countingIn`, `schedulerLoad`, `lastPassMs`,
`countInRemainingBars`, `leadingEdgeTicks`, `unschedule()`, `'resync'`). Honestly marked
`EXTENSION` in source, but never written into §13. Three files already depend on it hard;
P3's piano roll and P4's arrangement ruler will too. Not a defect — documentation debt
that compounds every phase it's left unamended.

- **Brandon:** the 8 seem to add and not subtract, so write it into the contracts now

**ANSWERED 2026-08-24.** Written into **CONTRACTS §3 · TRANSPORT** as `[AMENDED 2026-08-24]`
— not §13. This entry said §13 (GRID); that was this audit's error. `clock.js`'s public
surface is the transport surface, and the clock seat's own receipt already called these
"not §3 members." §3 is where they landed.

All eight members plus the `'tick'` / `'statechange'` / `'resync'` payloads are now contract.
The amendment also freezes the rule the B1 fix established — **every public member that
speaks about "now" reports the AUDIBLE now**, not the scheduler's leading edge — so no
future seat rebuilds `capture.js`'s negative-tick bug or re-adds a `positionTicks < 0` guard.
`schedulerLoad` / `lastPassMs` are written as diagnostics, not a second meter. **CLOSED.**

### P2-7 · Hi-hat choking — unimplemented, unassigned
`drum-synth` didn't build it, reads it as a grid-level feature (choke groups), not an
instrument's own job. No seat owns it yet.

- **Brandon:** build it, make it super peripheral with the option to take it out of the front end in subsequent versions

**QUEUED, not closed** — no contract change needed (choke groups are a grid-level feature already in lane per this decision's own framing). Build task for next session; see TODO.md.

### P2-8 · Sampler has no output gain — `drum-synth`/`drum-sampler` behavioral divergence
Both machines implement §2 correctly but differently: `drum-synth.setParam` exposes
`out.gain` + per-piece keys; `drum-sampler.setParam` exposes `kit` only — no gain control,
can't be automated or saved. §11.7 exists precisely to stop this kind of split.

- **Brandon:** give the sampler a gain param

**QUEUED, not closed** — §2/§11.7's existing uniformity rule already covers this (no new CONTRACTS text needed); it's `drum-sampler.js` catching up to `drum-synth.js`. Build task for next session; see TODO.md.

### P2-9 · Bad kit is selectable before it fails (§14.3)
A kit folder with a missing/broken `kit.json` should be "listed as unavailable, named, and
not selectable" per §14.3. Currently every kit in `kits.json` renders selectable and the
failure only surfaces after the student picks it. Both shipped kits are valid, so this
never triggered in testing.

- **Brandon:** if a kit is unavailable, have the screen say it when the kit would normally load

**CLOSED 2026-08-24** — written into CONTRACTS §14.3, superseding its original "not selectable" text. **Wiring `drum-sampler.js`/the kit picker to match is a build task** — see TODO.md.

---

## LOW SEVERITY / INFORMATIONAL — no ruling required, logged so nothing gets re-filed

- **`overlay='none'` still draws beat digits**, only subdivisions blank. Arguably correct
  teaching default; a real divergence from §6's two-value enum either way. `step-grid.js`.
- **`record()` takes the same loop-entry fix as `play()`** — one step past `fix-clock`'s
  literal brief (which named `play()` only). Reverting is one deleted call. Left in because
  the alternative (recording straight through an armed loop) reads as worse.
- **`beat.html`'s duplicate CSS block** is now redundant (the export it was working around
  exists) but harmless. Troubleshooter will route as a trivial cleanup, no ruling needed.
- **`noteOff()` is an intentional no-op** in both drum machines — correct for one-shots,
  documented, done identically by both seats independently. No action.

---

## OUTSIDE P2 — surfaced during this phase's audit, not this phase's to fix

### Overtone Synth partial count — P1, `spec-voice`'s file
`open-decisions.md` **D-22**: your answer was **"1-12"** partials. CONTRACTS §11.5 fixes
the count at **8**, and the shipped P1 file (`overtone-synth.js`) ships 8 — your D-22
answer appears not to have been applied. Does not block P3.

- **Brandon:** GO BACK AND MAKE IT 1-12.

**CLOSED 2026-08-24** — CONTRACTS §11.5 and §11.1a updated to 12 partials. **Rebuilding the shipped `overtone-synth.js` (currently 8) is a P1 rework task** — see TODO.md.
