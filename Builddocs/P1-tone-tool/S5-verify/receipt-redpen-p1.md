# RECEIPT — redpen-p1 — P1/S5

Seat: `redpen-p1`, REDPEN function, last seat in P1. Task: [A-redpen-p1.md](A-redpen-p1.md).
Stage: [STAGE.md](STAGE.md). Report: [redpen-report.md](redpen-report.md).

---

## 2026-08-23 01:40 EDT — Q1: does every instrument implement CONTRACTS §2 exactly?

DELIVERABLE STATE: Read, in full and before writing anything: this seat's brief,
STAGE.md, [test-report.md](test-report.md), [CONTRACTS.md](../../CONTRACTS.md) §1–§12
including the new §11.2a, [PHASE.md](../PHASE.md), [ROSTER.md](../../ROSTER.md), all
seven P1 seat briefs and all seven receipts including the three post-close addenda on
`receipt-audio-core.md` / `receipt-wave-voice.md` / `receipt-overtone-voice.md`,
[outline](../../../../outline)'s Frequency Spectrum section, and every one of the ten
shipped files under `/src` and `/tools`. Zero code edited, zero code will be edited.

Q1 answered. Walked §2 member by member — 21 members including the four
`[AMENDED 2026-08-22]` additions — against both `wave-synth.js` and `overtone-synth.js`.
**All 21 present on both. All four §2 rules honoured on both.** §11.4's exact four-control
list, §11.5's exact partial/env path list, §11.1a's node shapes and `cpuWeight` figures,
and §11.6's tap placement all verified correct against the shipped source.

**Independently verified §11.2a**, as the brief required, rather than taking the addenda
on trust: `voicePool.steal()` (audio.js 224–254) does synchronously deregister its chosen
target and subtract its cost before returning; both synths now run one checked synchronous
retry immediately after `steal()`, with the §10-A never-refuse fallback kept and made
explicit. Traced the burst case by hand — refuse → steal (count 32→31) → retry succeeds →
register (31→32) — and confirmed a deregistered voice can never be selected twice, which
is what closes the gap rather than narrowing it. **Both synths match what §11.2a requires
of them. Not re-flagged as open drift.**

Four §2 divergences found, none of them a missing method — all four are the same class:
the two synths behave differently from each other at the same §2 member. Filed in the
report as D-1 through D-4.

NEXT ACTION: Q2 — lane check against every "You own" line and S3's collision map.
OPEN DECISIONS: none yet.
FILE LOCATIONS: [redpen-report.md](redpen-report.md) — header + Q1.

---

## 2026-08-23 01:41 EDT — Q2: does every file stay in its lane?

DELIVERABLE STATE: Q2 answered. **No lane violation. No STOP condition raised, because
there was none to raise** — the escalation path in this seat's brief was never triggered.

Enumerated every file under `/src` and `/tools` (11 total) and matched each against the
owning seat's brief "You own" line and against S3's collision map. The shipped set is
exactly the owned set: no extra file, no orphan, no file written by a seat that does not
own it. Also checked by name for the specific violations the collision map warns about —
a second writer on `tokens.css`, an S3 seat editing `audio.js`, `tone-shell` reaching into
an S2/S3 file, `keys-input` early-building P3's surfaces, `scopes` early-building P4's
meters — **none present**. `tone-shell` escalated the `maxDecibels` defect with measured
numbers instead of fixing another seat's file; that is the collision map working.

The three post-close patches (`audio.js`, `wave-synth.js`, `overtone-synth.js`) were
confirmed Troubleshooter-directed, logged as timestamped addenda on the owning seat's own
receipt, and each landed only in a file that seat already owned. Treated as documented
history per this seat's brief, not as drift and not as a violation.

One non-`/src` artefact sits outside a stage folder — `docs/scratchpad/keys-input-
donecheck.html` — noted in the report for the closer to sweep. LLM scratch space, not a
lane violation.

NEXT ACTION: Q3 — CONTRACTS §10, each forbidden thing looked for by name.
OPEN DECISIONS: none added.
FILE LOCATIONS: [redpen-report.md](redpen-report.md) — Q2 (per-file ownership table).

---

## 2026-08-23 01:42 EDT — Q3: CONTRACTS §10 violations

DELIVERABLE STATE: Q3 answered. **Clean on all six original §10 prohibitions and all
three `[AMENDED 2026-08-22]` additions.** Each looked for by name across all eleven
shipped files, as the brief required, not inferred from receipts.

Second AudioContext: exactly one construction in P1, `audio.js:26`; no `OfflineAudioContext`
anywhere. Audio from rAF: eight rAF call sites found and every one read — two visuals, the
CPU meter, the Overtone Synth's mount glow — **no AudioParam method, no osc.start/stop, no
noteOn/trigger, no ctx.currentTime scheduling inside any of them**; §3's two-loop split is
intact. Dependency: thirteen imports, all relative paths inside this project, zero bare
specifiers, zero CDN, zero import map. Build step: no package.json, node_modules, bundler
config or Makefile anywhere in the tree.

The sixth prohibition ("invent an interface") needed a judgment call and got one: two
additions exist that CONTRACTS does not name — `audio.js`'s `createChannel()`/
`releaseChannel()` and `input.js`'s third bus event `'shift'`. Both are **declared** in
their own seats' receipts as OPEN DECISIONS with a named decider, both are additive inside
a file the seat owns, and neither contradicts a frozen section. Judged the declared-
extension path rather than invention, and filed informational in Q7 so P2's SPEC seat can
fold them in or rule them out.

NEXT ACTION: Q4 — visual pairing.
OPEN DECISIONS: whether `createChannel()`/`releaseChannel()` and `input.'shift'` should be
folded into CONTRACTS. Not this seat's call; decider spec-core/Troubleshooter (already
each seat's own logged decision). Not blocking.
FILE LOCATIONS: [redpen-report.md](redpen-report.md) — Q3 (nine-row §10 table).

---

## 2026-08-23 01:42 EDT — Q4: are the two visuals paired correctly?

DELIVERABLE STATE: Q4 answered. **Yes — spectrum → Wave Synth, oscilloscope → Overtone
Synth, neither synth has both. Zero drift against the phase's central teaching decision.**

Verified four independent structural enforcements against the shipped source rather than
against the receipts: (1) each synth's `getAnalyser()` returns `null` for the tap it does
not offer, so there is no second tap to hand out; (2) each visual's constructor throws on
a `null` tap and names the inversion in its error; (3) `shell.js` `ToolShell.mount()`
computes `otherTap` and refuses to mount, tearing the instrument and channel back down,
before a node enters the document; (4) each page imports exactly one visual class and
passes one `tap` string, with no list to append to. Confirmed no file imports both
visuals, and that `scope.js` is absent from the Wave Synth page and `spectrum.js` from the
Overtone Synth page. Corroborates `test-report.md` Q1's live result.

Recorded one positive forward finding: enforcement (3) is the piece most likely to be lost
when P4 writes the DAW shell, because P4 mounts many instruments at once. Flagged as known
state carried forward, not as drift.

NEXT ACTION: Q5 — the curriculum audit against `outline`'s Frequency Spectrum section.
OPEN DECISIONS: none added.
FILE LOCATIONS: [redpen-report.md](redpen-report.md) — Q4 (four-row enforcement table).

---

## 2026-08-23 01:44 EDT — Q5: does the curriculum survive the build?

DELIVERABLE STATE: Q5 answered, and it is the longest section in the report because it is
the one that goes to Brandon. **The curriculum survives.** Read `outline`'s Frequency
Spectrum section as 14 statements and checked each against what a student actually sees on
screen — grepping the shipped user-visible strings, not the code comments, so "the app
says X" claims are about rendered text and not about intentions in a header block.

Result: **9 of 14 visible in wording close to Brandon's own · 1 served better than asked ·
4 demonstrated by the app but never named in his words on screen.** All four required
checks — fundamental, partials, whole-number series, simple→complex — are visible to a
student, and the whole-number constraint is *enforced in front of them* (typing 2.7 snaps
to 3 in the input). The oscilloscope line is the best-served in the section: Brandon's own
words "gain" and "ONE REPETITION" are both drawn on the canvas.

Seven wording findings written up for Brandon (C-1…C-7) plus two vocabulary items the app
introduced that the curriculum does not have (`dB` on the spectrum axis; a developer-
register saturation message on a student screen). **No opinion offered on any of them, per
§10-H and this seat's brief** — each is stated as "Brandon's words / the app's words / the
gap / the question", and stops.

Two things separated deliberately, because they are different kinds of thing:
- **C-7 is a defect, not a wording question**, and does not need Brandon: a partial row's
  label is hard-coded `partial ${i+1}` at mount while its multiplier is live and editable,
  so a row can read `partial 2` while sounding ×7 — which contradicts the curriculum's own
  definition of a partial. Filed in Q7 against `overtone-voice`, MEDIUM.
- The **numbering question** travelling with it (§11.5's `partial.0`…`partial.7` vs the
  screen's `fundamental (×1)`, `partial 2`…`partial 8` vs the outline implying the
  fundamental is partial 1) **is** Brandon's, and is flagged as such.
- Also flagged: a seat silently corrected what is almost certainly a typo in Brandon's
  outline ("Everything **about** that is an overtone" → the app's "everything **above**
  it"). Not ratified here. Reported so he can rule.

**Per the run's standing rule, no answer is being sought now — Brandon is not fielding
decisions until P4 closes.** Q5 is written to be handed to him whole at that point;
nothing in it blocks P2 or P3.

NEXT ACTION: Q6 — `tokens.css` against CONTRACTS §9.
OPEN DECISIONS: all of Q5 — C-1 through C-6, the C-7 numbering question, the two
introduced-vocabulary items, and the outline typo. **Decider on every one: Brandon**,
after P4 closes. None blocking.
FILE LOCATIONS: [redpen-report.md](redpen-report.md) — Q5 (the section to hand Brandon).

---

## 2026-08-23 01:45 EDT — Q6: does `tokens.css` cover CONTRACTS §9?

DELIVERABLE STATE: Q6 answered, and it splits three ways.

**Every token defined — yes.** §9 names 13; `tokens.css` defines exactly 13, on `:root`,
in one file. None invented, none dropped, none renamed. Its PROVISIONAL-pending-Brandon
posture on the colour *values* is correct §10-H behaviour and already logged by `scopes`;
not drift.

**Used by name — yes.** Nine tokens carry live `var()` references across P1 (`--text` 33,
`--bg` 19, `--accent` 19, `--line` 14, `--text-dim` 15, `--panel` 8, `--warn` 5,
`--meter-ok`/`--meter-hot` 2 each). The four `--deg-*` tokens have **0** references, which
is **correct, not drift** — §9 assigns all four to the scale circle, diatonic keys,
piano-roll shading and note bank, every one of which is P3/P4.

**"No hard-coded color anywhere in P1" — NO. This is where §9 fails.** Enumerated every
colour literal in all eleven shipped files. `spectrum.js`, `scope.js`, `shell.js` and both
pages are clean in substance — their `var()` fallbacks are byte-identical to `tokens.css`,
which makes them consumers. But **`wave-synth.js`, `overtone-synth.js` and `keyboard.js`
each ship a complete alternate palette whose fallback values disagree with `tokens.css`
and with each other** — `--accent` alone is `#5cf` / `#4fc3f7` / `#34d1c4` against the real
`#34e5b4`. Invisible today because both pages link `tokens.css`; visible the moment any
P4 view renders one of these modules without it, and it silently defeats the one-line edit
`tokens.css`'s own header promises Brandon. Filed **D-7, MEDIUM**. Plus **D-8, LOW**:
`keyboard.js:199` `border-color: #000` — the only colour in P1 with no token and no
`var()` at all, which §9's own rule makes an escalation rather than something to type.

Two informational, not filed as violations: `shell.js`'s two untokenized shadow `rgba()`s
(§9 defines no shadow token — a later phase may want one), and `overtone-synth.js:641`
painting a partial-level bar with `--meter-ok`, a token `tokens.css` explicitly scopes to
meters.

NEXT ACTION: Q7 — the drift ledger, one line each.
OPEN DECISIONS: whether §9 should gain a shadow/scrim token — decider a later SPEC seat,
not blocking.
FILE LOCATIONS: [redpen-report.md](redpen-report.md) — Q6 (definition / usage / literals).

---

## 2026-08-23 01:46 EDT — Q7: the drift ledger, DONE-CHECK, seat closed

DELIVERABLE STATE: Q7 answered. **Nine drift items, each one line naming file · seat ·
contract section · severity. No HIGH. No STOP condition. Nothing blocking P2.**

- **D-1** `overtone-synth.js` `noteOn` — `overtone-voice` — §2/§12.1 — no velocity default — LOW
- **D-2** `overtone-synth.js` `setParam`/`getParam`/`setState` — `overtone-voice` — §2 — throws where its sibling returns silently — LOW-MED
- **D-3** `overtone-synth.js` `_mount` — `overtone-voice` — §2 — compact and expanded cannot be live at once — MEDIUM (P4 blocker)
- **D-4** `wave-synth.js` `Voice.trigger`/`release` — `wave-voice` — §11.3 — envelope snapshotted, not live — LOW
- **D-5** both synths + `audio.js` — `spec-voice` — §2 vs §11.2 — "the governor reads this" is false; nothing reads `voiceCount` — LOW (doc)
- **D-6** `overtone-synth.js:593` — `overtone-voice` — §11.5/curriculum — a row can read `partial 2` while sounding ×7 — MEDIUM (teaching)
- **D-7** `wave-synth.js` + `overtone-synth.js` + `keyboard.js` — `wave-voice`/`overtone-voice`/`keys-input` — §9 — three divergent fallback palettes — MEDIUM
- **D-8** `keyboard.js:199` — `keys-input` — §9 — `border-color: #000`, no token — LOW
- **D-9** `spectrum.js:786` — `scopes` — §9 — developer text on a student screen — LOW

Eight things were checked and **deliberately not filed** as drift, each with a stated
reason (the §11.2a fix, the three post-close patches, the two declared interface additions,
the unused `--deg-*` tokens, `tokens.css`'s PROVISIONAL values, `wave-synth.js`'s shared
`<style>` tag, `keyboard.js`'s announced P3 label seam, and `shell.js`'s stale
`maxDecibels` comment). Listed in the report so the next reader knows they were looked at
rather than missed.

**DONE-CHECK, against this seat's brief, honestly:** `redpen-report.md` answers all seven
seat questions ✓. Every drift item names file + seat + contract section + severity ✓. Any
lane violation was to be escalated the moment it was found — **none was found**, so the
escalation path was correctly never used ✓. **Zero code edited** — no `/src` file, no
`/tools` file, no CONTRACTS.md, no `test-report.md`, nothing in P2 ✓. One file written
plus this receipt.

**One clause this seat cannot satisfy, stated rather than fudged:** PHASE.md's done-check
says "`redpen-p1` reports zero contract drift." It cannot. It reports nine, none HIGH,
none blocking, with the phase's central teaching decision (Q4) and the §11.2a voice-cap
fix (Q1) both verified intact. **The Troubleshooter decides whether that clears the
clause. This seat does not get to soften the count to make a checkbox pass.**

**What is missing / left to do, for whoever reads this next:** the two items worth acting
on before P4 are **D-3** (P4's DAW mounts a strip view and a detail view of the same
instrument at once — the Overtone Synth currently cannot) and **D-7** (cheap now, spreads
once P3/P4 add surfaces to the same fallback pattern). D-1/D-2/D-4 are one SPEC ruling
away from being closed together: P2 adds four more instruments to a §2 surface that is
sound but **not uniform**, and a ruling on error convention, velocity default and
dual-mount would stop the divergence multiplying. D-6 is a two-line fix in a file its seat
owns. Q5 waits for Brandon after P4.

NEXT ACTION: none — seat is done. Handoff delivered. **One** state-change message sent,
as the brief requires — addressed to `main` rather than `agent-run-1-76`, because
SendMessage rejected that name as this process's own session and directed it there; same
session either way. **Not fixing anything. Not starting P2. Not looking for more work.**
OPEN DECISIONS: (1) all of Q5 — decider **Brandon**, after P4 closes, not sought now.
(2) A §2 uniformity ruling covering D-1/D-2/D-3 — decider Troubleshooter/P2 SPEC.
(3) Whether `createChannel()`/`releaseChannel()` and `input.'shift'` enter CONTRACTS —
decider spec-core/P2 SPEC. (4) Whether §9 wants a shadow/scrim token — decider a later
SPEC seat. (5) Whether nine LOW-to-MEDIUM items clears PHASE.md's "zero contract drift" —
decider Troubleshooter. **None of the five blocks P2.**
FILE LOCATIONS: [redpen-report.md](redpen-report.md) (the deliverable — Q1–Q7, HANDOFF,
and the PHASE.md done-check note) · this receipt. **No `/src` or `/tools` file was written
or modified by this seat.**
