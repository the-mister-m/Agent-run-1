# RECEIPT — scopes — P1/S3

Seat: `scopes`. Task: [A-scopes.md](A-scopes.md). Stage: [STAGE.md](STAGE.md).

---

## 2026-08-23 00:13 EDT — start

DELIVERABLE STATE: Read in full before writing a line: [A-scopes.md](A-scopes.md),
[STAGE.md](STAGE.md), [CONTRACTS.md](../../CONTRACTS.md) (§2 including the
`getAnalyser(which)` amendment, §8's `AnalyserNode` cost caveat, §9's token list, §10,
§11.4/§11.5/§11.6), [PHASE.md](../PHASE.md), [ROSTER.md](../../ROSTER.md), the frozen
[/src/core/audio.js](../../../src/core/audio.js), and `audio-core`'s receipt + test page
so this seat verifies to the same standard S2 set (real headless Chrome via Playwright,
not simulation). Confirmed `/src` held only `core/audio.js`; created `/src/vis/` and
`/src/ui/`. Confirmed the environment fact that bounds every claim I will make: **no audio
output device** (`outputLatency === 0`, findings-webaudio.md) — this seat reads
`AnalyserNode` byte data, never sound, so nothing here is verified by ear and nothing
claims to be.

Two things noted up front as bounded by my lane, not decided quietly:
1. Both visuals need the same ~80 lines of canvas/DPR/rAF/token scaffolding. A shared
   `vis/` base module is **outside my named lane** (STAGE.md's collision map lists exactly
   `spectrum.js`, `scope.js`, `tokens.css`), so the scaffolding is duplicated in the two
   files rather than extracted. Logged as an open decision, not done.
2. The palette is a **named escalation** and will ship provisional, flagged for Brandon.

NEXT ACTION: Answer Q1 — which visual goes with which synth, enforced in code.
OPEN DECISIONS: none recorded yet beyond the two notes above.
FILE LOCATIONS: no writes yet.

---

## 2026-08-23 00:33 EDT — Q1: which visual goes with which synth

DELIVERABLE STATE: **Spectrum analyzer → Wave Synth only. Oscilloscope → Overtone Synth
only.** Neither synth gets both. This is not enforced by convention or by a comment — it
is enforced by the constructors, because a rule that lives only in prose is a rule the
next seat "fixes":

- `Spectrum` calls `instrument.getAnalyser('spectrum')` and **throws** if it gets `null`.
  Overtone Synth returns `null` for that tap by contract (§11.5), so Overtone Synth
  **cannot be given a spectrum analyzer** — the wiring fails loudly at construction.
- `Scope` calls `instrument.getAnalyser('scope')` and throws on `null`. Wave Synth returns
  `null` for that tap by contract (§11.4), so Wave Synth **cannot be given an
  oscilloscope**.

The thrown messages name PHASE.md's inversion and point at the other file, so a seat that
hits one is told what the lesson is rather than just told "no". Verified live in real
Chrome 151/148 headless: `new Scope(waveSynth)` threw, `new Spectrum(overtoneSynth)` threw,
and both correct pairings constructed (test steps `inversion-wave-synth-refuses-
oscilloscope`, `inversion-overtone-synth-refuses-spectrum`, `correct-pairings-construct`,
all PASS).
NEXT ACTION: Answer Q2 — how they get data.
OPEN DECISIONS: none added this question.
FILE LOCATIONS: [/src/vis/spectrum.js](../../../src/vis/spectrum.js) (constructor) ·
[/src/vis/scope.js](../../../src/vis/scope.js) (constructor).

---

## 2026-08-23 00:34 EDT — Q2: how they get data

DELIVERABLE STATE: Through §2's `getAnalyser(which)` and nothing else. Each visual is
handed **the instrument** — never an `AudioNode`, never `ctx`, never an internal — and
calls `getAnalyser()` exactly once, in its constructor. Reads happen on rAF only, never on
the scheduler (§3's "two different loops and they never cross"): `getByteFrequencyData`
for the spectrum, `getByteTimeDomainData` for the scope, exactly as §11.6 names them.

§2's three prohibitions (never insert a node, never reconnect, never `dispose()` the
analyser) are held, and this seat added a fourth of its own: **it never mutates the
analyser's properties either.** `fftSize`, `minDecibels`, `maxDecibels` and
`smoothingTimeConstant` are read and adapted to, never written — they belong to the
instrument that created the node. `dispose()` on a visual drops its own references and
leaves the analyser untouched.

Verified two ways rather than asserted. (1) Each stand-in instrument was wrapped in a
`Proxy` that records every property read off it; after mounting and running, the recorded
set was **exactly `[getAnalyser]`** for both visuals — no visual reached into an
instrument for anything else (test step `data-only-through-the-tap`, PASS). (2) The
analyser's own properties were snapshotted before and after 40 frames of reading and were
byte-identical afterwards (test step `visual-does-not-mutate-the-analyser`, PASS).
NEXT ACTION: Answer Q3 — does the spectrum read as frequencies, not decoration.
OPEN DECISIONS: none added this question.
FILE LOCATIONS: [/src/vis/spectrum.js](../../../src/vis/spectrum.js) §5 (`_loop`) ·
[/src/vis/scope.js](../../../src/vis/scope.js) §5 (`_loop`).

---

## 2026-08-23 00:34 EDT — Q3: does the spectrum read as frequencies?

DELIVERABLE STATE: Log-frequency axis over the curriculum's stated range, **~30 Hz to
16 kHz**, labelled in Hz with the unit painted on the axis ("16k Hz"), plus a dB scale on
the vertical taken from the analyser's own declared window so the y axis is honest rather
than arbitrary. Linear FFT bins are mapped onto a log axis by precomputing each pixel
column's bin range once per resize and taking the **max** (not the mean) over each
column's bins — averaging is what smears a real partial into invisibility at the top end.

**A student can point at the fundamental**, which was the actual requirement. The
curriculum defines it as "lowest and loudest", so the detector collects every local maximum
within 20 dB of the loudest and takes the **lowest** of those, then refines the peak
position by parabolic interpolation so the readout is not quantised to a bin. It is drawn
as a full-height line labelled `FUNDAMENTAL 220.1 Hz`. Above it, peaks near k × f0 are
labelled `×2 ×3 ×4 …` — the harmonic series the curriculum names by number.

Verified live, measured not eyeballed:
- Axis labels actually painted in one frame: `16k Hz | 30 | 50 | 100 | 200 | 500 | 1k |
  2k | 5k | dB | human hearing ≈ 30 Hz – 16 kHz` (captured by spying on `fillText`).
- **Sine @220 Hz: fundamental at 220.1 Hz, 0 overtones, 1.4% of energy above the
  fundamental. Saw @220 Hz: fundamental at 220.1 Hz, overtones labelled ×2 ×3 ×4 ×5 ×6 ×7
  ×8, 95.9% of energy above the fundamental.** That is the sine-spike-versus-saw-overtones
  contrast the DONE-CHECK asks for, as a number.
- Across **4 waveforms × 4 pitches (110/220/440/880 Hz)** the detected fundamental was
  within **0.31%** of true, worst case. FFT bin width is 23.4 Hz at fftSize 2048 / 48 kHz.

Labels drop rather than overprint when they collide (interior ticks first, then high
overtone numbers) — an axis where "10k" and "16k Hz" print on top of each other is worse
than one tick short at ten feet, which is §9's stated test. Caught by looking at a
screenshot of the real render, not by reading the code.

**A MEASURED FINDING FOR `wave-voice` AND `overtone-voice`** — this one corrected me. My
first version asserted that any real synth signal blows past Web Audio's default
`maxDecibels` of −30 dBFS and renders as a solid block. **Measurement said otherwise and
the claim was rewritten.** Blink normalises the FFT by `fftSize`, so:
- one unity-gain saw voice peaks at about **−19.6 dBFS per bin**, not near 0;
- a six-note unity chord peaks about **−14.6 dBFS** and **pins 36 of 1024 bins** at the
  platform default, flattening the loudest partials into a ceiling exactly where a student
  is looking;
- `minDecibels −100 / maxDecibels −15` clips **nothing** on that chord and still uses
  **95%** of the byte range.
**Recommendation, not an imposition:** the synth seats should set `maxDecibels ≈ −15` on
their own `AnalyserNode`. A visual may not set it (§2). What the visual does instead is
**detect the clipping and say so on screen** in `--warn` text, so the failure is loud
rather than silent. Verified across a gain × range sweep that the detector fires exactly
when >2% of bins are genuinely pinned and stays quiet otherwise (test step
`saturation-detector-tracks-the-real-clipping`, PASS).
NEXT ACTION: Answer Q4 — does the oscilloscope show one repetition and hold still.
OPEN DECISIONS: analyser dB-window recommendation above is for the two synth seats to
take or refuse. Decider: `wave-voice` / `overtone-voice` / you. Not blocking — the visual
works either way and warns when it matters.
FILE LOCATIONS: [/src/vis/spectrum.js](../../../src/vis/spectrum.js) §6 (`_analyse`),
§7 (`_drawGrid`, `_drawMarkers`).

---

## 2026-08-23 00:34 EDT — Q4: does the oscilloscope show ONE repetition, and hold still?

DELIVERABLE STATE: Yes, and this is the half of the seat that needed the real engineering.
"A rolling, untriggered trace fails this seat" — so the trace is both **period-locked** and
**phase-locked**, by three mechanisms that have to work together:

1. **Period detection** — normalised autocorrelation. Cost matters because this runs inside
   a rAF frame on a Chromebook, and a naive full-rate search over a 2048-sample buffer is
   ~1M multiply-adds per frame. So it decimates to ~512 samples first (~16× cheaper), then
   refines at full sample rate over a ±1 decimated-lag neighbourhood so high notes keep
   their precision. Dividing every lag by the zero-lag energy leaves the triangular taper
   in place **on purpose**: it biases toward the shortest period that explains the signal,
   which is what prevents the classic octave-down error where a scope locks onto two
   repetitions and draws them both. The search runs every 4th frame once locked, and
   immediately on an RMS jump (a new note), so it costs no responsiveness.
2. **Triggering** — first rising zero crossing, with hysteresis so noise near zero cannot
   pick a different trigger point each frame, and **sub-sample interpolation** so the
   window start does not jitter by up to a sample per frame. Without the interpolation a
   high note visibly shimmers.
3. **The window is the period.** The screen spans exactly `period × cycles`, `cycles = 1`
   by default, which is literally the curriculum's "over the course of one repetition".
   The expanded view draws a bracket across the top reading **"ONE REPETITION — 4.54 ms"**,
   so the teaching object is in the picture and not just in the teacher's narration.

Verified live for **all four Wave Synth waveforms** (§11.4's `sine | triangle | square |
saw`) at 220 Hz, by measurement rather than by eye — the scope's drawn trace was captured
on 24 consecutive frames and compared pixel by pixel:

| wave | drift, triggered | same data untriggered | locked freq | \|start−end\| |
|---|---|---|---|---|
| sine | 0.0159 | 0.4969 | 221.0 Hz / 4.526 ms | 0.013 |
| triangle | 0.0149 | 0.3943 | 220.5 Hz / 4.536 ms | 0.002 |
| square | 0.0170 | 0.6236 | 220.2 Hz / 4.542 ms | 0.080 |
| saw | 0.0112 | 0.3310 | 220.2 Hz / 4.542 ms | 0.006 |

Drift is mean absolute change per pixel per frame on a −1..1 trace. **Triggered is ~19–40×
stiller than the identical data drawn untriggered**, and the untriggered column is measured
in the same run rather than imagined, so the trigger is demonstrably what is doing the
work. All four lock within 0.5% of the true 220.0 Hz / 4.545 ms. `|start−end|` is the
direct test of "one repetition": the last pixel lands back on the phase the first pixel
started at (test steps `scope-trace-holds-still-all-four-waveforms`,
`scope-locks-the-right-period`, `scope-window-is-exactly-one-repetition`, all PASS).

Honest edges: a signal with no stable pitch falls back to a fixed 8 ms sweep and **says
"free running — no stable pitch found"** in `--warn` rather than pretending to be locked;
silence draws a flat line labelled "no signal"; a quiet trace gets a display-gain boost
that is **always** labelled `×N` on screen, because auto-scaling amplitude without saying
so would lie about the "gain" the curriculum is asking students to look at.
NEXT ACTION: Answer Q5 — `tokens.css`.
OPEN DECISIONS: `cycles` is an option defaulting to 1. If a later phase wants two
repetitions on screen it is a deliberate argument, not drift. Decider: whoever owns that
phase. Not blocking.
FILE LOCATIONS: [/src/vis/scope.js](../../../src/vis/scope.js) §6 (`_estimatePeriod`,
`_findTrigger`, `_sampleAt`), §7 (`_draw`, `_drawReadout`).

---

## 2026-08-23 00:34 EDT — Q5: what is in `tokens.css` — **ESCALATION, AWAITING BRANDON**

DELIVERABLE STATE: [/src/ui/tokens.css](../../../src/ui/tokens.css) created, defining
**all 13** CONTRACTS §9 tokens and nothing else. Verified by resolving every one of the 13
through `getComputedStyle` in a real browser (test step
`tokens-css-defines-every-section-9-token`, 13/13, PASS), and both visuals were confirmed
to draw from the resolved tokens rather than any color literal (test step
`visuals-read-tokens-not-literals`, PASS).

> ### ⚠ THE PALETTE IS A PROPOSAL. IT IS NOT SETTLED, AND IT IS NOT MINE TO SETTLE.
> Color carries teaching meaning here — §4: "Students never memorize which numeral is
> minor; the color tells them." **Brandon decides this.** It ships so that no downstream
> seat is blocked, flagged provisional in the file's own header. Changing any value is a
> one-line edit that rebuilds nothing, because every surface reads the variable and no file
> hard-codes a color.

| token | value | role |
|---|---|---|
| `--bg` | `#0a0d13` | page ground |
| `--panel` | `#1b2332` | any raised surface |
| `--line` | `#3a485f` | borders, grid, axis rules |
| `--text` | `#f2f6fc` | anything a student reads |
| `--text-dim` | `#93a1b8` | axis labels, units, secondary readouts |
| `--deg-major` | `#ffb020` | warm amber — major triad |
| `--deg-minor` | `#3fd0ff` | cool cyan — minor triad |
| `--deg-dim` | `#ff57c8` | magenta — diminished/augmented, flagged |
| `--deg-altered` | `#c9a6ff` | violet — student moved this degree (§4) |
| `--accent` | `#34e5b4` | selection, focus, both visual traces |
| `--warn` | `#ff7a1a` | refusal, over-cap |
| `--meter-ok` | `#6ee05a` | meter below −6 dB (§10-B) |
| `--meter-hot` | `#ff3b30` | meter above −6 dB (§10-B) |

**The reasoning, so Brandon can overrule the parts he disagrees with individually:**

- **Major/minor is placed on the yellow↔blue axis on purpose.** It is the one distinction
  the curriculum cannot afford to lose, and yellow↔blue is the axis that survives
  red-green color blindness — roughly 6% of boys, i.e. most classes. Amber vs cyan stays
  **130 ΔE** apart under simulated deuteranopia. If Brandon changes one pair, changing this
  one costs the most.
- **Computed pairwise separation of the four degree colors** (CIE76 ΔE; >40 reads at a
  glance): worst case **47 normal / 41 deuteranopia**. Every pair clears it.
- **Contrast, computed:** every foreground token is **4.4:1 or better** on `--panel`
  (`--text` 14.5, `--accent` 9.8, `--deg-major` 8.6, `--deg-minor` 8.8, `--deg-altered`
  7.8, `--deg-dim` 5.6, `--meter-hot` 4.4 as a large fill).
- **`--bg` is a dark blue-slate, not black,** because a projector in a lit room crushes
  blacks; pure black plus ambient light reads as muddy grey and drags every dark value with
  it. Panels are separated from the ground by their `--line` border, **not** by fill
  brightness — `--bg`/`--panel` is only 1.23:1 and a washed-out projector will eat that.
  Every seat that draws a panel needs to know that.
- **The visuals deliberately use `--accent`, never a degree color**, so the degree palette
  keeps exactly one meaning and a student never learns a false association between a
  spectrum trace and "major".

**What is a DESIGN CLAIM, not a measured fact:** §9's actual test is "reads from ten feet
away on a projector in a lit room." **That test has not been run — there is no projector
here.** The contrast ratios and ΔE separations above are computed and real; the room test
is Brandon's, in a classroom, and I am not going to dress the arithmetic up as having
passed it.

**Still recommended and NOT this seat's to build:** P3's surfaces should carry a redundant
**non-color** cue for dim/augmented (the ° / + glyph) and for altered (the +/− the student
moved, per §4's `altered` field). Four categories cannot be hue-separated for every viewer;
a glyph closes the gap color cannot.
NEXT ACTION: Answer Q6 — compact versus expanded.
OPEN DECISIONS: **the entire palette. Decider: Brandon.** Named in the brief as this
seat's escalation. Not blocking anyone — the file is complete and usable today.
FILE LOCATIONS: [/src/ui/tokens.css](../../../src/ui/tokens.css).

---

## 2026-08-23 00:35 EDT — Q6: compact versus expanded

DELIVERABLE STATE: Same analyser, same data, two budgets. Both visuals expose
`mountCompact(el)` and `mountExpanded(el)` matching §2's shape, so `tone-shell` calls
`mountExpanded` on the standalone pages and P4's DAW calls `mountCompact`.

| | compact (DAW) | expanded (standalone) |
|---|---|---|
| height | 96 px | 300 px |
| redraw | throttled to 20 fps | every rAF frame |
| spectrum | Hz axis + fundamental readout | + dB axis, ×k overtone labels, peak-hold, range caption |
| scope | trace + readout | + amplitude labels, "ONE REPETITION" bracket, CRT persistence |
| line weight / type | thin, small | heavier, larger |

**An interpretation I am flagging rather than burying:** §9 says "Standalone views may
animate. DAW views stay still." A live analyzer cannot be literally frozen or it teaches
nothing, so I read "still" as **nothing moves that is not the data itself** — no peak-hold
decay, no phosphor persistence, no eased transitions — plus a throttled redraw so a DAW
full of compact visuals is not spending the frame budget on decoration. If Brandon or you
meant something stricter, this is a small change in one constant table per file.

Verified live: **spectrum 59.9 fps expanded vs 18.0 fps compact; scope 59.9 vs 18.0** over
a one-second window — the throttle is real, not claimed (test step
`compact-is-cheaper-than-expanded`, PASS). Legibility was checked separately, because
"cheap" must not mean "unreadable": compact still paints `10k Hz | 100 | 1k | 220 Hz` —
the Hz axis and the fundamental readout survive, and 17 other labels are dropped (test step
`compact-is-legible-not-just-small`, PASS).
NEXT ACTION: Answer Q7 — zero cost when unmounted.
OPEN DECISIONS: the reading of "still" above. Decider: you/Brandon. Not blocking.
FILE LOCATIONS: [/src/vis/spectrum.js](../../../src/vis/spectrum.js) §1 (`MODES`), §2
(`mountCompact`/`mountExpanded`) · [/src/vis/scope.js](../../../src/vis/scope.js) §1, §2.

---

## 2026-08-23 00:35 EDT — Q7: do they cost nothing when unmounted?

DELIVERABLE STATE: Nothing runs after `unmount()`, and nothing runs while hidden.

- One rAF loop per instance. `unmount()` calls `cancelAnimationFrame`, zeroes the handle,
  and the loop's first line returns early if the mode is null — so an in-flight callback
  cannot re-arm itself. It also disconnects the `ResizeObserver` and the
  `IntersectionObserver` and removes the DOM it created (only what it created).
- The loop re-arms **before** drawing, so an exception in a draw cannot silently kill the
  animation; and it re-arms only while mounted, so unmount is still exactly zero.
- **A hidden but still-mounted visual also stops.** rAF stops for a hidden *tab* on its
  own, but it does **not** stop for an element in a collapsed panel or scrolled out of
  view — which is precisely the DAW case, and precisely where "the governor is watching"
  bites. An `IntersectionObserver` pauses the analyser read and the draw when the canvas
  is not intersecting.
- Buffers are allocated once in the constructor and reused; there is no per-frame garbage
  in a 60 Hz loop.
- `dispose()` unmounts and drops references. Per §2 it **never** disconnects or disposes
  the analyser — that node is the instrument's.

Verified by **frame count, not by eye**, as the DONE-CHECK requires: over ~600 ms (~36 rAF
ticks) after unmounting all four mounted visuals, the frame counters moved by **0 / 0 / 0 /
0** (test step `unmount-stops-every-frame`, PASS); containers were empty, rAF handles were
0, and both observers were disconnected (test step `unmount-removes-its-dom-and-observers`,
PASS); a visual mounted inside a `display:none` host drew **0 frames over 600 ms** (test
step `hidden-but-mounted-visual-does-not-burn-frames`, PASS); and a re-mount after unmount
resumed drawing normally, proving unmount is a stop and not a break (test step
`remount-works-after-unmount`, PASS).

**THE STANDING MEASUREMENT §8 AND §11.6 ASSIGN THIS SEAT.** §8 prices `AnalyserNode` at
**2 cost units** and says plainly that this is "a floor, not a measurement" because recon's
offline render never called the read function, and instructs this seat to measure the real
read-every-frame cost. Measured, 240 frames each, fftSize 2048, 48 kHz, headless Chromium
148 on an Apple M4 Max:

| what | measured |
|---|---|
| `getByteFrequencyData()` (spectrum) | **0.031 ms/frame** |
| `getByteTimeDomainData()` (scope) | **0.0017 ms/frame** |
| burst of 4000 back-to-back frequency reads | 0.0053 ms each — **cached FFT, copy cost only** |
| spectrum draw | 0.091 ms/frame |
| scope draw | 0.118 ms/frame (period search 0.195 ms × 60 runs) |

**The finding that matters more than the number: §8's `AnalyserNode = 2` is not wrong, and
it is also not the cost that will hurt you.** The two are different currencies and must not
be added together:
- §8's table is **audio-thread render cost**, measured by `OfflineAudioContext`. An
  analyser sitting in the graph really does cost about that, and nothing here changes it.
- The FFT for `getByteFrequencyData()` runs **on the main thread, inside the call**, at
  read time — it is not part of the audio render quantum. The burst figure being ~6×
  cheaper than the per-frame figure is that caching showing up: back-to-back reads inside
  one render quantum skip the transform and only copy.
- Therefore the real cost of *reading* an analyser lands in rAF, and **§8's governor probe
  structurally cannot see it** — that probe times the scheduler pass, and §3 keeps visuals
  and scheduler in separate loops on purpose. This is a second blind spot alongside the
  audio-thread one §8 already documents. Flagged for you and for P4's `governor` seat; I am
  not proposing a §8 edit, that is not a BUILD seat's call.
- Practical scale: a full expanded pair costs about **0.24 ms/frame** of main-thread time
  here, ~1.5% of a 16.7 ms frame. Compact at 20 fps costs a third of that. **On a
  Chromebook this will be several times higher and is UNVERIFIED** — same standing caveat
  §3 carries about the 100 ms window.

NEXT ACTION: none for the seven questions — DONE-CHECK below, then handoff.
OPEN DECISIONS: whether the governor should account for rAF-side visual cost at all.
Decider: P4's `governor` seat / you. Not blocking P1.
FILE LOCATIONS: [/src/vis/spectrum.js](../../../src/vis/spectrum.js) §2 (`unmount`,
`dispose`), §5 (`_loop`), §3 (`stats`) · [/src/vis/scope.js](../../../src/vis/scope.js)
same sections.

---

## 2026-08-23 00:35 EDT — DONE-CHECK, and the seat closes

DELIVERABLE STATE: **DONE-CHECK run for real in headless Chromium 148 via Playwright, not
simulated. 24 of 24 checks passed.** The throwaway page is
[test-scopes.html](test-scopes.html), served from a static file server at the project root
(`python3 -m http.server`, page at
`/Builddocs/P1-tone-tool/S3-voices-surfaces/test-scopes.html`). It imports only the three
files this seat owns plus the frozen `/src/core/audio.js`, and **defines no instrument** —
its two test sources implement exactly one method, §2's `getAnalyser(which)`, one offering
only the spectrum tap and one only the scope tap, mirroring §11.4/§11.5. They exist because
`wave-synth.js` and `overtone-synth.js` belong to seats running in parallel with me right
now and I must not touch them.

Against the DONE-CHECK line by line:
- *Both visuals mount against a test signal* — yes, all four views (expanded and compact of
  each) mount and run live on the page.
- *Spectrum labels Hz and clearly shows a saw's overtones against a sine's single spike* —
  yes: axis reads `30 · 50 · 100 · 200 · 500 · 1k · 2k · 5k · 16k Hz`; sine gives 0
  overtones and 1.4% of energy above the fundamental, saw gives ×2…×8 labelled and 95.9%.
- *Oscilloscope holds a stable single-repetition trace for all four Wave Synth waveforms* —
  yes: sine/triangle/square/saw all lock within 0.5% of 220 Hz, drift 0.011–0.017 against
  0.33–0.62 for the same data untriggered.
- *`tokens.css` defines every §9 token* — yes, 13/13 resolved in a real browser.
- *Unmounting stops all animation frames, verified by frame-count* — yes, 0 frames over
  ~36 rAF ticks, plus 0 frames for a hidden-but-mounted visual.

**WHAT IS UNVERIFIED, and stays that way — same discipline as findings-webaudio.md:**
1. **Anything heard.** No audio output device exists here. Every number above is
   `AnalyserNode` data. This seat never claims to have listened to anything.
2. **Ten-foot projector legibility in a lit room** — §9's actual test for the palette. No
   projector. Contrast ratios and color separations are computed and real; the room test is
   a **design claim** and is Brandon's to run.
3. **Chromebook performance.** All timings are an Apple M4 Max. A Chromebook drawing a
   spectrum, a scope and a piano roll on one thread will be materially worse. Same standing
   caveat §3 already carries.
4. **Behaviour against the real synths.** Both visuals were verified against stand-ins
   implementing §2's tap, because the real instruments do not exist yet. The contract
   surface is one method, so the risk is low — but it is not zero, and `tone-shell` (S4) is
   the first seat that will see the real pairing.
5. **Whether 8 partials of an Overtone Synth produce a scope-lockable waveform.** Tested
   against single oscillators, not summed partials. A stack whose fundamental is muted may
   legitimately lock to a higher partial — that is arguably correct behaviour, but it is
   untested and `overtone-voice`/`tone-shell` should look at it.

**WHAT IS MISSING / LEFT TO DO, for the seats after me:**
- `tone-shell` (S4) wires `Spectrum` → Wave Synth and `Scope` → Overtone Synth, calling
  `mountExpanded`. The constructors will throw if it wires them the other way round; that
  is deliberate, and the message says what to do.
- `wave-voice` / `overtone-voice` should set `maxDecibels ≈ −15` on their own
  `AnalyserNode` (measured recommendation, Q3). The visual warns on screen if they do not.
- P3's surfaces should add the redundant non-color cue for dim/altered (Q5).
- The palette awaits Brandon.

NEXT ACTION: none — seat is done. Handoff delivered, one state-change message going to
`agent-run-1-76` (session driver, who has taken the Troubleshooter role — `agent-run-1-70`
is no longer reachable). Not building meters, not building gain-reduction displays, not
looking for more work.

OPEN DECISIONS, consolidated:
1. **The palette — decider: BRANDON.** The named escalation for this seat. Proposed in
   full above and in the file header, shipped provisional so nothing is blocked.
2. **Analyser dB window** (`maxDecibels ≈ −15`) — decider: `wave-voice` / `overtone-voice`
   / you. Measured recommendation; the visual cannot set it (§2) and warns instead.
3. **The reading of §9's "DAW views stay still"** as "no motion that is not the data, plus
   a 20 fps throttle" — decider: you/Brandon. One constant table per file.
4. **Whether the governor should account for rAF-side visual cost**, which its
   scheduler-pass probe structurally cannot see — decider: P4's `governor` seat.
5. **A shared `vis/` base module.** Both files duplicate ~80 lines of canvas/DPR/rAF/token
   scaffolding because a third file is outside my named lane (STAGE.md collision map).
   Decider: whoever owns `vis/` in P4, if the duplication ever bites.
None of the five block S4.

FILE LOCATIONS:
- [/src/vis/spectrum.js](../../../src/vis/spectrum.js) — spectrum analyzer, Wave Synth only
- [/src/vis/scope.js](../../../src/vis/scope.js) — oscilloscope, Overtone Synth only
- [/src/ui/tokens.css](../../../src/ui/tokens.css) — all 13 §9 tokens, palette PROVISIONAL
- [test-scopes.html](test-scopes.html) — the DONE-CHECK page, throwaway, in this seat's own
  stage folder
- this receipt

**LANE CHECK:** three files written, all three named in my brief. Nothing touched in
`/src/vis/meter.js` or `/src/vis/gain-reduction.js` (P4's), either synth, either input
file, any HTML page outside my own stage folder, or CONTRACTS.md.

---

## 2026-08-23 00:37 EDT — addendum: verified against the REAL synths

DELIVERABLE STATE: `wave-voice` and `overtone-voice` landed their files while I was
finishing. Rather than hand `tone-shell` an integration risk I had listed as UNVERIFIED, I
ran my two visuals against the **real** `wave-synth.js` and `overtone-synth.js` — read-only
on their side, no file of theirs touched, throwaway harness in my scratchpad and deleted
after. **Everything holds:**

- Taps match §11.4/§11.5 exactly: `wave.getAnalyser('spectrum')` → `AnalyserNode`,
  `wave.getAnalyser('scope')` → `null`; `over.getAnalyser('scope')` → `AnalyserNode`,
  `over.getAnalyser('spectrum')` → `null`.
- Wrong pairings refused: `new Scope(WaveSynth)` threw, `new Spectrum(OvertoneSynth)`
  threw. **The inversion is enforced against the real instruments, not just stand-ins.**
- Real Wave Synth, `osc.wave='saw'`, note 57 (A3, 220 Hz): spectrum found the fundamental
  at **222.7 Hz** and labelled overtones **×2 ×3 ×4 ×5 ×6 ×7 ×8**.
- Real Overtone Synth, 8 partials at levels 0.6/k, note 57: scope **locked**, **220.2 Hz /
  4.542 ms** against a true 4.545 ms — so a summed partial stack triggers and holds still,
  which retires UNVERIFIED item 5.
- Unmount against the real synths: **+0 frames** for both after unmount.

**The dB-window finding is now confirmed on the real instruments, not inferred.** Both
synths create their `AnalyserNode` at **`minDecibels=-100, maxDecibels=-30`** — the Web
Audio defaults; neither sets them. Measured on the real Wave Synth: a **six-note chord pins
21 of 1024 bins** and my on-screen warning fires. It is also visible on a single saw note —
the top of the fundamental and the first partials render as a flat ceiling at −30 dB.
**Recommendation stands and is now concrete: both synth seats should set
`maxDecibels ≈ -15` on their own analyser.** One line each, in their file, not mine. I did
not touch it (§2), and the visual degrades loudly rather than silently if nobody does.

UNVERIFIED items 4 and 5 from the DONE-CHECK entry above are **retired**. Items 1 (nothing
heard), 2 (projector/ten-foot legibility — Brandon's room test), and 3 (Chromebook
performance) stand unchanged and are not retirable from this machine.
NEXT ACTION: none. Seat closed after the state-change message.
OPEN DECISIONS: unchanged — the five above, with #2 upgraded from "recommendation" to
"confirmed live on both real synths, one line each to fix".
FILE LOCATIONS: unchanged. The integration harness was scratchpad-only and is gone;
nothing was added to `Builddocs/` or `/src/` beyond the files listed above.
