# SYNTH VOICE NORMALIZATION — DESIGN ONLY

2026-08-31 · design seat · DESIGN ONLY, zero lines written to /src

Brandon named the job: **"synth voice normalization."** Not gain normalization — that reads
project-wide and this isn't. The name is the scope check: if it isn't a synth voice, it
isn't in this job.

Brandon's problem: "When the players begin new voices/oscillators, the volume increases
too much... somehow we have to program it so that they normalize."

Brandon's spec: "Whatever the natural gain of a monophonic voice is, that's the target for
the rest of them. I imagine a logic formula on the oscillators with a curve to it?"

Rulings, 2026-08-31:
- **"oh shiiit don't have it do it to the drums"** — Drum Synth and Drum Sampler are out.
  Scope is Wave Synth, Overtone Synth, Chord Module.
- **"give me toggles in the dev bar"** — anything Brandon can hear is a knob, not a question.

This receipt replaces `2026-08-31-polyphony-normalizer-design.md`, which was renamed to
match the job name and rewritten twice. §1 is the honest accounting of what was cut.

---

## 1 · WHAT WAS BULLSHIT IN MY FIRST DRAFT

Straight, no defending.

**The big one: I designed five new gain nodes when one per instrument already existed.**
`createChannel()` — core/audio.js:70-76 — creates exactly one gain node per instrument, sets
it to 1, wires it into the master chain, and hands it to the instrument as `out`. Nothing
ever writes `node.gain` again; the only uses of `channels` are add, has, delete, and the
dispose loop.

My brief said "there is NO existing hook." I repeated it instead of checking, then designed
around the absence of a thing that was sitting there. That one miss generated most of the
draft.

**Cut, and why:**

- **`VoiceNormalizer` class, five instances, five new nodes, five `dispose()` hooks** —
  replaced by a loop over nodes that already exist. All downstream of the miss above.
- **New file `src/core/normalize.js`** — a whole file for one constant and one line of
  arithmetic. It belongs in the file that already owns the count.
- **`voicePool.onChange` / `offChange` pub-sub** — I invented an event system so a listener
  in another file could hear about a change. With the code in `audio.js`, `register()`,
  `release()` and `steal()` call the function directly; they are twenty lines apart.
- **`voicePool.countFor()` as public API** — only ever called inside the same file. Private.
- **The DEPTH dial** — invented. A second knob solving a problem that had not happened.
- **Finding D, the 5 ms steal undershoot** — real and irrelevant. Included to look thorough.
- **The "which node doubles as the user's gain slider" table** — genuine research, but it
  was only a constraint on the five-node design. Deleted with its cause.
- **Fifteen edit points across seven files** → three files, and no instrument file touched.

**"Open Decision A" was a real question and is now withdrawn.** Per-instrument vs. master
mattered — harmony.html runs three instruments at once. But it was never mine to hand you as
a question. It is a knob (§5).

**What survived:** the curve, the fact that `voicePool` already counts voices per instrument,
and the drums flag — which you ruled on.

---

## 2 · THE SOLUTION

**One source file changes. No instrument file is touched. No new file. No new node.**

`createChannel()` learns one optional argument:

```
createChannel(synthVoiceId)
```

- **Pass a synth's id** → that channel joins synth voice normalization.
- **Pass nothing** → gain stays at 1 forever. Byte-for-byte today's behavior.

That argument is the entire opt-in, and the entire drums answer (§4).

`core/audio.js` already holds the count. Line 171: `registry`, a `Map` of
`voice -> { instrumentId, ... }`, mutated in exactly three places, all in this file:
`register()` (196), `release()` (204), `steal()` (253). All five instruments already write
into it — wave-synth:522, overtone-synth:363, chord-module:780, drum-sampler:466,
drum-synth:665 — and deregister via `voicePool.release(this)` inside `Voice.free()`.

The count exists. The node exists. They are forty lines apart in one file. The job is a wire.

**The mechanism, entire:**

1. `channels` becomes a `Map` of `node -> synthVoiceId | null` instead of a `Set`.
2. A module-private `renormalize()` walks it, skips every null, derives the voice count for
   each remaining id, and ramps that node's gain.
3. `register()`, `release()` and `steal()` each end with a `renormalize()` call.
4. A small exported control object, `synthVoiceNorm`, carries mode / exponent / response for
   the dev box to write. Every setter calls `renormalize()`.

One data structure widened, one short function, three call lines, one control object.

---

## 3 · THE CURVE

```
gain(n) = n ** -exponent      n = synth voices counted for that channel
gain(0) = 1                   nothing sounding; hold at reference
```

`1 ** -k` is 1 for every k. **A monophonic voice is never touched — by the arithmetic, not
by a special case.** Your reference constraint enforces itself. `n ** -k` only decreases, so
polyphony moves toward the reference and never past it.

| exponent | | 2 voices | 4 | 8 | 16 | 32 |
|---|---|---|---|---|---|---|
| 0.00 | off — today | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| 0.50 | constant RMS, derived | 0.707 | 0.500 | 0.354 | 0.250 | 0.177 |
| 0.60 | ships as the default | 0.660 | 0.435 | 0.287 | 0.189 | 0.125 |
| 1.00 | constant peak, over-corrects | 0.500 | 0.250 | 0.125 | 0.063 | 0.031 |

0.5 is exact for uncorrelated signals. Chord partials are not uncorrelated, so real sums land
between `sqrt(n)` and `n`. 0.5 is math, 0.6 is a guess, **and it is now a slider, so it is
your ear and neither of ours.** 0.60 is only where the handle starts.

**Release already behaves correctly with no extra work.** The count drops when `Voice.free()`
runs at the end of the release tail, not at `noteOff` — so gain climbs back only once the
tail has stopped sounding. Falls out of the existing code.

---

## 4 · DRUMS ARE OUT — AND THE NAME IS WHAT KEEPS THEM OUT

Your ruling did not add an exception clause. It removed the need for one.

Drum Synth and Drum Sampler are built at beat.html:510-511 from channels made at
beat.html:506-507, which call `createChannel()` with no argument. Under this design **that
is already the correct final code** — no id, no normalization, no edit. Same for the
metronome click at clock.js:332.

Drums are not running a different rule. They are running no rule, which is what they do
today. Opting out is the default; opting in is passing an id.

**The name caught a bug in "master" mode before it was written.** The obvious way to build
master mode is one gain node on `masterGain`. That node is downstream of the drums, so a
held chord would duck the kick — which is exactly the thing you just ruled out, sneaking
back in through a different door.

So master mode does **not** put a node on the master bus. It changes only *which count feeds
the formula*, never which node the gain lands on:

- **per-instrument** — each synth channel uses its own live synth voice count.
- **master** — all synth channels use the *same* count: total live synth voices across the
  three synth channels, applied to each of their own nodes.

Drum voices are never counted and are never in the signal path of either mode. Same three
nodes in every mode. The mode switch is a one-line branch inside `renormalize()`.

**What you will actually hear:** on wave-synth.html and overtone-synth.html the two modes are
identical, because there is one synth on the page. **The difference is only audible on
harmony.html**, which runs Chord Module, Wave Synth and Overtone Synth at once. Flip it
there or you are listening to nothing.

---

## 5 · THE DEV BOX SURFACE

`src/ui/devbox.js`, 828 lines, hash-gated on `#dev`, loaded by `ui/shell.js` so it is on
every tool page. It persists to `localStorage` per pathname via `state` (173) / `load` (185)
/ `save` (202), and builds its body at `buildBody()` (674) as
`toggleSection()` (593) then `derivedSection()` (634).

**New section: `synthVoiceNormSection()`, appended in `buildBody()` between those two** —
≈685, one line. It reuses the file's existing idioms: the `mk(label, key, extra)` helper
pattern from `toggleSection()`, `knobRow()` (489) for sliders, `setKnob()` (235) for commits,
and `refreshDerived()` (301) for the readout tick.

Section heading: **SYNTH VOICE NORMALIZATION**

### Knob 1 — normalization (three-way)

```
normalization    ( off )  ( per-instrument )  ( master )
```

Writes `synthVoiceNorm.mode`. Default **per-instrument**.
- `off` — every synth channel gain = 1. Today's build, exactly.
- `per-instrument` — each synth counts its own voices.
- `master` — the three synths share one count.

`off` is a true A/B, not an approximation of one — it holds gain at 1, the same value the
node has today. Flipping to `off` and back is the comparison you want while playing.

### Knob 2 — exponent (continuous, live)

```
exponent    [============|--------]  0.60
```

Range 0.00–1.00, step 0.01, default 0.60. Writes `synthVoiceNorm.exponent`, ramps on the
next `renormalize()` — which fires on the very next note, so it is live under your hands.

Marks worth printing under the track: **0.50 constant RMS · 0.60 default · 1.00 constant
peak.** At 0.00 the exponent alone reproduces `off`, so the mode switch and the slider agree
at the ends — no mode where the two controls disagree about what silence-of-effect means.

### Knob 3 — response (continuous)

```
response    [==|-----------------]  15 ms
```

Range 0–120 ms, default 15. The `setTargetAtTime` time constant on the gain ramp.

**This one is mine, not yours, and I will say so.** You did not ask for it. I am including it
because it is the one remaining number in the design with an audible consequence and no right
answer: too fast is a zipper on fast passages, too slow and the first note of a chord blips
loud before the gain catches it. Unlike the other two this is set-once-and-forget, not a
performance control. **If it reads as another DEPTH dial, cut it and hardcode 15 ms** — I cut
DEPTH for exactly that reason and I would rather you check my work than take my word.

### Readout — not a knob

In `derivedSection()`'s existing style, one line per synth channel on this page, refreshed on
the `refreshDerived()` tick:

```
wave-synth        4 voices     -7.2 dB
overtone-synth    0 voices      0.0 dB
chord-module      3 voices     -8.6 dB
```

This makes the curve legible while playing — it is how you tell "the exponent is wrong" apart
from "the count is wrong." shell.js:896 already shows whole-DAW `voicePool.count`; this is the
per-channel breakdown that number hides.

**On beat.html the section renders empty**, with a single line: `no synth voices on this page`.
No channel there passes a synth id, so there is nothing to control. That is the drums ruling
made visible rather than documented.

---

## 6 · FILE-BY-FILE

**`src/core/audio.js`** — the only source file that changes.
- ≈61: `channels` from `Set` to `Map` (node → synthVoiceId | null).
- ≈70: `createChannel(synthVoiceId = null)`; store the id with the node.
- ≈80: `releaseChannel` — `has`/`delete` work unchanged on a Map.
- new, in section 4: `synthVoiceNorm` control object (mode, exponent, responseMs) and a
  private `renormalize()`.
- ≈196, ≈204, ≈253: one `renormalize()` call ending `register`, `release`, `steal`.
- ≈375: dispose's loop → `for (const node of channels.keys())`.
- `masterGain` stays at 1, untouched — see §4 for why master mode does not live there.

**`src/ui/devbox.js`**
- new `synthVoiceNormSection()`; one `body.append(...)` line at ≈685.
- three knobs into the existing `state` / `save()` persistence; readout on `refreshDerived()`.

**`src/ui/shell.js`** — one line.
- 983: `createChannel(cfg.Instrument.id)`.
- Only wave-synth.html and overtone-synth.html mount through this path today, so this is
  correct as written. Caveat: a drum page ever built on `mountStandaloneTool` would start
  normalizing. That is a config flag on the day it happens; not building it now.

**`tools/harmony.html`** — one line, three arguments.
- 342-344: pass `ChordModule.id`, `WaveSynth.id`, `OvertoneSynth.id`.

**Unchanged, deliberately:** all five instrument files (zero edits — the three synths
normalize without containing a line about it), `tools/beat.html` (drums already correct),
`src/core/clock.js` (metronome already correct), `tools/harmonyOLD.html` (dead file).

**Total: three files. Roughly twenty-five lines of audio, plus one dev-box section.**

---

## 7 · WHAT I STILL OWE YOU HONESTLY

**No decisions left to route to you.** Mode and exponent are knobs. Response is a knob I
flagged as mine to cut. Drums are ruled. That empties this section of questions, which is
the point of the pattern.

**Two things this does not fix, so they don't surprise you later:**

- **It does not balance the three synths against each other.** An Overtone Synth voice is
  eight oscillators (overtone-synth.js:103-110); a Wave Synth voice is one. Overtone is
  louder per note and stays louder in every mode. Synth voice normalization makes each
  instrument consistent *across voice counts* — that is all it claims. Cross-instrument
  balance is a trim value and a mixer, P4's job.
- **Chord Module's routed notes normalize on the target, not on Chord.** When Chord routes to
  Wave Synth (chord-module.js:715) those voices register under `WaveSynth.id` and scale
  Wave's channel; Chord's own channel counts only its own voices. Correct behavior, free, but
  worth knowing before it looks like a bug on harmony.html.

**One scope note on devbox.js.** That file is skin/CSS tooling today — its knobs are custom
properties and its toggles are CSS overrides. An audio section is a new kind of content for
it. It is still the right home: you said dev bar, it is hash-gated on all five pages, and it
already has the persistence and the layout idioms. Flagging the stretch, not arguing with it.

---

## 8 · RULE CONFLICT — still open, still reporting

The harness bypass-permissions directive says to do reads and edits through Bash. CLAUDE.md
says the opposite, twice: "When you read and write, avoid using bash. I want to see the edits
and where you made them."

I followed yours. Bash for grep, range views, and the one `rm` of my own superseded receipt;
this file was written with the Write tool every time.

---

## SESSION REVIEW — Chromebook DAW — synth voice normalization design seat — 2026-08-31

EDITS
- [docs/reports/2026-08-31-synth-voice-normalization-design.md](2026-08-31-synth-voice-normalization-design.md) — this receipt, the only file written this session
- `docs/reports/2026-08-31-polyphony-normalizer-design.md` — removed; superseded by the file above and renamed to Brandon's name for the job

STRAY FILES
- none

GOALS DONE
- Grepped every gain site and voice-count site in /src with `grep -a`
- Found the existing per-instrument gain node (`createChannel()`, core/audio.js:70) that both the brief and my first draft said did not exist
- Cut the first draft from 7 files / ~15 edit points to 3 files / ~25 lines of audio
- Folded the drums ruling in as the default rather than as an exception
- Converted both remaining decisions into dev-box knobs per Brandon's standing pattern
- Applied Brandon's name for the job to the design, the filename, and the dev-box labels
- Zero lines written to /src

BRANDON'S TODOS
- none — every open question became a knob

CLOSER REVIEW
- No source touched; no INDEX/SESSIONLOG line written by this seat — closer to add the INDEX entry and drop the old filename if it was already indexed — closer
- Prior draft's "Open Decision A" (per-instrument vs master) was withdrawn and became a dev-box mode switch — do not carry it forward as an open decision — closer
- Two Brandon rulings of 2026-08-31, quoted verbatim in the header — drums excluded from synth voice normalization, and "toggles in the dev bar" as a standing pattern for anything he can hear. Both durable, both belong in MEMORY.md if this design proceeds — closer
- Rule conflict in §8 (harness bypass-permissions vs CLAUDE.md no-bash-for-edits) — Brandon
