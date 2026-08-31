# REDPEN REPORT — P1 Tone Tool — `redpen-p1`

Seat: `redpen-p1`, P1/S5, REDPEN function, last seat in the phase. Task:
[A-redpen-p1.md](A-redpen-p1.md). Stage: [STAGE.md](STAGE.md).
Run: 2026-08-23 01:35–02:0x EDT. Inputs read in full before any judgment was written:
this seat's brief · STAGE.md · [PHASE.md](../PHASE.md) · [test-report.md](test-report.md)
(`test-p1`, the required input) · [CONTRACTS.md](../../CONTRACTS.md) §1–§12 including the
new **§11.2a `[AMENDED 2026-08-23]`** · [ROSTER.md](../../ROSTER.md) · all seven P1 seat
briefs and all seven receipts, **including the three post-close addenda** on
`receipt-audio-core.md`, `receipt-wave-voice.md`, `receipt-overtone-voice.md` ·
[outline](../../../../outline) → Frequency Spectrum · all ten shipped files under `/src`
and `/tools`.

**This report audits the CURRENT, live code**, not the snapshot `test-p1` tested. The
burst voice-cap defect `test-p1` found has since been fixed under §11.2a; that fix was
independently verified here (Q1) rather than taken on trust, and is **not** re-filed as
open drift.

**Zero code edited.** No file under `/src` or `/tools`, no CONTRACTS.md, no
`test-report.md`, nothing in P2 was touched by this seat. One file was written:
`redpen-report.md`. Receipt: [receipt-redpen-p1.md](receipt-redpen-p1.md).

**No STOP condition was raised.** Q2 found no lane violation, so nothing needed escalating
mid-run.

---

## Q1 — Does every instrument implement CONTRACTS §2 exactly, method by method?

**Method by method: yes on both. Behaviourally: yes on every §2 member, with four
divergences where the two synths do the same §2 thing *differently from each other*.**

### §2 member-by-member, both synths

Every member of §2's code block plus all four `[AMENDED 2026-08-22]` additions — 21
members — checked against the shipped source, not the receipts.

| §2 member | `wave-synth.js` | `overtone-synth.js` |
|---|---|---|
| `static id` | `'wave-synth'` ✓ | `'overtone-synth'` ✓ |
| `static label` | `'Wave Synth'` ✓ | `'Overtone Synth'` ✓ |
| `static playable` | `true` ✓ | `true` ✓ |
| `constructor(ctx, out)` | ✓ — never makes a ctx, never touches `destination` | ✓ same |
| `noteOn(note, velocity, atTime)` | ✓ | ✓ — **but no velocity default, see D-1** |
| `noteOff(note, atTime)` | ✓ releases every voice on that note | ✓ releases the one voice on that note |
| `allNotesOff()` | ✓ | ✓ |
| `setParam(path, value)` | ✓ §11.4's exact list | ✓ §11.5's exact list — **error behaviour differs, see D-2** |
| `getParam(path)` | ✓ | ✓ — **error behaviour differs, see D-2** |
| `getState()` | ✓ JSON-safe, no functions/nodes/`undefined` | ✓ same |
| `setState(obj)` | ✓ | ✓ — **error behaviour differs, see D-2** |
| `get voiceCount()` | ✓ | ✓ — see D-5 for what actually reads it |
| `get cpuWeight()` | ✓ live voices + analyser (§11.6) | ✓ same |
| `mountCompact(el)` | ✓ | ✓ — **cannot coexist with expanded, see D-3** |
| `mountExpanded(el)` | ✓ | ✓ — **see D-3** |
| `unmount()` | ✓ returns listener count | ✓ |
| `dispose()` | ✓ frees voices, disconnects nodes, returns counts | ✓ same |
| `static needsLoad` (§2 add. 1) | `false` ✓ | `false` ✓ |
| `async ready()` (§2 add. 1) | ✓ resolves immediately | ✓ resolves immediately |
| `getAnalyser(which)` (§2 add. 2) | `'spectrum'`→node, else `null` ✓ (§11.4) | `'scope'`→node, else `null` ✓ (§11.5) |
| `static pieces` (§2 add. 3) | `null` ✓ | `null` ✓ |
| `static emitsNotes` + `onNoteOut`/`offNoteOut` (§2 add. 4) | `false` + no-ops ✓ | `false` + no-ops ✓ |

**§2's four rules, both synths:** never creates an AudioContext ✓ · never connects to
`ctx.destination` ✓ · `atTime` absent means now ✓ (`atTime ?? ctx.currentTime` on both) ·
survives `dispose()` with zero leaked AudioNodes or listeners ✓ (corroborated by
`test-report.md` Q6's 20-cycle ledger, and the source read agrees).

### §11 detail, both synths — all correct

- **§11.4 Wave Synth:** exactly four controls (`osc.wave` enum of four, `osc.octave`
  clamped −2…+2, `out.gain` 0–1, plus §11.3's four `env.*`). Defaults match §11.4 and
  §10-G exactly. `'saw'` → native `'sawtooth'` is mapped internally and nowhere else,
  which is the correct read of the contract's enum.
- **§11.1a Wave voice:** 2 nodes (osc + gain), envelope is four-stage automation on that
  one `GainNode.gain` — exactly as §11.1a words it. `cpuWeight` 10 ✓.
- **§11.5 Overtone Synth:** `partial.0.level` only; `partial.1–7.multiplier` and
  `.level`; no `osc.octave`, no `out.gain` ✓. `partial.0.multiplier` does not exist and
  throws on access ✓. Whole-number constraint is `clamp(Math.round(v), 1, 32)` — §11.5's
  wording verbatim ✓. Defaults ✓ (fundamental 1.0, rest 0.0, multipliers index+1).
- **§11.1a Overtone voice:** 8 osc + 8 partial gains + 1 shared envelope gain = 17 nodes
  ✓, `cpuWeight` 17 ✓ (still PROVISIONAL per §11.1a — the seat reported its live figure
  to the Troubleshooter rather than editing the frozen constant, which is correct BUILD
  behaviour).
- **§11.6 tap:** one `AnalyserNode` per instrument, created once at construction, sitting
  after the voice sum and before `out`, included in `cpuWeight` ✓ on both.

### §11.2a — independently verified, as this seat was told to

`audio.js` `voicePool.steal()` (lines 224–254) selects per §10-A (longest-released first,
else longest-held) and then, **in the same synchronous call before returning**, deletes
the target's registry entry and subtracts its `cost` from the tracked weight. That is
exactly what §11.2a makes binding.

Both synths match what §11.2a requires of them: `wave-synth.js` `noteOn` (387–398) and
`overtone-synth.js` `noteOn` (364–399) each now do refuse → `voicePool.steal()` →
`target.steal(t)` (the 5 ms audio fade only) → **one checked synchronous
`governor.request()`** → allocate, with §10-A's never-refuse fallback kept and made
explicit via `console.warn` instead of a silently discarded result. The
async-deferred-retry pattern §11.2a forbids has been removed from `overtone-synth.js`, not
merely bypassed.

Traced by hand rather than assumed: at cap, refuse → steal drops `count` 32→31 in the same
tick → retry sees 31 → register returns it to 32. A deregistered voice is out of the
registry and therefore **cannot be selected by a second `steal()`**, which is the property
that closes the gap completely rather than narrowing it. No `await` exists anywhere in
either allocate path, so no other `noteOn` can interleave. **This holds. Not re-filed as
drift.**

### The four §2 divergences

None is a missing or renamed method. All four are the same shape: the two synths
implement the same §2 member with different behaviour, so a caller that is handed "a
CONTRACTS §2 instrument" cannot treat them interchangeably. §2 exists precisely so that a
shell can. Full detail and severities in **Q7**; summarised here:

- **D-1** `overtone-synth.js` `noteOn` has no `velocity` default; `wave-synth.js` defaults
  to `0.8`. `noteOn(60)` on the Overtone Synth produces `NaN` in the envelope ramp.
- **D-2** `overtone-synth.js` **throws** on an unknown `setParam`/`getParam` path and on a
  non-object `setState`; `wave-synth.js` **returns silently**. §2 gives no error contract,
  so neither is wrong on its own — but they cannot both be right for one generic caller.
- **D-3** `overtone-synth.js` `_mount()` calls `this.unmount()` first, so compact and
  expanded **cannot be mounted at once**; `wave-synth.js` supports both simultaneously
  (its own brief required it; `test-report.md` Q2 verified it).
- **D-4** Envelope edits mid-note: `overtone-synth.js` propagates live to sounding voices;
  `wave-synth.js` snapshots at trigger and ignores changes until the next note.

---

## Q2 — Does every file stay in its lane?

**Yes. No lane violation. No STOP condition was raised, because there was none to raise.**

Every shipped file has exactly one owning seat, and the shipped set is exactly the owned
set — no extra file, no orphan, no file written by a seat that does not own it.

| Shipped file | Owning seat | Brief's "You own" line | S3 collision map |
|---|---|---|---|
| `/src/core/audio.js` | `audio-core` (S2) | "`/src/core/audio.js`. One file." ✓ | "nobody — frozen from S2" ✓ |
| `/src/instruments/wave-synth.js` | `wave-voice` (S3) | "`/src/instruments/wave-synth.js`. One file." ✓ | "`wave-voice` only" ✓ |
| `/src/instruments/overtone-synth.js` | `overtone-voice` (S3) | "`/src/instruments/overtone-synth.js`. One file." ✓ | "`overtone-voice` only" ✓ |
| `/src/core/input.js` | `keys-input` (S3) | "`/src/core/input.js` and `/src/surfaces/keyboard.js`. Two files." ✓ | "`keys-input` only" ✓ |
| `/src/surfaces/keyboard.js` | `keys-input` (S3) | same ✓ | "`keys-input` only" ✓ |
| `/src/vis/spectrum.js` | `scopes` (S3) | "`/src/vis/spectrum.js`, `/src/vis/scope.js`, and `/src/ui/tokens.css`" ✓ | "`scopes` only" ✓ |
| `/src/vis/scope.js` | `scopes` (S3) | same ✓ | "`scopes` only" ✓ |
| `/src/ui/tokens.css` | `scopes` (S3) | same — "you create the token file" ✓ | "`scopes` creates it" ✓ |
| `/src/ui/shell.js` | `tone-shell` (S4) | "`/src/ui/shell.js`, `/tools/wave-synth.html`, `/tools/overtone-synth.html`" ✓ | n/a (S4) |
| `/tools/wave-synth.html` | `tone-shell` (S4) | same ✓ | n/a |
| `/tools/overtone-synth.html` | `tone-shell` (S4) | same ✓ | n/a |

`spec-voice` (S1) owns CONTRACTS §11/§12 append-only and wrote no `/src` file ✓.
`test-p1` (S5) wrote only `test-report.md` and its receipt ✓.

**Checked for the specific violations the collision map warns about, by name, and found
none:** no seat wrote `tokens.css` except `scopes`; no S3 seat edited `audio.js` during
S3; `tone-shell` wrote no S2/S3 file — its own receipt escalated the `maxDecibels` defect
with measured numbers instead of fixing another seat's file, which is the collision map
working exactly as designed; `keys-input` built no `diatonic-keys.js` or
`scale-circle.js` (P3's); `scopes` built no `meter.js` or `gain-reduction.js` (P4's).
Nothing early-built from a later phase exists anywhere under `/src`.

**The post-close fix is in scope, not a violation.** `audio.js`, `wave-synth.js` and
`overtone-synth.js` were each patched after their seats formally closed. All three are
Troubleshooter-directed, logged as timestamped addenda on the owning seat's own receipt,
and each addendum states plainly that it is not a reopening and names exactly what
changed. Every change landed in the file the seat that logged it already owned. Treated as
documented history, per this seat's brief. Not drift.

**Non-`/src` artefacts, for completeness — all in lane:** each S2/S3 seat's throwaway
DONE-CHECK page (`test-audio-core.html`, `test-wave-voice.html`,
`test-overtone-voice.html`, `test-scopes.html`) lives in that seat's own stage folder ✓.
One file sits outside a stage folder — `docs/scratchpad/keys-input-donecheck.html`
(`keys-input`) — which is LLM scratch space, not `/src`, not `/tools`, and not another
seat's file. Noted so the closer can sweep it; **not** filed as a lane violation.

---

## Q3 — Did anything violate CONTRACTS §10?

**No. All six original prohibitions and all three `[AMENDED 2026-08-22]` additions hold.**
Each was looked for by name across all eleven shipped files, not inferred.

| §10 prohibition | Result |
|---|---|
| **Create a second AudioContext** | **CLEAN.** Exactly one construction exists in P1: `src/core/audio.js:26`, `new AudioContextCtor()`. No other `new AudioContext`, no `webkitAudioContext` construction, and **no `OfflineAudioContext`** anywhere in `/src` or `/tools`. Every other mention of the string is a comment. Both synths receive `ctx` through `constructor(ctx, out)` per §2; `shell.js` imports the single `ctx` and passes it. |
| **Schedule audio from `requestAnimationFrame`** | **CLEAN.** Eight rAF call sites exist — `spectrum.js` (2), `scope.js` (2), `shell.js` CPU meter (2), `overtone-synth.js` mount glow (2). Every one was read. The two visuals do `getByteFrequencyData` / `getByteTimeDomainData` and canvas drawing only. The CPU meter reads `governor.load`, `voicePool.count`, `instrument.cpuWeight` and `audio.state` and writes DOM. The Overtone Synth's loop sets one `boxShadow` string. **No `AudioParam` method, no `osc.start`/`stop`, no `noteOn`/`trigger`, and no `ctx.currentTime` scheduling appears inside any rAF callback.** §3's "two loops that never cross" is intact. |
| **Write a file outside the lane the seat brief names** | **CLEAN.** See Q2 in full. |
| **Add a dependency** | **CLEAN.** Thirteen import statements exist across `/src` and `/tools`. Every one is a **relative path inside this project** (`../core/audio.js`, `../src/ui/shell.js`, …). Zero bare specifiers, zero `require()`, zero CDN or `http(s)://` script/style source, zero import map. The only external stylesheet link on either page is `../src/ui/tokens.css`, this project's own file. |
| **Add a build step before P5** | **CLEAN.** No `package.json`, no `node_modules`, no bundler or transpiler config (`webpack`/`vite`/`rollup`/`esbuild`/`babel`/`tsconfig`), no `Makefile` — searched the whole project tree, not just the root. Both pages are `<script type="module">` with relative imports and load directly off a static file server. |
| **Invent an interface that is not in this file** | **CLEAN as an escalation, with two additions that were declared rather than smuggled.** `audio.js` adds `createChannel()`/`releaseChannel()` — not in CONTRACTS, but §2 promises every instrument an `out` node and `mixer/strip.js` does not exist until P4, so something had to produce it. `input.js` adds a third bus event, `'shift'` — not in §5, needed because §12.1 says both shifts are "shared across every surface at once" and no surface can honour that without notification. **Both are logged as OPEN DECISIONS in their own seats' receipts with a named decider, both are additive inside a file the seat owns, and neither contradicts a frozen section.** That is the declared-extension path, not invention. Flagged in Q7 as informational so P2's SPEC seat can fold them in or rule them out. |
| `[AMENDED]` **Never `await` `requestMIDIAccess()` on startup** | **CLEAN.** `input.js` `requestMIDI()` is fire-and-forget with `.then().catch(() => {})`, guarded by a bare `typeof` check, and returns nothing awaitable — §5's required shape verbatim. Nothing on any startup path awaits it. |
| `[AMENDED]` **Never assume the app runs from `file://`** | **CLEAN.** Both pages document the static-HTTP requirement in their head comment and explain why (ES modules, secure context for Web MIDI and P5's service worker). Nothing assumes `file://`. |
| `[AMENDED]` **Never assume the AudioContext is running at load** | **CLEAN.** `audio.js` treats `suspended` as the starting state, `unlock()` is idempotent and swallows a pre-gesture rejection, and a window-level `pointerdown`/`keydown`/`touchstart` net catches the first real gesture. `shell.js` also calls `unlock()` on every `noteon` and shows a "Click to start sound" button while suspended. Nothing blocks startup on sound. |

---

## Q4 — Are the two visuals paired correctly?

**Yes. Spectrum → Wave Synth, oscilloscope → Overtone Synth, and neither synth has both.
The pairing is enforced structurally in four independent places, so it cannot drift by
accident — it can only be broken by deliberately defeating all four.**

| Enforcement | Where | What it does |
|---|---|---|
| 1 · The instrument's own tap | `wave-synth.js` `getAnalyser()` returns the node for `'spectrum'` and `null` for everything else; `overtone-synth.js` returns the node for `'scope'` and `null` for everything else | §11.4/§11.5 verbatim. A synth simply has no second tap to hand out. |
| 2 · The visual's constructor | `spectrum.js` reads `getAnalyser('spectrum')` and **throws** on `null`; `scope.js` reads `getAnalyser('scope')` and **throws** on `null` | Each visual refuses the wrong instrument at construction, with an error message that names PHASE.md's inversion and points at the other file. |
| 3 · The shell's pre-mount assertion | `shell.js` `ToolShell.mount()` computes `otherTap` and **refuses to mount** if the instrument answers it, tearing the instrument and its channel back down first | Catches a *future* edit that gave a synth both taps, before a single node enters the document. |
| 4 · The page | Each `/tools/*.html` imports exactly **one** visual class and passes one `tap` string | There is no list, no array, nothing to append a second visual to. |

Verified against the shipped source: `tools/wave-synth.html` imports `Spectrum` and passes
`tap: 'spectrum'`; `tools/overtone-synth.html` imports `Scope` and passes `tap: 'scope'`.
No file imports both visuals. `vis/scope.js` is not referenced anywhere on the Wave Synth
page and `vis/spectrum.js` is not referenced anywhere on the Overtone Synth page.
`test-report.md` Q1 confirms the same thing live (1 spectrum canvas / 0 scope elements,
and the inverse). **Zero drift against the phase's central teaching decision.**

Worth recording as a positive finding, not a complaint: this is the strongest structural
guarantee in P1 and the one place where four seats independently defended the same
teaching decision without coordinating. It should survive into P4 intact — `shell.js`'s
assertion is the piece most likely to be lost when the DAW shell is written, because P4
mounts many instruments at once. Flagged forward as known state, not as drift.

---

## Q5 — Does the curriculum survive the build?

> **FOR BRANDON. Nothing in this section is decided.** Every wording difference below is
> reported with the curriculum's exact words on one side and the app's exact words on the
> other, and stops there. This seat has no opinion on music theory (§10-H) and did not
> pick a side on any of them. **Per this run's standing rule, Brandon is not fielding
> decisions until P4 closes** — this section is written to be handed to him whole at that
> point. Nothing here blocks P2 or P3.
>
> One item below (**C-7**) is *not* a wording question — it is a code defect that teaches
> the wrong thing. It is filed in Q7 against `overtone-voice` and does not need Brandon.

### Verdict

**The curriculum survives, and the four things this seat was asked to check for are all
visible to a student.** The `outline`'s Frequency Spectrum section has 14 statements. **9
are visible to a student in wording close to Brandon's own; 1 is served better than
asked; 4 are demonstrated by the app but never named in Brandon's words on screen.**

The strongest result: the *mechanism* of every concept is on screen and interactive. The
weakest: several of Brandon's **names** for those mechanisms are in code comments and in
CONTRACTS but never in front of a student.

### The four required checks

| Required | Visible to a student? | Where, exactly |
|---|---|---|
| **The fundamental** | **YES, by name, on both tools** | Spectrum draws a full-height marker labelled `FUNDAMENTAL 261.6 Hz`; Overtone Synth's top row is labelled `fundamental (×1)` in accent colour and bold, and ships loudest (level 1.0) with every other partial at 0.0, so it is *demonstrably* lowest-and-loudest before the student touches anything; Wave Synth's page says "the fundamental is the lowest and loudest". |
| **The partials** | **YES, by name, on both tools** | Overtone Synth draws eight labelled rows a student edits directly; the spectrum draws leader lines and `×2 ×3 ×4 …` labels over every partial it detects. Both directions of the inversion show them. |
| **The whole-number series** | **YES, and it is enforced in front of the student** | Multiplier inputs are `type="number" min="1" max="32" step="1"`, and `setParam` clamps with `Math.round` then **writes the rounded value back into the input**, so typing `2.7` visibly snaps to `3` on screen. On the other tool the spectrum's `×2 ×3 ×4` markers show the same series arriving from a shape the student picked. |
| **Simple → complex** | **YES, but only half of Brandon's pair — see C-4** | Overtone page: "More frequencies = a more complex wave." Wave page: "Smoother wave = fewer overtones." Both near-verbatim. |

### Served better than asked — one line, recorded as a win

`outline` line 41 defines the oscilloscope parenthetically: *"shows what **gain** of a
sound wave looks like over the course of **one repetition**."* The app uses **Brandon's
own two words, on screen, in three places**: `scope.js` labels the y-axis `gain`, draws a
bracket across the plot reading `ONE REPETITION — 3.82 ms`, and its accessibility label
reads "the shape of one repetition of the sound wave"; the page adds "the gain of the wave
over the course of ONE repetition". This is the closest the build gets to the curriculum
anywhere, and the bracket turns a definition into a picture. Nothing to decide here.

### C-1 — "vibrations per second" is never on screen

- **Brandon (`outline` line 30):** "Sound is measured in **vibrations per second** (Hz)"
- **App:** the unit `Hz` appears bare — on the spectrum's top axis tick (`16k Hz`), on the
  `FUNDAMENTAL … Hz` marker, and in the scope's readout. **The expansion "vibrations per
  second" appears nowhere a student can see it** — only inside a `spectrum.js` code
  comment quoting the outline.
- **The gap:** a student meets `Hz` as an unexplained unit. The half of the sentence that
  makes it mean something is missing from the UI.
- **For Brandon:** does the phrase belong on the spectrum's axis, in the page's lesson
  line, or only in your spoken teaching? Not decided here.

### C-2 — "hear pitch" became "hearing"

- **Brandon (line 31):** "The human ear is designed to hear **pitch** at roughly
  30Hz-16Khz, although it **varies by person and age**"
- **App:** `spectrum.js` draws `human hearing ≈ 30 Hz – 16 kHz` above the plot (expanded
  view only), and the axis defaults to exactly 30 Hz–16 kHz, so the range itself is right
  and is the actual drawn extent, not decoration.
- **The gaps, both wording:** (a) Brandon scopes the range to **pitch**; the app says
  **hearing**, which is a broader claim than he made. (b) the "varies by person and age"
  qualifier is absent, and the app's `≈` is the only trace of it.
- **For Brandon:** is "human hearing" an acceptable shorthand for your "hear pitch", and
  does the age/person caveat need to be on screen or is it yours to say out loud?

### C-3 — "harmonic series" and "ratios" are never on screen

- **Brandon (lines 35–37):** "Frequencies have a mathematical relationship based off
  **ratios** that form a pattern called the **'harmonic series'** — Scaled sequence of the
  a fundamental being multiplied by consecutive **whole digits** (x\*1, x\*2, x\*3, X\*4).
  Each function of the sequence is called a **'partial'**"
- **App:** the *series itself* is fully visible and editable (eight rows, `×N` multipliers,
  `×2 ×3 ×4` spectrum markers, whole-number snapping). But the **name "harmonic series"
  appears exactly once in the entire codebase — in a code comment in
  `overtone-synth.js`.** It is on neither page, in neither lesson line, and on neither
  canvas. "Ratios" and "whole digits" likewise never appear on screen.
- **The gap:** this is the most-named concept in Brandon's section and the one a student
  never reads. The app teaches the pattern and withholds the term for it.
- **Notation difference, same item:** Brandon writes `x*1, x*2, x*3, X*4`; the app writes
  `×1, ×2, ×3, ×4` (multiplication sign, no `x` operand shown).
- **For Brandon:** should "harmonic series" be printed on the Overtone Synth page, and do
  you want your `x*N` notation or the app's `×N`?

### C-4 — "simple" is missing; only "complex" shipped

- **Brandon (lines 39–40):** "The fewer frequencies, the more **'simple'** / The more
  frequencies, the more **'complex'**" — a matched pair, both words in quotes as terms.
- **App:** the word **"complex"** is on screen once (Overtone page: "More frequencies = a
  more complex wave"). The word **"simple" is nowhere in any shipped UI text.** The Wave
  Synth page carries the related idea in different words — "Smoother wave = fewer
  overtones" (which is line 43, not line 39).
- **The gap:** Brandon defines a two-ended scale; the app ships one end. A student is
  never told what the other end is called.
- **For Brandon:** does "simple" need to appear opposite "complex" — for example on the
  Wave Synth's sine button, or in its lesson line?

### C-5 — the definition of "sine" is missing, and it is missing from the tool that proves it

- **Brandon (line 38):** "A **single frequency by itself** is called a **'sine' tone**"
- **App:** the word `Sine` appears once, as a button label on the Wave Synth. **Its
  definition appears nowhere.** And on the Overtone Synth — where a student is literally
  looking at one sine oscillator per partial, and where the default state (fundamental
  1.0, all others 0.0) *is* "a single frequency by itself" — **the word "sine" never
  appears at all.**
- **The gap:** the tool that demonstrates Brandon's definition perfectly never says the
  word, and the tool that says the word never defines it. The two halves are on separate
  pages.
- **For Brandon:** where does this definition belong — the Wave Synth's sine button, the
  Overtone Synth's fundamental row, both, or neither?

### C-6 — waveform names, and whether sine is one of them

- **Brandon (lines 41–42):** "There are standard waveforms based on their oscilloscope …
  shape — **Triangle wave, Square (pulse) wave, saw wave**". **Three** are listed. Sine is
  introduced separately, one line earlier, as a *single frequency* — not as a standard
  waveform.
- **App:** the Wave Synth shows **four** equal buttons in one row under the label `Wave`:
  `Sine`, `Triangle`, `Square (Pulse)`, `Saw`.
- **What matches:** `Square (Pulse)` carries Brandon's parenthetical verbatim (his lower-
  case "(pulse)" is title-cased in the app). `Triangle` and `Saw` match his names.
- **The gaps, both his to rule on:** (a) Brandon's names include the noun — "Triangle
  **wave**", "saw **wave**" — the buttons drop it. (b) more substantially, presenting sine
  as a fourth peer button **flattens the distinction Brandon draws** between *sine = one
  frequency* and *the three standard shapes = many frequencies*. The app makes four things
  look like the same kind of thing.
- **For Brandon:** is sine a "standard waveform" alongside the other three, or is it the
  separate thing your outline makes it? The button row is where that answer shows.

### C-7 — a partial's label can lie about its own multiplier `[NOT a wording question]`

**This one is a defect, not a decision, and it is the only curriculum item this seat
files as drift.** Filed in Q7 against `overtone-voice`; Brandon does not need to rule.

- **Brandon (line 37):** "Each function of the sequence is called a 'partial'" — a partial
  is defined **by its position in the whole-number sequence**. Partial N is ×N.
- **App:** `overtone-synth.js` draws each row's label **once, at mount, as a hard-coded
  `partial ${i + 1}`**, while that row's multiplier is a live, student-editable input. The
  label never updates.
- **The failure:** a student who sets the row labelled `partial 2` to a multiplier of `7`
  gets a row reading **`partial 2   [7] ×   ————`** — a partial numbered 2 that is sounding
  ×7. Under Brandon's own definition that row *is* partial 7, and the screen says otherwise.
  The one instrument built to teach the series can be made to contradict it in two clicks,
  and the whole-number constraint the app correctly enforces is what makes it reachable.
- **Owner:** `overtone-voice` (P1/S3), `/src/instruments/overtone-synth.js` line 593.
  Severity **MEDIUM** — teaching correctness, not a crash.

**Separate from the defect, one numbering question that IS Brandon's**, and should travel
with C-7 when it goes to him: **three numbering schemes are live for the same eight
objects.** CONTRACTS §11.5 addresses them `partial.0` … `partial.7` (0-based, fundamental
is partial 0). The screen labels them `fundamental (×1)`, `partial 2` … `partial 8`
(1-based-by-multiplier, fundamental is not called a partial at all). Brandon's outline
implies the fundamental **is** a partial ("each function of the sequence", and the
sequence starts at x\*1). So `setParam('partial.1.multiplier', …)` addresses the row the
student reads as "partial 2". **For Brandon: is the fundamental partial 1, partial 0, or
not a partial?** Whatever he answers, §11.5's path names and the on-screen labels should
then be made to agree — that is a P3/P4 SPEC edit, not a P1 one.

### Fully served — no action, recorded for completeness

| `outline` line | Where a student meets it |
|---|---|
| "What we hear is the combination of all frequencies happening…" | Wave Synth page: "every frequency in the sound right now" |
| "The lowest and loudest of the frequency is the 'fundamental'" | Wave Synth page, verbatim: "the fundamental is the lowest and loudest" — **and `spectrum.js` actually finds it that way**: it takes the loudest peak, then selects the *lowest* local maximum within 20 dB of it. The implementation matches Brandon's definition rather than using a generic pitch tracker. |
| "Everything above that is an 'overtone'" | Wave Synth page: "everything above it is an overtone (×2, ×3, ×4 …)" |
| "The more smooth/simple the wave, the less overtones in the sound" | Wave Synth page: "Smoother wave = fewer overtones" |
| oscilloscope = gain over one repetition | See "served better than asked", above |

**One more for Brandon, small:** `outline` line 34 reads *"Everything **about** that is an
'overtone'"*. The app renders it as *"everything **above** it is an overtone"*. The app is
almost certainly right about the intent and this is almost certainly a typo in the
outline — **but a seat silently corrected Brandon's words, and this seat will not ratify
that.** Reported so he can fix the outline or tell the app to match it.

### Two items where the app introduced vocabulary the curriculum does not have

1. **`dB`.** The spectrum's expanded view labels its y-axis `dB` with four numeric
   gridlines. Brandon's Frequency Spectrum section **never mentions decibels** — the
   concept he names is "the level at which they're perceived" (line 32), in plain words.
   The app expresses his concept in a unit he did not introduce, and does not explain it.
   *For Brandon: does "dB" enter the curriculum here, or should that axis carry your
   words instead?* (Note: §10-B does put dBFS in the contract, but for P4's meters, not
   for this teaching axis.)
2. **A developer message on a student screen.** When the signal pins the analyser,
   `spectrum.js` prints across the plot: *"signal above analyser maxDecibels — raise it on
   the instrument."* That sentence is addressed to a programmer, in a classroom, on a
   projector. It is honest — the seat deliberately chose to say so rather than draw a
   silent lie, which was the right instinct — but the register is wrong for the audience.
   Filed in Q7 as **LOW**, owner `scopes`. Not Brandon's to decide unless he wants to
   supply the student-facing wording.

---

## Q6 — Does `tokens.css` cover CONTRACTS §9?

**Definitions: complete and exact. Usage: correct. "No hard-coded color anywhere in P1":
NO — three files ship a second, divergent palette and one ships a literal with no token
at all.**

### Every token defined — yes, all 13, and only those 13

§9 names 13 tokens. `tokens.css` defines exactly 13, no more and no fewer, all on `:root`
in one file:

`--bg` · `--panel` · `--line` · `--text` · `--text-dim` · `--deg-major` · `--deg-minor` ·
`--deg-dim` · `--deg-altered` · `--accent` · `--warn` · `--meter-ok` · `--meter-hot`

No token was invented, none was dropped, none was renamed. The file also carries its
measured contrast ratios and its ΔE separations inline, and states plainly that the values
are **PROVISIONAL pending Brandon** because §4's colour rule carries teaching meaning —
which is the correct posture for a BUILD seat under §10-H, and is already logged in
`receipt-scopes.md`. Not drift.

### Used by name — yes, where P1 has a consumer

| Token | Used in P1 |
|---|---|
| `--bg` · `--panel` · `--line` · `--text` · `--text-dim` · `--accent` · `--warn` | **yes**, 19 / 8 / 14 / 33 / 15 / 19 / 5 `var()` references |
| `--meter-ok` · `--meter-hot` | **yes**, 2 each (the CPU meter's bands, `shell.js`) |
| `--deg-major` · `--deg-minor` · `--deg-dim` · `--deg-altered` | **0 references — correct.** §9 assigns these four to the scale circle, the diatonic keys, the piano-roll shading and the note bank. **All four surfaces are P3/P4.** They are defined ahead of their consumers on purpose, so one palette exists before four seats need it. Not drift. |

### No hard-coded colour anywhere in P1 — **this is where it fails**

Six of the eight code files are clean in substance: `spectrum.js`, `scope.js`,
`shell.js`, both `/tools/*.html` pages, and `input.js` / `audio.js` (which carry no colour
at all). `spectrum.js` and `scope.js` resolve tokens at mount via `getComputedStyle` —
correct, since a canvas needs a real colour string — and their `TOKEN_FALLBACK` maps are
**byte-identical to `tokens.css`**. `shell.js`'s inline fallbacks are likewise identical.
Those are consumers, not a second palette.

**Three files ship a second palette that disagrees with `tokens.css`.** Every one of these
is a `var(--token, FALLBACK)` whose fallback is a *different colour* from the token it
falls back from:

| File | Seat | Fallback shipped | `tokens.css` says |
|---|---|---|---|
| `wave-synth.js` | `wave-voice` | `--text` → `#eee`, `--panel` → `#1a1a1a`, `--line` → `#333`, `--bg` → `#0c0c0c`, `--text-dim` → `#999`, `--accent` → `#5cf` | `#f2f6fc` · `#1b2332` · `#3a485f` · `#0a0d13` · `#93a1b8` · `#34e5b4` |
| `overtone-synth.js` | `overtone-voice` | `--panel` → `#1a1a1f`, `--text` → `#eee`, `--line` → `#333`, `--accent` → `#4fc3f7`, `--text-dim` → `#999`, `--meter-ok` → `#6f6` | `#1b2332` · `#f2f6fc` · `#3a485f` · `#34e5b4` · `#93a1b8` · `#6ee05a` |
| `keyboard.js` | `keys-input` | `--line` → `#2a2f36`, `--text` → `#e8eaed`, `--text-dim` → `#8b939e`, `--accent` → `#34d1c4`, `--panel` → `#16191d`, `--bg` → `#0d0f12`, `--warn` → `#e0a33e` | `#3a485f` · `#f2f6fc` · `#93a1b8` · `#34e5b4` · `#1b2332` · `#0a0d13` · `#ff7a1a` |

**Why this is real drift and not pedantry.** §9's whole sentence is *"Defined once in
`ui/tokens.css`, used everywhere… One palette, four surfaces, no drift."* These three
files each carry a **complete alternate palette in a second location**. Today it is
invisible, because both shipped pages link `tokens.css` and the fallbacks never fire. It
becomes visible the moment any page, any embed, or any P4 view renders one of these
modules without that stylesheet — and then the app renders in **three** palettes at once,
because the three sets do not even agree with each other (`--accent` alone is `#5cf`,
`#4fc3f7`, `#34d1c4` and `#34e5b4` across four files). It also means Brandon's one-line
edit to `tokens.css` — the thing that file promises him in its own header — silently does
not reach these three.

**The correct pattern already exists in this same phase**: `scopes` and `tone-shell` both
mirror `tokens.css`'s real values into their fallbacks and say in a comment that they must
be kept identical. Three seats did it right; three did not.

**One true hard-code, no token involved:**
`keyboard.js:199` — `border-color: #000;` on the black keys. Not a fallback, not a token
reference, no `var()` anywhere on the line. It is the only colour in P1 that is not
reachable from `tokens.css` at all. §9 has no token for it, which makes it an escalation
under §9's own rule ("If you need a color that is not here, that is an escalation, not a
hex code") rather than something a seat may just type.

**Two untokenized shadows, informational:** `shell.js:190` `rgba(0,0,0,0.55)` and
`shell.js:298` `rgba(0,0,0,0.75)`. §9 defines no shadow or scrim token, so there was
nothing to read. Recorded so a later phase can decide whether §9 wants one; not filed as
a violation.

**One semantic misuse, informational:** `overtone-synth.js:641` paints a partial's level
bar with `--meter-ok`. `tokens.css` scopes that token to meters (§10-B: dBFS peak,
`--meter-hot` above −6 dB) and warns explicitly that visuals must not borrow a token whose
teaching association is something else. A partial-level bar is not a meter. Low, but it is
the same class of mistake §9 exists to prevent.

---

## Q7 — What drift did you find, and who owns each?

One line each: file · seat · contract section · severity. **Nine items. No HIGH. No STOP
condition.**

| # | File | Seat | Contract § | Drift | Severity |
|---|---|---|---|---|---|
| **D-1** | `/src/instruments/overtone-synth.js` (`noteOn`, 339) | `overtone-voice` | §2 · §12.1 | `noteOn` has no `velocity` default; `wave-synth.js` defaults to `0.8` (§12.1's no-velocity constant). `noteOn(60)` reaches `linearRampToValueAtTime(NaN)`. Masked today only because `shell.js` always passes a velocity from the bus. | **LOW** |
| **D-2** | `/src/instruments/overtone-synth.js` (`setParam` 448, `getParam` 468, `setState` 492) | `overtone-voice` | §2 | Throws on an unknown path / non-object state; `wave-synth.js` returns silently. §2 defines no error contract, so neither is wrong alone — but a generic §2 caller (P4 automation, P5 preset load) cannot handle both. One convention has to win. | **LOW-MED** |
| **D-3** | `/src/instruments/overtone-synth.js` (`_mount`, 555) | `overtone-voice` | §2 | `_mount()` calls `this.unmount()` first, so compact and expanded **cannot be live at once**; `wave-synth.js` supports both (its brief required it; verified in `test-report.md` Q2). P4's DAW mounts a strip view and a detail view of the same instrument together. | **MEDIUM** (P4 blocker if unfixed) |
| **D-4** | `/src/instruments/wave-synth.js` (`Voice.trigger` 159, `release` 200) | `wave-voice` | §11.3 | Envelope/wave are snapshotted at trigger, so `env.*` edits never reach a sounding note; `overtone-synth.js` propagates live via `updateEnv`/`updatePartial`. §11.3 is silent, both seats logged their choice — but the two synths teach the envelope differently. | **LOW** |
| **D-5** | `/src/instruments/*.js`, `/src/core/audio.js` | `spec-voice` (spec), both synths | §2 vs §11.2 | §2 says `get voiceCount() // live voices right now — the governor reads this`. **Nothing reads it.** `governor.request()` checks `voicePool.count` (§11.2), and `instrument.cpuWeight` is read only by the CPU meter's display. §11.2 effectively supersedes §2's comment; the two sections now disagree in writing. | **LOW** (doc drift) |
| **D-6** | `/src/instruments/overtone-synth.js:593` | `overtone-voice` | §11.5 · curriculum | Partial row labels are hard-coded `partial ${i+1}` at mount while the multiplier is live and editable, so a row can read `partial 2` while sounding `×7` — contradicting the curriculum's own definition of a partial. **See Q5 C-7.** | **MEDIUM** (teaching correctness) |
| **D-7** | `/src/instruments/wave-synth.js`, `/src/instruments/overtone-synth.js`, `/src/surfaces/keyboard.js` | `wave-voice`, `overtone-voice`, `keys-input` | §9 | Each ships a complete `var()` fallback palette whose values **disagree with `tokens.css` and with each other** (`--accent` is `#5cf` / `#4fc3f7` / `#34d1c4` vs the real `#34e5b4`). §9: "One palette… no drift." `scopes` and `tone-shell` mirror the real values correctly — the pattern exists, three seats did not follow it. | **MEDIUM** |
| **D-8** | `/src/surfaces/keyboard.js:199` | `keys-input` | §9 | `border-color: #000;` — the only colour in P1 with no token and no `var()`. §9's own rule makes a needed-but-absent colour an escalation, not a hex code. | **LOW** |
| **D-9** | `/src/vis/spectrum.js:786` | `scopes` | §9 (teaching register) | Draws `"signal above analyser maxDecibels — raise it on the instrument"` across a student-facing plot. Developer text on a classroom projector. The instinct — say so rather than draw a silent lie — was right; the audience is wrong. | **LOW** |

### Not drift — checked, and deliberately not filed

- **The §11.2a burst voice-cap fix.** Verified live-correct in Q1. Closed, not reopened.
- **The three post-close patches.** Troubleshooter-directed, in-lane, receipted. Q2.
- **`createChannel()` / `releaseChannel()` (`audio.js`) and `input.'shift'` (`input.js`).**
  Not in CONTRACTS, but both are declared OPEN DECISIONS with a named decider, additive
  inside an owned file, and contradict nothing frozen. Q3. **Forwarded to P2's SPEC seat**
  as a decision to make, not a violation to fix.
- **The four unused `--deg-*` tokens.** Their consumers are P3/P4. Q6.
- **`tokens.css`'s colour values being PROVISIONAL.** Correct §10-H posture, already
  Brandon's call, already logged by `scopes`.
- **`wave-synth.js`'s shared `<style>` tag surviving `dispose()`.** A `<style>` element is
  neither an AudioNode nor a listener, so §2's teardown wording is satisfied. Already
  logged as an open decision by the seat. Noted, not filed.
- **`keyboard.js`'s `number` / `solfege` overlays rendering nothing.** A stated seam
  awaiting `theory/scale.js` (P3), announced on screen as such. Correct §10-H behaviour.
- **`shell.js:1032–1041`'s stale comment** claiming both synths still ship
  `maxDecibels = -30`. Both now set `-15`; the comment describes a fixed defect as open.
  Cosmetic, in `tone-shell`'s own file, worth one line when P2 next touches the shell. Too
  small to file.

---

## HANDOFF

**To the Troubleshooter:** this report. Nine drift items, none HIGH, none blocking P2.
The two worth acting on before P4 are **D-3** (Overtone Synth cannot hold two mounts —
P4's DAW needs that) and **D-7** (three divergent fallback palettes — cheap to fix now,
expensive once P3 and P4 add surfaces to the same pattern).

**Forward into P2 as known state:**
- P1's §2 surface is sound but **not uniform** — D-1 through D-4 mean two instruments
  behave differently at the same §2 member. P2 adds four more instruments. **A SPEC ruling
  on §2's error convention, velocity default, and dual-mount requirement would stop this
  multiplying.** That is P2's `spec-clock` / the Troubleshooter's call, not this seat's.
- `createChannel()`/`releaseChannel()` and `input.'shift'` are load-bearing and
  undocumented in CONTRACTS. P2 will use both.
- `governor.load` is honest but not yet meaningful — it times `audio.js`'s own
  bookkeeping because `clock.js` does not exist. P2's `clock` seat owns the reconciliation;
  three receipts and `test-report.md` already say so.
- The visual-pairing assertion in `shell.js` (Q4, enforcement 3) is the piece most at risk
  when P4 rewrites the shell for many instruments. Carry it forward deliberately.

**To Brandon, after P4 closes:** Q5 in full — C-1 through C-6, the partial-numbering
question inside C-7, the two introduced-vocabulary items (`dB`, the saturation message),
and the `outline` line 34 "about"/"above" typo a seat silently corrected. **No answer is
being sought now.** Nothing in Q5 blocks P2 or P3.

---

**PHASE DONE-CHECK, this seat's clause:** PHASE.md requires "`redpen-p1` reports zero
contract drift." **This seat cannot report zero.** It reports **nine items, none HIGH,
none blocking**, with the phase's central teaching decision (Q4) and the §11.2a voice-cap
fix (Q1) both verified intact. That is the honest number. The Troubleshooter decides
whether nine LOW-to-MEDIUM items clears the clause.

