# RECEIPT — test-p1 — P1/S5

Seat: `test-p1`. Task: [A-test-p1.md](A-test-p1.md). Stage: [STAGE.md](STAGE.md).

---

## 2026-08-23 01:22:32 EDT — Q1: phase done-check

DELIVERABLE STATE: Read A-test-p1.md, STAGE.md, PHASE.md, CONTRACTS.md (full, §1-§12),
ROSTER.md, all seven P1 seat briefs, and all seven seat receipts in full before running
anything, per the brief's own instruction. Started `python3 -m http.server 8891 --bind
127.0.0.1` from the project root (same pattern every prior seat used). Verified both pages
return HTTP 200 with zero console/page errors. Ran PHASE.md's four clauses against the real
pages via a fresh Playwright/Python harness (not any prior seat's test page): both pages
load with no build step, all four input routes make sound (MIDI hardware itself
UNVERIFIED — see Q3), each page draws exactly its own correct visual (enforced three ways
in the shipped code, confirmed live), and dispose() shows zero leaked nodes across 20
cycles (full detail under Q6). PHASE.md overall: PASS, with the voice-cap enforcement gap
found under Q2/Q5 noted as a qualification (it is a CONTRACTS §8/§11.2 failure, not a
PHASE.md checklist failure).
NEXT ACTION: Answer Q2 — every seat's own done-check.
OPEN DECISIONS: none yet.
FILE LOCATIONS: `test-report.md` §Q1 (not yet written at this point in the run — written
after all seven questions were investigated; this receipt entry reflects the order
investigation happened in, not the order the file was typed).

---

## 2026-08-23 01:22:33 EDT — Q2: every seat's own done-check

DELIVERABLE STATE: Ran all seven P1 seats' own stated done-checks against the shipped
code directly. Six of seven pass cleanly (`spec-voice`, `audio-core` with a caveat,
`keys-input`, `scopes`, `tone-shell` all PASS). **Found a real, reproducible defect in
both `wave-voice` and `overtone-voice`**, independent of and not reported in either seat's
own receipt: with `governor.noCap` off, a synchronous burst of `noteOn()` calls (zero delay
between them — a struck chord, a fast run, or a MIDI chord arriving in one message batch)
is not held to the CONTRACTS §8 32-voice cap. `wave-synth.js` (lines 384-388) discards the
governor retry's result outright (`// result intentionally unused`) and unconditionally
allocates, reaching 40 voices on a 40-note burst. `overtone-synth.js` (lines 364-391) defers
the retry via `Voice.onFree()` — correctly capping at 32 for the first 5ms — but the
deferred retries cascade past the cap once they fire, reaching 39 by 300ms. Isolated and
confirmed with a dedicated paced-vs-burst comparison script: **paced allocation (>=20ms
apart) correctly holds at exactly 32 in both instruments; only the synchronous-burst case
fails.** This is not a re-litigation of anything already flagged UNVERIFIED by a prior
seat — it is a new finding this seat's own testing surfaced, verified with node counts, not
opinion.
NEXT ACTION: Answer Q3 — the four input routes.
OPEN DECISIONS: none — this is a FAIL, filed under Q7 with file + owning seat named, not an
open decision.
FILE LOCATIONS: `test-report.md` §Q2, §Q7. Source read: `/src/instruments/wave-synth.js`,
`/src/instruments/overtone-synth.js`, `CONTRACTS.md` §11.2.

---

## 2026-08-23 01:22:34 EDT — Q3: the four input routes

DELIVERABLE STATE: Mouse (`page.mouse.down/up` on a real drawn key), key (`page.keyboard.
down/up('KeyZ')`, plus a two-hand `KeyZ`+`KeyQ` chord test), and touch (a synthetic
`PointerEvent` with `pointerType: 'touch'`) all confirmed PASS — each produced a real voice,
lit the correct key via the shared input bus, and released cleanly. MIDI exercised through
the real, shipped `input.attachMIDI()` path with a simulated port object and raw byte
messages (`0x90` note-on, running-status `0x90`/velocity-0 note-off) — confirmed the parse
and routing logic is correct (voice allocated, correct key lit), but marked **UNVERIFIED**
per the brief's own instruction: no real MIDI hardware or permission prompt exists in this
environment, and this seat does not claim otherwise.
NEXT ACTION: Answer Q4 — position shift.
OPEN DECISIONS: none.
FILE LOCATIONS: `test-report.md` §Q3.

---

## 2026-08-23 01:22:35 EDT — Q4: position shift — the highest-value check

DELIVERABLE STATE: Set `input.positionShift = 5` on the live keyboard surface. Confirmed:
bottom key note = 65 (pitch class 5 = F), clicking it sounds note 65, and the full drawn
note set after the shift is `[60..71]` — bit-identical to the unshifted set, proving the
receivable range did not slide up to `[65..76]`. **PASS**, and this is the strongest, most
directly-measured result in the whole report: the drawn keyboard changed (bottom key now
reads/is positioned as F) and the sounding pitch did not transpose (the instrument still
only ever receives 60-71, rotated in draw order, never shifted as a block).
NEXT ACTION: Answer Q5 — metrics.
OPEN DECISIONS: none.
FILE LOCATIONS: `test-report.md` §Q4.

---

## 2026-08-23 01:22:36 EDT — Q5: metrics

DELIVERABLE STATE: All six requested metrics gathered with fresh, independent
measurements: (1) voices before glitch, noCap off — real numeric answer is "32 if paced,
39-40 if bursted" (ties to the Q2/Q7 finding, not a clean single number, reported as such);
noCap on — pushed to 200 voices with no main-thread collapse observed, explicitly marked as
not a real glitch proxy (no audio device). (2) `governor.load` at 1/8/16/32 voices — all
near-zero (0.00005-0.00015), consistent with `audio-core`'s own documented caveat that this
probe currently times registry bookkeeping, not real scheduler/DSP cost. (3) frame time,
visual mounted (16.666ms) vs. both unmounted (16.655ms) — no measurable difference at this
sample size; the visual's own internal read+draw cost is ~0.41ms of the 16.7ms budget.
(4) page weight and cold load: wave-synth 179,934 bytes / 126.3ms; overtone-synth 175,963
bytes / 131.5ms, measured with a fresh browser process per page to avoid warm-cache bias
between them.
NEXT ACTION: Answer Q6 — leak check.
OPEN DECISIONS: none.
FILE LOCATIONS: `test-report.md` §Q5.

---

## 2026-08-23 01:22:37 EDT — Q6: leak check

DELIVERABLE STATE: Mounted and disposed each page's real `ToolShell` 20 times (via the
actual `mountStandaloneTool()` entry point and real instrument/visual modules, not
stand-ins), playing and releasing one note per cycle. Instrumented DOM node count, a global
`addEventListener`/`removeEventListener` ledger, and an `AudioNode` create/disconnect
ledger, all installed before any module loaded. **Result: PASS, zero growth.** Both pages:
DOM node count unchanged before/after (11->11, 10->10), listener ledger net unchanged (3->3
on both). AudioNode create/disconnect traced **per cycle**, not just before/after: every
single one of the 20 cycles on both pages created and disconnected exactly the same count
(5/5 on wave-synth, 20/20 on overtone-synth) with zero drift on any individual cycle. A
constant 2-node offset in the raw before/after totals was investigated and fully explained:
it is `core/audio.js`'s own `masterGain`/`masterAnalyser`, a one-time page-level singleton
by design (per `tone-shell`'s own receipt), present identically whether measured after 1
cycle or 20 — not growth.
NEXT ACTION: Answer Q7 — failures and owners, then write test-report.md and close.
OPEN DECISIONS: none.
FILE LOCATIONS: `test-report.md` §Q6.

---

## 2026-08-23 01:22:38 EDT — Q7: failures and owners, DONE-CHECK, seat closed

DELIVERABLE STATE: One failure class found, filed with two direct owners and one secondary
contributing owner, per the table in `test-report.md` §Q7: `/src/instruments/wave-synth.js`
(lines 384-388) -> `wave-voice`; `/src/instruments/overtone-synth.js` (lines 364-391) ->
`overtone-voice`; `CONTRACTS.md` §11.2's underspecified retry-failure case -> `spec-voice`
(secondary, not a code defect). No other failure found. Real MIDI hardware, real touch
hardware, and real Chromebook performance are UNVERIFIED for stated environmental reasons,
not new failures — restated, not re-litigated, per the brief's instruction not to re-litigate
what prior seats already honestly flagged.

**DONE-CHECK, run against this seat's own brief:** `test-report.md` answers all seven seat
questions; every result is PASS, FAIL, UNVERIFIED-with-reason, or a number; every
unavailable check (MIDI hardware, touch hardware, Chromebook performance, real-glitch
audio) is marked UNVERIFIED with its reason; every failure names a file and an owning seat
from ROSTER.md. Confirmed no file under `/src` or `/tools` was touched, CONTRACTS.md was not
touched, and no cap/threshold was adjusted anywhere — this seat found the voice-cap defect
and reported it; it did not fix it, per the brief's hard boundary.

**What is missing / left to do:** nothing in this seat's own lane. For `redpen-p1`: the
voice-cap finding under Q7 is a live contract-drift item (CONTRACTS §8 vs. actual runtime
behavior under burst) worth reading against CONTRACTS directly, separate from this seat's
own pass/fail framing. For the Troubleshooter: the voice-cap finding needs routing to
`wave-voice`/`overtone-voice` to fix (a STOP condition for this seat, not something it can
touch) — this is a functional-correctness finding, not a request to change CONTRACTS §8's
cap number, so it was not escalated-and-paused per the brief's escalation clause (which is
specifically about the cap number being wrong); it is reported normally, as any other TEST
finding would be.

One state-change message sent. `SendMessage` to `agent-run-1-76` was refused with the same
finding `tone-shell`'s own receipt already recorded: that name is this process's own main
session, addressable only as `"main"` from inside it. Sent to `"main"` instead — one
delivery, not two. Then stopping. Not fixing anything. Not looking for more work.
NEXT ACTION: none — seat is done.
OPEN DECISIONS: none this seat can settle. The voice-cap finding's fix belongs to
`wave-voice`/`overtone-voice`. Whether CONTRACTS §11.2 should be tightened to specify the
retry-failure case explicitly is `spec-voice`'s/the Troubleshooter's call.
FILE LOCATIONS: [test-report.md](test-report.md) (whole file) · this receipt. Scratchpad
test scripts (not written into `Builddocs/` or `/src/`): `verify_p1.py`,
`verify_cap_isolated.py`, `verify_cap_overtone.py`, `verify_leak_granular.py`,
`verify_leak_overtone.py`, `verify_remaining.py`, `verify_spectrum.py`,
`verify_coldload.py`, `verify_final_gaps.py` — all in this session's scratchpad directory,
outside the project tree.
