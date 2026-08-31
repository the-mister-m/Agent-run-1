# RECEIPT — spec-core (P0/S3)

Stamped 2026-08-22 23:37 EDT. Written under a `goto` override. One receipt for the stage,
not seven. Ran **last**, on the real outputs of S1 and S2.

## DELIVERABLE STATE

**DONE.** [CONTRACTS.md](../../CONTRACTS.md) carries
**`CONFIRMED 2026-08-22 23:32 EDT by spec-core`** at the top.
[open-decisions.md](../open-decisions.md) written, **28 items, Brandon the decider on all.**

**Q1 · Every number in §3 and §8, checked against the recon**

| Number | Verdict |
|---|---|
| PPQ 480 | **KEPT** — not measurable, a resolution choice |
| 25 ms interval | **KEPT** — measured p95 26.2 ms idle |
| 100 ms window | **KEPT** — absorbs a 100 ms stall, breaks at 150 ms |
| 32 voices | **KEPT `PROVISIONAL`** — ceiling UNVERIFIED, **no number invented** |
| 24 patch nodes | **KEPT** as a count; flagged — node cost spans **250×** |
| 4 inserts/channel | **KEPT** as a count; flagged — insert cost spans **10×** |
| 2 sends | **KEPT `PROVISIONAL`** — a send is **undefined** → **D-3** |
| **cost units** | **CHANGED — the substantive amendment of this stage** |

Cost units rescaled **×10** so measured values stay integers as §8 requires. Plain voice
**= 10**. Measured: gain **1**, analyser **2**⚠, waveshaper **3**, delay **4**, panner
**4**, biquad **9**, compressor **43**, **convolver 247** at a 2 s IR (133→325 by IR
length). Old §8 said "insert = 2, reverb = 8, node = 1."
**Reverb was ~3× under-priced and the compressor ~2× — the failure mode was a green meter
over breaking audio.**

**Q2 · §2 walked against all six instruments — four methods were missing, all added**
`async ready()` (Drum Sampler — `decodeAudioData` is async, a constructor cannot await) ·
`getAnalyser()` (Wave + Overtone — §2 gave a visual **no way to read anything**, and §1's
lane rule forbids reaching into internals) · `static pieces` (both drum machines — the
shared step grid must draw 8 labeled rows without knowing which machine) ·
`onNoteOut()` (Chord Module — §2 had notes as **input only**, so "routes to any synth"
was uncontractable).

**Q3 · §4 drives four surfaces — the color rule is computable from `degrees` alone.**
Confirmed by walking the skip method (`i`, `i+2`, `i+4` mod 7) — nothing beyond `degrees`
is needed. Added `altered[]` / `preset` / `setScalePreset()` / `resetScaleDegree()`, which
the `+/-` UI needs and `degrees` cannot express. **§4's 7-entry rule is `PROVISIONAL`
pending D-1.**

**Q4 · §7 could NOT round-trip. Five missing fields added:**
`header.countIn` + `header.metronome` (live in §3, dropped from §7) ·
**`inserts[].id`** (the worst — graph edges cannot address an insert by array position) ·
`inserts[].bypass` · **`master` object** (graph edges pointed at a `"master"` that had no
state) · `graph.nodes[].x/y` + `edges[].fromPort/toPort` (parallel chains need ports).

**Q5 · From scope §5, closed 8 without Brandon; sent the rest on.**
Closed as pure engineering with no musical content: voice stealing · meter ballistics ·
pan law (use the platform's) · solo behavior · **kit manifest** (forced by **A10** — a
static site cannot list a directory) · export naming · envelope defaults · the `[THEORY]`
escalation rule. **Everything with musical or curricular content went to Brandon
untouched.**

**Q6 · Contradictions: resolved 5 by citation, sent 7 on.**

| Resolved | Authority |
|---|---|
| **C-1** separate pages | CONTRACTS §1 already commits to it — *still asked as **D-12**, since A31 said "idk about this part tbh"* |
| **C-2** v1 scope | **A11** — "including EACH phase and not stopping at chord engine" |
| **C-4** CPU cap vs option limits | **BUILDPLAN FIXED DECISION** — "conservative defaults, all liftable." Governor is the cap; counts are the opening allocation |
| **C-5** Chord Module sound | **A47** + BUILDPLAN instrument table — it does **both** |
| **C-6** envelopes on synths | **A28 read against Q28** ("*where* does modulation live") + **A43** — synths have envelopes; there are no LFO/envelope *automation lanes* |

**Sent to Brandon untouched:** C-3 (**D-8**) · C-7 (**D-13**) · C-8 (**D-9**) ·
C-9 (**D-10**) · C-10 (**D-4**) · C-11 (**D-14**) · C-12 (**D-11**).

**Q7 · What is frozen.** §1–§10, as of the CONFIRMED stamp. **Seats after this line
build on §1–§10 and may only extend the section their PHASE.md assigns** (P1 §11–§12,
P2 §13–§14, P3 §15, P4 §16, P5 §17). **§11 onward was deliberately left unclaimed.**
Only Brandon changes §1–§10 now.

## NEXT ACTION

**None for this seat. P0 is closed. P1 was not started.**

For whoever opens P1: read the freeze notice at the top of CONTRACTS, then §2's four
additions and §8's corrected table — those are what changed under you.

## OPEN DECISIONS

**28 items in [open-decisions.md](../open-decisions.md).** Only questions — **no answer of
mine appears in that file.** This section and that file agree.

**Blocking:** **D-1** the 12 scales `[THEORY]`, blocks P3 · **D-2** HTTPS hosting, blocks
P5 · **D-3** what a send is, blocks P4 · **D-4** does the Chord Module take a channel,
blocks P4 · **D-5** what master carries, blocks P4.

**Not blocking P1.** Where a number was needed, CONTRACTS carries a conservative default
marked `PROVISIONAL` and the question is still asked.

**11 of the 28 are `[THEORY]`** — music and curriculum. **I have no opinion on music
theory and recorded none.**

**Nothing I amended contradicts a BUILDPLAN FIXED DECISION.** The one that came closest —
C-4, caps by CPU vs by option count — was resolved **by citing that FIXED DECISION**, not
around it.

## FILE LOCATIONS

- **Amended:** `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/CONTRACTS.md`
- **Written:** `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P0-run-open/open-decisions.md`
- **This receipt:** `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P0-run-open/S3-spec-core/receipt-spec-core.md`
- **Read as input:** `../scope.md` (S1) · `../findings-webaudio.md` (S2)
- **Touched nothing else.** No `/src`, no BUILDPLAN, no ROSTER, no `outline`, no phase
  folder outside P0. **No code was written.**
