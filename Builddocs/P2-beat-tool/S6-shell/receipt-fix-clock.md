# RECEIPT — `fix-clock`, repair seat, P2/S6

Seat: `fix-clock` · BUILD · repair seat, not a numbered roster seat. Spawned by the
Troubleshooter to close bugs `beat-shell` found in already-closed files during integration.
Opened: 2026-08-23 19:47 EDT · Last written: **2026-08-23 20:27 EDT** — seat complete, nothing in flight.

Assigned: **item 1** (CPU meter never moves) and **item 5** (two timing seams) of
[receipt-beat-shell.md](receipt-beat-shell.md)'s final report — its open decisions **3**, **7**
and **8**.

**Lane.** Owns `/src/core/clock.js` and nothing else. `audio.js` is frozen P1 output and was
**NOT edited and NOT monkey-patched** — see OPEN DECISIONS 1, which is the whole of Bug A's
remaining half. `step-grid.js`, `capture.js`, `drum-synth.js`, `drum-sampler.js`, `beat.html`
and `CONTRACTS.md` were read where needed and never written.

---

## DELIVERABLE STATE

**Three bugs closed in `clock.js`, one escalated at the wall the brief named.**
Every claim below was driven in real headless Google Chrome against the real
`AudioContext` — no claim in this receipt rests on reading the code.

| Bug | Verdict |
|---|---|
| **A** · CPU meter never moves | **HALF CLOSED, HALF ESCALATED.** The honest number now exists, moves, and is correctly scaled — on `clock.schedulerLoad`. `governor.load` still cannot read it, and that is an `audio.js` change this seat did not make. **OPEN DECISIONS 1.** |
| **B1** · `countingIn` vs `position` disagree for ~100 ms | **CLOSED.** |
| **B2** · `play()` past `loop.endBar` never enters the loop | **CLOSED.** |
| **B3** · *(found here, not in the brief)* the loop can escape through its own seam | **CLOSED.** Same root cause as B2. |
| **REGRESSION** · the `clock` seat's own numbers, re-run because this seat touched the scheduler pass | **NO REGRESSION.** 5 min / 601 beats at **0.000000 ms**, 0 dropped, 0 doubled · 64-bar drift **0 ticks** on both 16ths and triplets · 40/40 loop wraps clean. |

### Harness

`fix-clock-testpage.html` driven by `fix-clock-testdriver.py` — the same shape, browser and
standard as the `clock` seat's own `S3-clock/clock-testdriver.py`: real Google Chrome,
headless, project root served over `http://127.0.0.1` (§10 forbids assuming `file://`).
**Each probe runs on a freshly loaded document** — one AudioContext, one clock module
instance, nothing carried in from the probe before it.

Raw output: `fix-clock-results-fix.json` · `fix-clock-results-redo.json` ·
`fix-clock-results-seam-BEFORE-FIX.json` (the pre-fix escape) · logs `fix-run*.log`.

---

## BUG B1 — the "bar 0" flash at the top of every take. CLOSED.

**What was wrong.** `_countingIn` is the SCHEDULER's flag and flipped false at the leading
edge — up to one 100 ms lookahead window before the student heard the last count-in click.
`position` deliberately reports the AUDIBLE now. For that window the flag said the take had
started while `position` was still on the negative side of the record point, and
`fromTicks()` of a negative tick renders as **bar 0**. `beat-shell` measured `0 . 4 . 461`.

**The fix.** Both numbers were right about different instants. The transport now reports ONE
instant publicly — the audible one. A new `_countInEndTime` records the AudioContext time of
the record point where the scheduler commits the count-in's final window, and a new
`audiblyCountingIn()` is the single source for `countingIn`, `position`, `positionTicks` and
`countInRemainingBars`. The raw `_countingIn` is untouched as the leading-edge flag and still
gates the `'tick'` emit — **suppression has to happen when a window is SCHEDULED, not when it
is heard**, so no scheduling behaviour changed.

**Measured** — 1 bar of count-in at 140 BPM, sampled every animation frame across the seam:

| | Before (`beat-shell`) | Now |
|---|---|---|
| frames sampled | — | **156** |
| frames reporting **bar < 1** | ~6 frames, ~100 ms, every take | **0** |
| frames with `positionTicks < 0` | present | **0** |
| flag/position contradictions | the bug | **0** |
| last frame counting in | — | ticks **0**, bar 1, remain 0.001 bars |
| first frame after the flip | — | ticks **16**, bar 1, remain 0.000 bars |

The 16-tick offset is one rAF frame (16 ms of AudioContext time), not a seam — rAF samples
every ~16 ms and the record point falls between two frames.

**A second bug fell out of this one, in a file this seat does not own.** `capture.js:404`
gates on `clock.countingIn` and stamps `clock.positionTicks`. During the old ~100 ms window
that pair returned *(not counting in, negative tick)* — so **`capture.js` was writing notes
at negative ticks**. Reproduced literally, the same two reads in the same order:

| | Result |
|---|---|
| `_stampTick()` results across a counted-in take | 156 total — 104 dropped as count-in, 52 written |
| of those written, **NEGATIVE ticks** | **0** |
| minimum written tick | **10** |

**`capture.js` needed no edit.** Fixing the clock fixed it.

**`beat.html`'s workaround is now redundant but harmless.** Its readout tests
`clock.countingIn || positionTicks < 0`; the second half can never fire again. Left alone —
another seat's file. Noted in OPEN DECISIONS 3.

---

## BUG B2 — `play()` from past `loop.endBar`. CLOSED.

**What was wrong.** `runPass()`'s wrap test is `fromTick < lb.end`. A playhead parked at or
beyond `endBar` never meets a wrap, so playback runs straight past the loop forever.
`beat-shell` measured: loop bars 1–1, started from tick ~2400, reached 4871 without wrapping.

**The fix.** `loopEntryTick()` folds a start position at or after the region back INTO it,
using **this file's own existing wrap arithmetic** — the same expression `reseek()` already
uses, not a second rule. Applied in `play()` and `record()`.

Three deliberate non-changes, each stated in the code:
- **Starting BEFORE the region is unchanged.** A playhead ahead of the loop already plays IN
  to it and wraps correctly at `lb.end`. That is working behaviour and was not reported.
- **`seek()` is not routed through it.** Moving the playhead by hand is the student's
  decision and the transport does not overrule it.
- **No new event is emitted.** `statechange` already carries the (now wrapped) `position`.

**Measured** — `endBar` exclusive throughout, per the file's own LOOP GEOMETRY note:

| Setup | From tick | Entered at | Expected |
|---|---|---|---|
| loop bars 1–1 → ticks `[0, 1920)` | 3840 | **0** | 0 |
| same, 4 s of playback | — | **max tick 1864** | inside `[0, 1920)`; was 4871 and climbing |
| loop bars 2–3 → ticks `[1920, 5760)` | 9600 | **1920** | 1920 — exact multiple of the span |
| same | 11760 | **4080** | 4080 — a modulo fold, not a snap to start |
| loop bars 3–4 → ticks `[3840, 7680)` | 0 (before) | **0** | 0 — deliberately unchanged |
| `record()`, loop `[0, 3840)` | 7680 | **0**, max 2417 | 0, stays inside |

`record()` taking the same entry is **one step past the letter of the brief**, which named
`play()` only. Reason: it is the identical bug wearing a red light — a take started from
outside an enabled loop would record straight past it forever. Flagged rather than assumed:
**OPEN DECISIONS 2.**

---

## BUG B3 — THE LOOP COULD ESCAPE THROUGH ITS OWN SEAM. FOUND HERE. CLOSED.

**Not in the brief. Found because a probe hung, and a hang is a finding.**

The 40-wrap seam regression waited on a wrap count and never returned. It was not slow — the
transport had **escaped the loop and no wrap was ever coming**.

**Root cause, and it is the same gate as B2.** `runPass()` tested `toTick > lb.end`. A window
whose horizon lands **exactly** on `lb.end` never sets `wrap`, so `_nextTick` becomes `lb.end`
with no wrap performed — and from then on `fromTick < lb.end` is false **forever**. Playback
runs past the loop until the student presses stop. The count-in branch six lines above already
used `>=` for exactly this reason.

**Measured on the unmodified file** (`fix-clock-results-seam-BEFORE-FIX.json`), 1-bar loop at
240 BPM:

```
loop wraps observed ......... 31 of 40 wanted
doubled ticks at the seam ... 0
dropped ticks at the seam ... 0
⚠ ESCAPED the loop at leading-edge tick 2064 (region is [0, 1920))
  after 31 good wraps; last window ended at tick 2064
```

**31 clean wraps and then gone.** That is why it survived every previous test: `beat-shell`
ran the loop 5 s (2–3 wraps) and the `clock` seat's own 100-pass test used a 4-bar loop at
480 BPM. It needs a window boundary to land on one exact integer, so it is rare per wrap and
near-certain over a class period.

**The fix is one character** — `>` → `>=` — with the reasoning written into the file.
`toTick === lb.end` is not a special case downstream: the window emitted is still the
half-open `[fromTick, lb.end)`, byte-identical to what it was, so nothing is doubled and
nothing is dropped. The only change is that the wrap now happens.

**Re-measured after the fix:**

| | Before | After |
|---|---|---|
| loop wraps observed | **31 of 40, then escape** | **40 of 40** |
| doubled ticks at the seam | 0 | **0** |
| dropped ticks at the seam | 0 | **0** |
| escape | **at tick 2064** | **none** |

The probe is now **time-bounded, never wrap-count-bounded** — a probe for a runaway playhead
must not itself depend on the playhead not running away.

---

## REGRESSIONS — this seat touched the scheduler pass, so the clock's own numbers were re-run

`clock.js`'s scheduler pass is now wrapped in a timing call and its loop wrap test changed.
Both are on the path that carries every note in the app, so the `clock` seat's own
DONE-CHECK numbers were re-measured rather than assumed still true.

### Zero tick drift over 64 bars — 16ths and triplets. **PASS.**

| division | steps over 64 bars | last step landed on | expected | tick drift | max \|time − ideal\| |
|---|---|---|---|---|---|
| 4 (16ths) | 1024 | 122880 | 122880 | **0** | **0.000000 ms** |
| 3 (8th triplets) | 768 | 122880 | 122880 | **0** | **0.000000 ms** |

Matches `clock`'s original seat question 8 result exactly: accumulated error **zero ticks**.

### Loop seam, 40 wraps. **PASS** — the table is under BUG B3 above.

### The five-minute metronome hold (A-clock.md DONE-CHECK). **PASS on timing.**

| | Result |
|---|---|
| ran | **300.256 s** of AudioContext time |
| beats scheduled | **601** — exactly the 601 expected at 120 BPM |
| **worst \|beat time − ideal\|, whole run** | **0.000000 ms** over 601 beats |
| dropped scheduler windows | **0** |
| doubled scheduler windows | **0** |
| `clock.schedulerLoad`, metronome only | min **0.0000** · max **0.0003** |

**Five minutes, 601 beats, zero deviation, nothing dropped and nothing doubled.** The timing
wrapper added for Bug A costs nothing measurable: a metronome-only transport reads 0.0003 of
its 100 ms budget.

> **An honest note on this probe, because the first run of it printed FAIL.** Its end-position
> check compared `positionTicks` against elapsed time measured from the instant `play()`
> returned, and reported a −19.76 tick delta. That is **`ARM_LEAD_S`**: `arm()` anchors tick 0
> at `ctx.currentTime + 0.020 s` deliberately, and 20 ms at 120 BPM is 19.2 ticks — the rest
> is `Math.floor` on `positionTicks`. **The probe's reference was wrong, not the clock**, and
> the same run measured 0.000000 ms of beat error across all 601 beats. Corrected to measure
> from the timeline anchor; run 1's raw output is kept at `fix-clock-results-hold-run1.json`
> so the correction can be checked rather than taken on trust.

> **The confirming re-run came back PASS** (`fix-clock-results-hold.json`, 20:27 EDT). With
> the reference measured from tick 0's anchor: position **288226** ticks against an expected
> **288226.6**, a delta of **−0.56 ticks (−0.58 ms)** — which is the `Math.floor` on
> `positionTicks` and nothing else. Every other figure reproduced identically: 300.256 s,
> **601 beats**, **0.000000 ms** worst deviation, **0** dropped, **0** doubled. The −19.2
> ticks in run 1 were `ARM_LEAD_S` in the yardstick, exactly as diagnosed.

---

## BUG A — THE CPU METER. THE NUMBER IS REAL NOW. `governor.load` STILL CANNOT READ IT.

### What this seat did, inside its lane

`runPass()` is wrapped and timed. The measurement is §8's technique kept verbatim — pass
duration ÷ one 100 ms lookahead window, smoothed over 20 passes — and it times the pass
**including the `'tick'` emit**, which is where every instrument in the app creates its Web
Audio nodes. That is the real main-thread scheduler cost, which is exactly what §8 asks for
and what `audio-core` said it could not measure yet. Exposed as **`clock.schedulerLoad`** and
`clock.lastPassMs`.

**Measured, 150 filtered voices built and scheduled inside the scheduler pass:**

| | `clock.schedulerLoad` | `clock.lastPassMs` | `governor.load` |
|---|---|---|---|
| idle | **0.0000** | 0.000 | 0.0000 |
| **under 150 voices** | **0.0298** | **2.800 ms** | **0.0000** |
| after the load stopped | **0.0000** | — | 0.0000 |

**And calibrated against known injected main-thread cost**, repeating findings-webaudio Q3's
method on the real scheduler pass rather than on an offline render:

| injected per pass | `clock.schedulerLoad` | §8 expects |
|---|---|---|
| 5 ms | **0.0501** | 0.05 |
| 10 ms | **0.1000** | 0.10 |
| 25 ms | **0.2500** | 0.25 |

Exactly linear, no calibration constant — §8's amended block reproduced on live code. The
probe is not merely non-zero; it is correctly **scaled**.

### ⚠ What is honestly still true, and it is not a defect in this fix

**150 voices cost ~3 % of a 100 ms window on this machine.** The measurement is right and the
bar will still read low under heavy load, because **scheduling 150 voices really is cheap on
the main thread** — the DSP is on the audio thread. CONTRACTS §8 states this on its own face:

> **⚠ What this meter structurally cannot see.** It measures **main-thread** cost. Audio DSP
> runs on a **separate audio thread**. … **The meter can read green while the audio is
> breaking.**

So `voices` and `cpuWeight` remain the numbers that answer Brandon's "push the machine until
it breaks", exactly as `beat-shell` said on `beat.html`'s face. What changes is that the load
bar stops being a number that *cannot* move and becomes one that moves for the right reason.

### THE WALL — this is the half this seat did not take

**`governor.load` is a getter with no setter, and `audio.js` exports no reporting hook.**
Every export of that file was checked before concluding it. clock.js therefore cannot feed
the governor without editing frozen P1 output.

**Two things this seat deliberately did NOT do**, and the reasons, because both were
available and both would have been wrong:
1. **Did not edit `audio.js`.** The brief said stop and report at exactly this wall.
2. **Did not `Object.defineProperty` the governor's `load` from clock.js.** It would have
   worked and stayed textually inside my lane, and it would have made `audio.js`'s source
   lie about its own behaviour to everyone who reads it afterwards. A silent redefinition of
   another seat's public surface is worse than a reported gap.

What clock.js does instead: `reportToGovernor()` calls
`governor.reportSchedulerPass(ms, budgetMs)` **duck-typed**. It does nothing today —
verified in the browser, `hook present on governor? false` — and starts feeding the CPU bar
the moment `audio.js` grows that method, with **no second edit here**.

---

## NEXT ACTION

**This seat tapped out at 2026-08-23 20:27 EDT on Brandon's instruction. All code work is
finished and every verification has been run and read; `clock.js` is on disk in its final,
tested state and nothing is mid-edit. Nothing in this seat is in flight.**

**Exactly one thing remains, and it is a decision, not work:**

**Troubleshooter decides OPEN DECISIONS 1** — whether `audio.js` takes the addition written
out verbatim below. That is the entire remaining half of Bug A, and it is the only
outstanding item this seat produced. **Do not apply it without the Troubleshooter's call** —
`audio.js` is frozen P1 output. `clock.js` needs no further change either way: it already
calls the hook duck-typed.

Handoff: `/src/core/clock.js` back to `test-p2` / `redpen-p2`. B3 in particular deserves a
long loop run in their harness, since it is the one bug here that hides from short tests.

---

## OPEN DECISIONS

**1. ⚠ `audio.js` must take one addition or the CPU bar stays at 0.00. Decider: Troubleshooter.**

Everything else about Bug A is done and verified. This is the whole remainder. In
`src/core/audio.js`, inside `export const governor = {`:

```js
  /** §8's real measurement, reported by the owner of the scheduler pass (core/clock.js).
   *  `ms` is one pass's wall-clock duration, `budgetMs` one lookahead window. §8: "Load is
   *  measured as scheduler pass duration against the budget of one lookahead window,
   *  smoothed over 20 passes." This file has no scheduler pass; clock.js does. */
  reportSchedulerPass(ms, budgetMs) {
    schedulerReporting = true;          // clock.js is live — stop self-timing bookkeeping
    probeHistory.push(ms / budgetMs);
    if (probeHistory.length > SMOOTH_PASSES) probeHistory.shift();
    loadValue = Math.min(1, probeHistory.reduce((a, b) => a + b, 0) / probeHistory.length);
  },
```

plus one module-level `let schedulerReporting = false;` and one guard as the first line of
`probePass()`:

```js
  if (schedulerReporting) return;       // the real pass is being measured; do not dilute it
```

**The guard is not optional.** Without it both probes push into the same `probeHistory` and
audio.js's microsecond bookkeeping samples halve the reading. `dispose()` needs no change —
`probeIntervalHandle` is still cleared there.

If the Troubleshooter prefers a different name, it is changed in **one place** in clock.js:
`reportToGovernor()`. Nothing else in clock.js refers to it.

Related and smaller, already reported by `beat-shell` and still true: `shell.js`'s CPU meter
tooltip reads *"clock.js (P2) does not exist yet"* on all three tool pages. Stale. Not this
seat's file.

**2. `record()` takes the same loop entry as `play()`. One step past the brief's letter. Decider: Troubleshooter.**

The brief named `play()`. `record()` arms through the identical path and had the identical
bug — a take started from outside an enabled loop would record straight past it forever.
Reverting is deleting one call to `loopEntryTick()` in `record()`. Flagged rather than
buried.

**3. `beat.html`'s `positionTicks < 0` guard is now dead code. Decider: whoever owns `beat.html` next.**

Harmless — the condition can never fire again. Deleting it would let that readout state its
intent plainly instead of documenting a seam that no longer exists. **Not touched — another
seat's file**, and it is correct as written either way.

**4. `beat-shell`'s open decision 8 also says `stop()` does not return to zero. NOT ADDRESSED — deliberately. Decider: Brandon.**

Out of this seat's brief, and `clock.js`'s own receipt already lists it as an open decision
on the grounds that nothing in §3 or §7 rules on it. Unchanged, and not re-escalated.

**5. `clock.schedulerLoad` and `clock.lastPassMs` are EXTENSIONS, not §3 members.**

Added because §8's number had to live somewhere honest while `governor.load` cannot hold it.
If OPEN DECISIONS 1 lands, `governor.load` becomes the right place to read it and these two
become diagnostics. They are not a second meter and no UI is asked to show them.

---

## FILE LOCATIONS

Absolute paths, project root
`/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1`.

**Edited — one file, the only file this seat owns:**
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/core/clock.js`

**Written by this seat (verification artifacts):**
- `…/Builddocs/P2-beat-tool/S6-shell/fix-clock-testpage.html` — the throwaway page
- `…/Builddocs/P2-beat-tool/S6-shell/fix-clock-testdriver.py` — Chrome/Playwright driver
- `…/Builddocs/P2-beat-tool/S6-shell/fix-clock-results-fix.json` — B1, B1b, B2, B2b, seam
- `…/Builddocs/P2-beat-tool/S6-shell/fix-clock-results-redo.json` — drift, load + calibration
- `…/Builddocs/P2-beat-tool/S6-shell/fix-clock-results-seam-BEFORE-FIX.json` — **the escape, pre-fix**
- `…/Builddocs/P2-beat-tool/S6-shell/fix-clock-results-hold-run1.json` — 5-min run 1 (timing perfect; its own end-position assertion was wrong)
- `…/Builddocs/P2-beat-tool/S6-shell/fix-clock-results-hold.json` — 5-min confirming re-run, **PASS**
- `…/Builddocs/P2-beat-tool/S6-shell/fix-run.log` · `fix-run-redo.log` · `fix-run-hold.log`
- `…/Builddocs/P2-beat-tool/S6-shell/receipt-fix-clock.md` — this file

**Read, never written:**

| File | Why |
|---|---|
| `src/core/audio.js` | the governor — checked every export for a hook. **NOT EDITED.** |
| `Builddocs/CONTRACTS.md` | §3 transport, §8 governor. **NOT EDITED.** |
| `Builddocs/P2-beat-tool/S6-shell/receipt-beat-shell.md` | the findings |
| `Builddocs/P2-beat-tool/S3-clock/A-clock.md` | the DONE-CHECK re-run below |
| `src/core/capture.js` | to reproduce its count-in gate literally. **NOT EDITED.** |

**Serve command** (from the project root):

```
python3 -m http.server 8000
```

**Driver:**

```
cd Builddocs/P2-beat-tool/S6-shell
python3 fix-clock-testdriver.py fix     # B1, B1b, B2, B2b, seam, drift, load  (~2 min)
python3 fix-clock-testdriver.py redo    # drift + load only                     (~1 min)
python3 fix-clock-testdriver.py hold    # the 5-minute A-clock.md DONE-CHECK
```
