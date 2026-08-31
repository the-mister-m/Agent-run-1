# RECEIPT — spec-clock (P2/S1)

Seat: `spec-clock`, SPEC. Opened **2026-08-23 17:59 EDT**.
Last update: **2026-08-23 18:07 EDT** — after seat question **8 of 8**. **SEAT CLOSED.**
Lane: [CONTRACTS.md](../../CONTRACTS.md) §13 (grid) and §14 (kits), append only.

---

## DELIVERABLE STATE

| Seat question | State | Where it landed |
|---|---|---|
| 1 · How is a grid position expressed? | **DONE** | CONTRACTS §13.1 |
| 2 · Triplet mode alongside 16ths | **DONE** | CONTRACTS §13.2, §13.2a |
| 3 · Counting labels | **DONE** | CONTRACTS §13.3 |
| 4 · Time signature | **DONE** | CONTRACTS §13.4 |
| 5 · A step, as data | **DONE** | CONTRACTS §13.5, §13.6 |
| 6 · What is a kit | **DONE** | CONTRACTS §14.1–§14.4 |
| 7 · Synth kit = sampled kit | **DONE** | CONTRACTS §14.5 |
| 8 · What was left undecided | **DONE** | CONTRACTS, OPEN DECISIONS — `spec-clock` |

**All eight answered. §13 and §14 are complete and handed off.**

**Q1 — answered.** Ticks are the only storage unit; PPQ 480 per §3. §13.1 states the four
derived constants, the counting origin of every quantity (absolute tick 0-based, bar and
beat 1-based, per §7's own JSON), and both conversion directions as four named functions.
Noted without amending §3: `position.tick`'s `0..PPQ-1` range is exact at any `x/4`
signature and narrows at `x/8` — a narrowing, not a contradiction. Handed to
`recon-scheduler` to verify.

**Q2 — answered.** Triplet mode is **per-lane**, not per-track and not per-pattern: a lane
carries `division` (4 = 16ths, 3 = triplets) and every §13.1 function already takes it as
an argument, so there is no second grid. Reason on record — per-pattern would force the
whole kit into triplets, which breaks the curriculum's own "clap/count split-beat rhythms"
example. `division = 3` gives **160 ticks/step**, exact at PPQ 480 (480 = 2⁵·3·5); every
offered division divides with zero remainder. Swing named in §13.2a as a playback-time
offset that never moves a stored tick — so a swung project reloads identically.

**Q3 — answered.** Both syllable sets are Brandon's, cited, neither invented here: 16ths
from §6 frozen (`1 e + a`), triplets from his **D-14** answer (`1 + a`). One function in
`theory/scale.js` per §6's "no surface builds its own label strings" — the step grid, P3's
piano roll, and P4's ruler all call it, which is how PHASE.md's "same numbers and same
syllables" is enforced instead of hoped for.

**The literal sequence for one 4/4 bar — this seat's done-check:**

```
16ths (division = 4), 16 labels:
1  e  +  a    2  e  +  a    3  e  +  a    4  e  +  a

triplets (division = 3), 12 labels:
1  +  a    2  +  a    3  +  a    4  +  a
```

**Q4 — answered, and it is where the conflict is.** Representation stays §3's frozen
`{top, bottom}` — no new field. `top` = beats per measure (**D-13**, "FOLLOW THE SCOPE");
`bottom` is read in exactly one expression, `ticksPerBeat = (4 × PPQ) / bottom`, and
nowhere else. **Supported bottoms: 2, 4, 8, 16** — all divide 1920 exactly; 32 and
non-powers-of-two are not in the curriculum and were not added.

**On the symbol:** the brief and the outline say draw a symbol; Brandon's **D-20** says
"it doesn't need to be there." I followed Brandon and wrote the conflict into §13.4 in the
open rather than picking quietly. The app stores the digit and renders no bottom symbol.
No glyph set was invented.

**One caveat handed forward:** at `bottom = 2` a beat is 960 ticks and §3's documented
`position.tick` range (`0..PPQ-1`) cannot address its back half. §3 is frozen; I did not
edit it. The grid is unaffected — it stores absolute ticks and never round-trips through
`position`. `clock` (P2/S3) needs to see this.

**Q5 — answered.** A step is `null` (off) or `{ v: 0.8 }` (on). On/off **is** the presence
of the object — no redundant `on:` flag. Velocity is the only field and it is required per
**A28**; the missing-velocity default is `0.8`, which is not a new number — §7, §11.7a and
§12.1 already fix it, so I cited rather than re-decided. Deliberately absent: length,
per-step micro-timing, probability, ratchet, per-step tuning. Nobody asked for them and §10
forbids inventing an interface.

§13.6 is the part P4 would have broken without: the round-trip uses **only frozen §7
fields** — hits go in `channels[].notes[]` (A29, linear song, and P5's `.mid` export reads
it), while per-lane `division`, `bars` and the kit id go in `instrumentState`, which §2's
`getState()`/`setState()` already covers. A note that does not land on its lane's grid is
kept at its true tick and drawn at the nearest step, marked off-grid — never silently
quantized, because §7's rule is that a loader never guesses.

**Q6 — answered, with the one PROVISIONAL in the whole deliverable.** The eight pieces are
**fixed roles, app-wide** — every kit supplies exactly those eight in that order, and a kit
does not choose its own. That single ruling is what makes Q7 work at all.

**Index 0 is not provisional** — §10-E is frozen and already writes
`{"index": 0, "label": "Kick", "note": 36}`. The other seven note numbers follow General
MIDI from that anchor so **A46**'s `.mid` export opens on the right drum sounds in a real
DAW. **The seven labels are provisional and are Brandon's** (§10-H). `label` is overridable
per kit in the manifest, so "808 Kick" works without moving the role.

§14.2–§14.4 cover the folder layout, both manifests (`kit.json` per frozen §10-E, plus the
shape of `kits.json`), a failure table so three seats do not each invent one — nothing
silent, nothing substituted, one bad `.wav` never kills the other seven — and Brandon's
add-a-kit workflow: drop a folder, write `kit.json`, add one line. No source change, no
rebuild. The one manual line is forced by **A10**, not chosen.

**Q7 — answered.** The grid's entire knowledge of an instrument is two frozen §2 members:
`static pieces` and `noteOn()`. Playing a step is one line and it is the same line for both
machines. Explicit do-not list: the grid never reads `kit.json` or anything under
`/assets/`, never calls a `playPiece(index)` (**there is no such method** — a piece is
played by its note like every other instrument in this app), never branches on instrument
id or `needsLoad`, and never holds a note number of its own.

The load-bearing bit: **§14.1's fixed roles are what let `static pieces` actually be
static.** A runtime-chosen kit could not honor §2's `static` declaration if kits picked
their own pieces — fixing the roles removes that problem instead of working around it, and
the grid's layout never changes under a student mid-lesson. Everything below the `pieces`
line differs between the two machines; everything at or above it is identical.

**Q8 — answered.** Seven items, a named decider on each, written into CONTRACTS under
`OPEN DECISIONS — spec-clock`. Two are Brandon's (items 1 and 2 below); five are
engineering, named so two seats do not each invent an answer. **None blocks a P2 seat from
starting.**

## NEXT ACTION

**Handoff, and this seat stops.** No further work taken.

- `recon-scheduler` (P2/S2) — verify §13.1's arithmetic and §13.2's **160 ticks/step** at
  `division = 3` over 64 bars with zero drift. That is its own seat question 5.
- `clock` (P2/S3) — build against §13.1's four conversion functions. Read §13.4's
  `bottom = 2` caveat before writing `seek()`.
- `grid` · `drum-synth` · `drum-sampler` (P2/S4, parallel) — §13.5, §13.6, §14. The grid
  binds to §14.5 only and never opens a kit file.
- P3's piano roll and P4's arrangement ruler inherit §13.3's label function unchanged —
  PHASE.md requires the same numbers and the same syllables in both.

## OPEN DECISIONS

Full text with deciders is in [CONTRACTS.md](../../CONTRACTS.md), section
`OPEN DECISIONS — spec-clock`. Summary:

**Brandon's — escalated in chat at 2026-08-23 18:01 EDT, visible in his session window:**

1. **The eight kit piece labels.** `PROVISIONAL` in §14.1 — the only provisional value in
   this deliverable. Not in the [outline](../../../../outline), not in
   [qa-transcript.md](../../../../qa-transcript.md) (**A44** gives "8 pieces, 16th +
   triplet" and no names), not in [open-decisions.md](../../P0-run-open/open-decisions.md).
   §10-H makes it his by rule. `drum-synth` and `drum-sampler` both bind to §14 by name, so
   a default is carried rather than blocking — the same pattern §4, §7 and §8 already use.
   Index 0 = Kick, note 36 is **not** provisional; §10-E is frozen and states it.
   **He overwrites the table and nothing else changes.**
2. **The time-signature bottom symbol — a conflict on record, not a gap.** The outline
   line 22 and this seat's brief say draw a symbol; his **D-20** answer says "it doesn't
   need to be there." **I followed Brandon and wrote the conflict into §13.4 in the open.**

**Not Brandon's — engineering, named with a decider:** `bottom = 2` against §3's
`position.tick` range (→ `clock`, and Brandon only if §3 text must change) · swing amount
and feel curve, D-28 (→ Brandon on feel, `grid`/`clock` on the control) · no syllable set
for `division` 6 or 8 (→ Brandon, only if he wants them exposed) · off-grid capture feel
(→ `capture`) · no maximum on `bars` (→ `grid`).

**Settled from Brandon's own words, not guessed:** the counting syllables — §6 frozen
(`1 e + a`) and **D-14** (`1 + a` for triplets). I assembled his two rulings; I did not
pick a syllable.

## FOUND, NOT FIXED — not my lane

**CONTRACTS.md has no `## 12 ·` section header.** Subsections `### 12.1`–`### 12.3` (lines
1033–1085) sit directly under §11 with no §12 heading, so §12 is referenced by number
throughout the file — including by the FREEZE NOTICE and by this seat's own brief — but has
no heading to find it by. P1's `spec-voice` wrote it; §1–§12 are frozen and only Brandon
may edit them. **Reported, untouched.** For the Troubleshooter and the Closer.

## FILE LOCATIONS

- Contract written: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/CONTRACTS.md`
  — §13 at line 1111, §14 at line 1424, OPEN DECISIONS at line 1607. **Append only,
  verified: every write was an append; §1–§12 occupy lines 1–1108 and are byte-identical
  to how this seat found them.**
- This receipt: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S1-spec/receipt-spec-clock.md`
- Brief followed: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S1-spec/A-spec-clock.md`
- No `/src` file written. No file outside this lane touched.
