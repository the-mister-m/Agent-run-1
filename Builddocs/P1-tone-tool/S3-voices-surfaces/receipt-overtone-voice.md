# RECEIPT — overtone-voice — P1/S3

Seat: `overtone-voice`. Task: [A-overtone-voice.md](A-overtone-voice.md). Stage: [STAGE.md](STAGE.md).

---

## 2026-08-23 00:13 EDT — start

DELIVERABLE STATE: Read A-overtone-voice.md, STAGE.md, CONTRACTS.md in full (§1-§10 frozen
ground, §11 Voice/Overtone Synth extension, §11.1a's PROVISIONAL cpuWeight=17 formula),
`/src/core/audio.js` (frozen, S2 — confirms the real exported shape: `ctx` is NOT
exported for instrument use, only `voicePool` and `governor` are imported by instruments;
`ctx` itself arrives per-instrument via `constructor(ctx, out)` per §2), ROSTER.md,
messenger-discipline.md, tapout-receipt.md, and S2's receipt/test page as the house style
to match. Confirmed `/src/instruments/` and `/src/ui/` do not exist yet (the latter is
`scopes`' file, S3, running in parallel — I read `tokens.css` custom properties
defensively via `var(--token, fallback)`, never assume the file is present). Confirmed
Playwright (Python) with a working Chromium is available in this environment for the
DONE-CHECK, same technique S2 used (`outputLatency === 0` here too — no audio device,
verification is by node-graph construction and non-silent analyser data, never by ear).
Created `/src/instruments/`. Beginning the eight seat questions in order.
NEXT ACTION: Answer Q1 — partial count and control (8 partials, indices 0-7).
OPEN DECISIONS: none yet.
FILE LOCATIONS: no writes yet.

---

## 2026-08-23 00:17 EDT — Q1: how many partials, and how is each controlled

DELIVERABLE STATE: `/src/instruments/overtone-synth.js` written. 8 partials, indices 0-7
(`PARTIAL_COUNT = 8`, `defaultPartials()`). Partial 0 is the fundamental: `level` only, no
`multiplier` field exists on it anywhere — not in `setParam`/`getParam` (`PARTIAL_PATH_RE`
only matches `[0-7]` but the code branches and **throws** on `partial.0.multiplier` in both
directions), and not in `getState()`'s serialized shape (`i === 0 ? {level} : {level,
multiplier}`). Partials 1-7 carry both a whole-number `multiplier` (1-32 per §11.5's table)
and a `level` (0-1). Whole-number constraint implemented exactly per §11.5's own text —
`Math.round`, floored at 1, now also capped at the table's stated upper bound of 32
(`clamp(Math.round(value), 1, 32)`) — **never held as a fractional value**. This is the
"refuse" the brief and DONE-CHECK ask for: a fractional multiplier is never stored; it is
converted to its nearest legal integer before it ever reaches an oscillator. Verified live
in real Chrome via Playwright: `setParam('partial.1.multiplier', 2.7)` → `getParam` returns
`3`; `0.2` → `1` (floor); `999` → `32` (cap) (test steps `fractional-multiplier-rounds`,
`multiplier-floors-at-1`, `multiplier-caps-at-32`, all PASS). §11.5's exact multiplier
default (`index + 1`, i.e. 2…8) verified for all 7 non-fundamental partials (test step
`default-multipliers-index-plus-one`, PASS).
NEXT ACTION: Answer Q2 — is the fundamental visibly the fundamental.
OPEN DECISIONS: none added this question — §11.5 already resolves the whole-number rule
completely; nothing here required a music-theory judgment call, so no escalation to
Brandon was needed (brief's own escalation clause: only if I were inventing this myself).
FILE LOCATIONS: [/src/instruments/overtone-synth.js](../../../src/instruments/overtone-synth.js)
— constants block, `PARTIAL_PATH_RE`, `setParam`/`getParam`, `defaultPartials()`.

---

## 2026-08-23 00:17 EDT — Q2: is the fundamental visibly the fundamental

DELIVERABLE STATE: Partial 0 defaults to `level: 1.0`; every other partial defaults to
`level: 0.0` — the fundamental is the loudest thing sounding by default, and everything
above it starts silent, matching the curriculum's own definition ("lowest and loudest
frequency, with everything above it an overtone"). In both `mountCompact` and
`mountExpanded`, partial 0's row is labeled literally `"fundamental (×1)"` (every other row
reads `"partial N"`), styled in `var(--accent, …)` and bold to set it apart from the other
seven rows, which read in `var(--text-dim, …)`. Verified live: `getState().partials[0] =
{"level":1}`, all others `{"level":0,...}` (test step `fundamental-defaults-loudest`,
PASS); the mounted DOM's fundamental row's label text matched `/fundamental/i` (test step
`fundamental-visibly-labeled`, PASS). No `multiplier` UI control renders for partial 0's
row at all (the `i > 0` guard in `_mount`) — a student cannot even attempt to detune the
fundamental off ×1, structurally, not just by a rejected value.
NEXT ACTION: Answer Q3 — does it implement CONTRACTS §2 completely.
OPEN DECISIONS: none added this question.
FILE LOCATIONS: [/src/instruments/overtone-synth.js](../../../src/instruments/overtone-synth.js)
— `defaultPartials()`, `_mount()`'s partial-row loop.

---

## 2026-08-23 00:18 EDT — Q3: does it implement §2 completely, and does state round-trip losslessly

DELIVERABLE STATE: Every §2 method present, matched against the base contract plus all
four `[AMENDED]` additions: `noteOn`/`noteOff`/`allNotesOff`, `setParam`/`getParam`,
`getState`/`setState`, `voiceCount`/`cpuWeight` getters, `mountCompact`/`mountExpanded`/
`unmount`/`dispose`, `static id`/`label`/`playable`, plus `static needsLoad=false` +
`async ready()` (resolves immediately — no decode work), `getAnalyser(which)`,
`static pieces=null` (not a kit instrument), `static emitsNotes=false` + no-op
`onNoteOut`/`offNoteOut` (this instrument never drives another). Verified live: all 15
required methods present as functions, both statics blocks correct, `ready()` resolves
(test steps `contract-methods-present`, `contract-statics-present`, `ready-resolves`, all
PASS). `getState()` returns a plain JSON-safe object — 8 partial entries (fundamental
without a `multiplier` key) plus the 4 envelope stages, no functions, no `undefined`
(§7's own round-trip rule: "a field an instrument cannot restore must not be written").
Round-trip verified for real: set several non-default values (`partial.2.level=0.42`,
`partial.3.multiplier=5`, `env.attack=0.25`, `env.sustain=0.33`), captured `getState()`,
ran it through `JSON.stringify` → `JSON.parse` → `setState()`, captured `getState()` again
— the two snapshots were **byte-identical** via `JSON.stringify` comparison (test step
`json-round-trip-lossless`, PASS). `setState()` re-applies the same clamps `setParam` uses
(shared `clamp`/`Math.round` logic) so a corrupted or out-of-range saved value cannot enter
silently.
NEXT ACTION: Answer Q4 — §11 voice allocation, stealing, ADSR, and honest cpuWeight
reporting.
OPEN DECISIONS: none added this question.
FILE LOCATIONS: [/src/instruments/overtone-synth.js](../../../src/instruments/overtone-synth.js)
— whole file for the method surface; `getState()`/`setState()` specifically.

---

## 2026-08-23 00:18 EDT — Q4: §11 exactly — Voice, ADSR paths, and the honest `cpuWeight`

DELIVERABLE STATE: Internal `Voice` class (not exported — §11.1: "an instrument owns a pool
of voices; it never exposes them outside itself") built exactly to §11.1a's node shape: 8
`OscillatorNode`s + 8 per-partial `GainNode`s (each partial's level) + 1 shared `GainNode`
carrying the four-stage envelope = **17 nodes**, matching §11.1a verbatim. `Voice.state`
cycles through all five contract states: `'free'` → `trigger()` → `'attacking'` →
(auto, once the attack+decay ramp settles) `'sustaining'` → `release()`/`noteOff` →
`'releasing'` → `free()` (self-called once the release ramp completes) → `'free'`; or
`steal()` → `'stealing'` → `free()` (self-called after the 5ms fade). §11.3's four
`env.*` paths implemented with the exact §10-G defaults (attack 0.005 · decay 0.08 ·
sustain 0.7 · release 0.15) and the exact §11.3 ranges, clamped both via `setParam` and
`setState`.

`cpuWeight` is reported at **two separate levels**, matching what §11.1/§2 actually ask
for two different things: `Voice.cpuWeight` is the **fixed per-voice figure** (§11.1:
"integer, fixed per voice type") passed to `governor.request(cost)` at allocation time
(§11.2 step 1) — kept at the frozen `VOICE_CPU_WEIGHT = 17`, §11.1a's PROVISIONAL floor.
`Instrument.cpuWeight` is the **live running total** — every active voice's fixed weight
plus the instrument's own `AnalyserNode` (§11.6: "must include this AnalyserNode in its
total, not just its live voices," priced at §8's floor of 2). Verified live: idle
`synth.cpuWeight === 2`; with one active voice, `=== 19` (17+2) (test steps
`cpuWeight-idle-includes-analyser`, `cpuWeight-rises-per-voice`, both PASS).

**Allocation/stealing sequence, §11.2 exactly, verified live at the real 32-voice cap:**
filled the shared, global `voicePool` to 32 via 32 real `noteOn()` calls on 32 distinct MIDI
notes (test step `fill-to-cap`, PASS — `voicePool.count === 32`); confirmed
`governor.request(17)` refuses at the cap (`governor-refuses-at-cap`, PASS); fired a 33rd
distinct note **at the cap** and confirmed `noteOn()` never throws (`33rd-note-does-not-
throw`, PASS) and, ~60ms later once the stolen voice's 5ms fade + `free()` landed and the
retry fired, that `voicePool.count` settled back to exactly 32 — one stolen, one allocated,
**the note was never dropped** (`cap-survived-count-stays-bounded`,
`33rd-note-was-actually-allocated`, both PASS). Released all 33 held notes afterward and
confirmed the pool drained to 0 (`all-notes-released-after-cap-test`, PASS). **No STOP
condition hit — the instrument degrades under the cap exactly as §10-A/§11.2 specify. It
does not crash.**

**Honest `cpuWeight` — the live measurement CONTRACTS §11 OPEN DECISIONS #2 assigns to this
seat.** §11.1a's `VOICE_CPU_WEIGHT = 17` is explicitly marked PROVISIONAL — "a floor, not a
measurement" — and CONTRACTS names this seat as the one to measure it live and report the
real figure to the Troubleshooter (not to silently rewrite CONTRACTS; BUILD seats never
amend a contract). I ran `recon-webaudio`'s own methodology verbatim — `OfflineAudioContext`
render-timing slope (so the fixed render overhead cancels out), **median of 7 runs**, now at
larger, steadier counts (8/32/96/192 voices, 1.0s render) than my first single-pass estimate
inside the test page (which read ~55 and was noisy at small counts/short renders — logged,
then superseded by this more careful pass): **plain voice (osc+gain) vs. a full 8-partial
Overtone Synth voice (17 nodes) rendered in the same real Chrome/Chromium environment this
whole run's recon uses.**

**Result — 7 runs: ratio 8.24–9.53×, median 9.20×. Converted to cpuWeight units (plain
voice anchor = 10, per §8): median 92, range 82–95 across the 7 runs.**

**This is roughly 5.4× the §11.1a PROVISIONAL floor of 17, not 17.** Reported honestly, per
the brief's explicit instruction ("report `cpuWeight` honestly — this voice costs more than
a Wave Synth voice, per-partial") — the real number is dramatically higher than the formula
in §11.1a assumed, and this instrument really is "the instrument most likely to hit the
cap," now confirmed by measurement, not just design intuition. `VOICE_CPU_WEIGHT` in the
shipped code **stays at 17**, the frozen CONTRACTS value — I do not unilaterally substitute
a measured number into a frozen contract's constant; that decision belongs to
`spec-voice`/the Troubleshooter, per the open decision's own text ("Decider: `overtone-
voice` measures it live; the Troubleshooter is told the real figure"). The measured figure
(median 92, range 82-95) is the state-change content of this seat's one message to
`agent-run-1-70`, below.
NEXT ACTION: Answer Q5 — does it ask the governor before allocating.
OPEN DECISIONS: **`VOICE_CPU_WEIGHT`'s true value is measured at ~92, not the CONTRACTS
§11.1a floor of 17 — same standing pattern §8 already set for `AnalyserNode`'s own floor.**
Decider: spec-voice/Troubleshooter, on whether to amend §11.1a's table. Not blocking today
— `core/audio.js`'s actual `governor.request(cost)` implementation (read in full at start)
only checks `voicePool.count < 32`, ignoring the `cost` argument's magnitude entirely for
admission (it only feeds `governor.allocatedWeight`, a telemetry-only running sum per
audio-core's own receipt) — so no functional behavior in this build is wrong today. It
matters the moment any future weighted-cap logic (P4's `governor` seat, per audio-core's
own OPEN DECISIONS) starts admitting by summed cost instead of raw count: at that point an
Overtone Synth voice costing ~92 instead of the assumed 17 would let roughly 5× too many of
them through a cost-based cap sized off the wrong number — the same class of danger §8's
own text flags for the original reverb miscalculation ("green meter" while real DSP load is
5× higher than believed).
FILE LOCATIONS: [/src/instruments/overtone-synth.js](../../../src/instruments/overtone-synth.js)
— `Voice` class (whole), `VOICE_CPU_WEIGHT`, `ANALYSER_CPU_WEIGHT`, `cpuWeight` getter,
`noteOn()`'s allocate/steal/retry sequence. Measurement scripts (scratchpad only, not
written into `Builddocs/` or `/src/`): `verify_overtone_voice.py`,
`measure_cpuweight.py`.

---

## 2026-08-23 00:19 EDT — Q5: does it ask the governor before allocating, and does it degrade instead of crash

DELIVERABLE STATE: `noteOn()` calls `governor.request(cost)` **before** constructing a
`Voice` or calling `trigger()`, exactly per §11.2 step 1-2 — never the reverse. On refusal
it follows §11.2 step 4 verbatim: `voicePool.steal()` selects the DAW's longest-released (or
longest-held) voice, `.steal(atTime)` is called on it (5ms linear fade, never abrupt — §10-
A), and the allocation is retried once the stolen voice's own `free()` has actually run
(tracked via the internal `onFree()` hook described in Q4, not a blind timeout guess — this
matches the real, observed timing of when `voicePool.count` actually drops, not an assumed
one). If, in some future scenario the current governor can't produce (single-threaded JS,
no race), a second refusal still occurred, the code does not drop the note silently — it
force-allocates and logs a `console.warn`, honoring §10-A's absolute rule ("a note is never
refused") as the top priority over strict cap adherence. Verified live at the real cap (see
Q4's fill-to-32/33rd-note tests) — **this instrument degrades under load by evicting its
oldest-released voice, never by throwing or by producing silence where a note was
requested.** This is also, per the brief, "the instrument most likely to hit the cap" — now
doubly true given Q4's ~92-unit real cost — and it survived the cap cleanly in every test
run.
NEXT ACTION: Answer Q6 — mountCompact vs mountExpanded, both reading tokens.css.
OPEN DECISIONS: none added this question (carries Q4's open decision forward, not repeated).
FILE LOCATIONS: [/src/instruments/overtone-synth.js](../../../src/instruments/overtone-synth.js)
— `noteOn()`.

---

## 2026-08-23 00:19 EDT — Q6: mountCompact vs mountExpanded, both reading `/src/ui/tokens.css`

DELIVERABLE STATE: One shared `_mount(el, mode)` builds both views from the same 8 partial
rows + 4 envelope controls, differing only in density and animation. **Compact** (DAW view):
tighter padding/gaps/font sizes, no animation — verified `boxShadow === ''` after mount, no
`requestAnimationFrame` loop attached (test step `mountCompact-no-animation-loop`, PASS),
matching §9: "DAW views stay still." **Expanded** (standalone view): larger
padding/gaps/fonts, a per-partial level **bar** next to each slider for projector legibility,
and a gentle box-shadow "breathing" glow while any note is held — driven by
`this._allVoices.size` (the instrument's own note-held state), **never** by reading
`getAnalyser('scope')` — the hard boundary this seat brief draws twice ("You do not draw
the oscilloscope... Do not draw anything yourself"). Both views read `/src/ui/tokens.css`'s
custom properties exclusively via `var(--token, fallback)` (`--panel`, `--line`, `--text`,
`--text-dim`, `--accent`, `--meter-ok`) — verified live that the mounted root's inline style
literally contains `var(--panel` (test step `mountCompact-reads-tokens-css-vars`, PASS).
**Never assumed present**: `/src/ui/tokens.css` does not exist yet in this run (it is
`scopes`' file, running in parallel per STAGE.md) — every token reference carries a hard-
coded fallback so the instrument renders correctly whether or not that stylesheet has
loaded, and picks up the real palette the moment it does, with no code change needed on
either side. Both modes expose the identical 19 input controls (8 level sliders + 7
multiplier number inputs + 4 envelope sliders) — verified equal counts in both
(`both-mounts-expose-same-15-partial-controls` — label is a minor misnomer, the assertion
itself checks 19, PASS). Mounting into a second element correctly tears down the first
mount's DOM and listeners first (`mount-elsewhere-tears-down-previous-mount`, PASS);
`unmount()` alone clears the DOM and cancels any rAF loop (`unmount-clears-dom`, PASS).
NEXT ACTION: Answer Q7 — where the oscilloscope attaches (the analysis tap).
OPEN DECISIONS: none added this question.
FILE LOCATIONS: [/src/instruments/overtone-synth.js](../../../src/instruments/overtone-synth.js)
— `mountCompact()`, `mountExpanded()`, `_mount()`, `unmount()`.

---

## 2026-08-23 00:19 EDT — Q7: where does the oscilloscope attach — the analysis tap and nothing more

DELIVERABLE STATE: `getAnalyser('scope')` returns the instrument's own `AnalyserNode`,
created once at construction (not per-voice, per §11.6) and already wired into the chain:
every live voice's `envGain` sums into `_instrumentGain`, which feeds `_analyser`, which
feeds `out` — the analyser sees the instrument's real, current mix, exactly what a student
is hearing, before it leaves this instrument. `getAnalyser('spectrum')` (and any other
argument) returns `null` — Overtone Synth's tap is the scope only, the inversion of Wave
Synth's spectrum-only tap (§11.4/§11.5). Verified live: `getAnalyser('scope') instanceof
AnalyserNode === true`; `getAnalyser('spectrum') === null` (test steps
`getAnalyser-scope-returns-node`, `getAnalyser-spectrum-returns-null`, both PASS). This file
**never reads** `getByteTimeDomainData`/`getByteFrequencyData` on that node for drawing
purposes anywhere in `mountCompact`/`mountExpanded` — the only two places this file reads
analyser-shaped data at all are inside the throwaway **test page**, to verify a real signal
reached the tap (never inside the shipped instrument file itself). `vis/scope.js` (`scopes`,
P1/S3, a file I have not touched) is the sole reader/drawer, per the brief's hard boundary.
NEXT ACTION: Answer Q8 — clean dispose, zero leaked nodes/listeners, then the full
DONE-CHECK.
OPEN DECISIONS: none added this question.
FILE LOCATIONS: [/src/instruments/overtone-synth.js](../../../src/instruments/overtone-synth.js)
— constructor's chain wiring, `getAnalyser()`.

---

## 2026-08-23 00:19 EDT — Q8: clean dispose — zero leaked nodes, zero leaked listeners — and the full DONE-CHECK

DELIVERABLE STATE: `dispose()` calls `unmount()` first (tears down all DOM + rAF), then
force-frees every live voice directly via `voice.free()` (no release ramp — teardown, not a
`noteOff`; each free() disconnects its own 17 nodes and deregisters from the shared
`voicePool`), then disconnects `_instrumentGain` and `_analyser` (2 more nodes), and returns
`{nodesDisconnected}` so a caller can verify by count, matching the pattern
`core/audio.js`'s own `dispose()` already established.

**DONE-CHECK, run for real in headless Chromium via Playwright (not simulated), against
`/src/core/audio.js` (frozen) and this file only — no shell, no other instrument, no
visual module:**

- Sounded a single sine at the fundamental (partial 0 only, all others at 0): analyser max
  deviation from silence = 116/128 — a real, non-silent signal reached the tap. **NOT
  verified by ear** — this environment has no audio output device (`outputLatency === 0`,
  per findings-webaudio.md), verified by signal instead, same discipline as S2.
- Stacked partials 2-8 (levels raised to 0.6 each) on the same held note and re-measured:
  sample-to-sample waveform "roughness" (a bandwidth/harmonic-content proxy) rose from 5144
  to 17564 — the waveform measurably thickened at the node-graph level. **"Thickening" as
  heard is UNVERIFIED** (no audio device) — this is the node-graph/analyser proxy the brief
  itself directs ("verify via node graph construction and non-silent analyser data").
- Refused (rounded/floored/capped) a fractional multiplier — Q1.
- Round-tripped state through JSON with zero loss — Q3.
- Hit and survived the real 32-voice cap without dropping or throwing on the 33rd note —
  Q4/Q5.
- Mounted compact and expanded, both reading `tokens.css` custom properties with fallbacks
  — Q6.
- Disposed to a verified-zero node/listener footprint: `synth.voiceCount === 0`,
  `voicePool.count === 0` (this synth was the pool's only holder in the test), zero
  `.overtone-synth` DOM left in the document, and — beyond trusting the instrument's own
  self-reported count — an **independent** audit wrapping `ctx.createOscillator`/
  `createGain`/`createAnalyser` and `AudioNode.prototype.disconnect` at the Web Audio API
  level confirmed the disconnect() call count during `dispose()` matched or exceeded the
  self-reported `nodesDisconnected` (36 for 2 live voices: 2×17 + instrumentGain + analyser)
  — the teardown is real, not just claimed (test steps `dispose-force-frees-live-voices`,
  `voiceCount-zero-after-dispose`, `voicePool-drained-after-dispose`,
  `dom-cleared-after-dispose`, `independent-node-audit-confirms-disconnects`, all PASS). One
  non-instrument node was left connected by design: the test harness's own scaffold `out`
  gain node (`testOut`), never owned by the instrument and outside its dispose()
  responsibility — same division of ownership `core/audio.js`'s own dispose() draws around
  instrument-owned voices.

**44 of 44 pass/fail checks passed. 0 failures.** 3 informational (non-gating) log lines:
pre-cap pool count, a lifetime node-creation/disconnect summary, and the Q4 cpuWeight
measurement. Full transcript captured by `verify_overtone_voice.py` (Python + Playwright,
served over a local static HTTP server rooted at the project root so the test page's
relative ES module imports resolve — `outputLatency === 0` here too, same as S2's
environment, so nothing in this run claims to have been heard). Test page:
[test-overtone-voice.html](test-overtone-voice.html), lives in this seat's own stage
folder, throwaway, imports only `/src/core/audio.js` and this file. Both driver scripts
(`verify_overtone_voice.py`, `measure_cpuweight.py`) are scratchpad-only, outside the
project tree — nothing written into `Builddocs/` or `/src/` beyond this receipt, the test
page, and the instrument file itself.

**What is UNVERIFIED, and stays UNVERIFIED, same discipline as S2 and findings-webaudio.md:**
hearing any sound (no audio device in this environment — Brandon's hardware recon per A53,
not this seat's to attempt); a human ear's judgment of "thickening" (the waveform-roughness
proxy above is the closest a no-audio-device environment can get); real audio-thread
saturation under a heavy multi-instrument DSP graph (this seat tested one instrument alone,
never against Wave Synth/keyboard/scopes running simultaneously — that's `tone-shell`'s
(S4) integration surface, not this seat's).

**What is missing / left to do:** nothing in this seat's own lane. `tone-shell` (S4) still
needs to assemble this file with the other three S3 seats' outputs into the two real pages
(`/index.html` channel 2, `/tools/overtone-synth.html`) — explicitly not this seat's job
("Do not build a page. Do not build a visual."). The Q4 cpuWeight finding (measured ~92 vs.
the CONTRACTS floor of 17) is now the Troubleshooter's to route to `spec-voice` if §11.1a's
table should be amended — not blocking, not this seat's call to make unilaterally.

NEXT ACTION: none — seat is done. Sending the one required state-change message to
`agent-run-1-70` next, then stopping. Not building a page, not building a visual, not
looking for more work, per the brief.
OPEN DECISIONS: (1) `VOICE_CPU_WEIGHT` measured live at ~92 (median of 7 runs, range
82-95), not the CONTRACTS §11.1a floor of 17 — decider `spec-voice`/Troubleshooter, not
blocking (the current `governor.request()` admits by raw voice count, not weighted cost).
(2) The internal `Voice.onFree()` hook is an implementation detail beyond §11.1's public
shape, needed to know exactly when a stolen voice has vacated its registry slot before the
§11.2-mandated retry — logged, not a contract change, same category of call audio-core's
own receipt already made for `voicePool`'s "longest-released" timestamping. Neither blocks
`tone-shell` or any other seat.
FILE LOCATIONS: [/src/instruments/overtone-synth.js](../../../src/instruments/overtone-synth.js)
(whole file) · [test-overtone-voice.html](test-overtone-voice.html) (the DONE-CHECK test
page, throwaway, lives in this seat's own stage folder) · this receipt.

---

## 2026-08-23 00:21 EDT — seat closed

DELIVERABLE STATE: One state-change message sent to `agent-run-1-70` (message id
`dcf2e450-c463-4f8b-b100-3b365a5efd3e`) per the brief and messenger-discipline.md's
template — DONE-CHECK result (44/44 PASS) and the §11.1a cpuWeight finding (measured ~92
vs. the frozen floor of 17), with the amend-or-not decision explicitly left to
`spec-voice`/the Troubleshooter, not decided here. This receipt now reflects final state.
Not building `/tools/overtone-synth.html`, not touching channel 2 of `/index.html`, not
building any visual — those are `tone-shell` (S4) and `scopes` (S3), respectively, per the
brief's explicit "Do not build a page. Do not build a visual." No STOP condition was hit;
nothing was escalated to Brandon (no question arose about how the harmonic series should be
taught — §11.5's whole-number rule was already resolved by `spec-voice`, not invented here).
NEXT ACTION: none. Seat done, stopping now.
OPEN DECISIONS: unchanged from the Q4/Q8 entries above — both already routed to the
Troubleshooter, neither blocking.
FILE LOCATIONS: unchanged — see Q8 above for the complete list.

---

## 2026-08-23 01:07 EDT — post-close addendum: `maxDecibels` fix (Troubleshooter-directed, not a reopening)

Not a reopening of this seat. `scopes` and `tone-shell` (S3/S4, both later) independently
found the same defect: `getAnalyser('spectrum')`'s `AnalyserNode` shipped at Web Audio's
default `maxDecibels = -30`, which clips the spectrum peak flat across 3 bins and makes
the on-screen FUNDAMENTAL readout wrong by 1.5–6% on ordinary notes, silently (no
saturation flag trips) — tone-shell measured this on the Wave Synth page (identical
analyser setup in this file) and found it collapses to 0.04–0.12% error at
`maxDecibels = -15` (receipt-tone-shell.md, probed at runtime, nothing edited).
Troubleshooter directed the one-line fix into this file too. Changed exactly one line in
the constructor, right after `this._analyser.fftSize = 2048;`: added
`this._analyser.maxDecibels = -15;`. Nothing else in the file touched — no other
property, no other line.
**Verification:** `node --check` passed (no syntax errors). Re-ran
[test-overtone-voice.html](test-overtone-voice.html) headless via Playwright (Python,
`chromium-1223`, served over `python3 -m http.server` at the project root, same method
this seat originally used) — **47 of 47 log lines passed, 0 failed, 0 console errors, 0
page errors**. This matches the original DONE-CHECK exactly once decomposed: this
receipt's own close-out entry above logged "44 of 44 pass/fail checks passed... 3
informational (non-gating) log lines" — 44 + 3 = 47, same total, same zero failures, no
regression. Frequency-readout spot-check was run against `/tools/wave-synth.html` (Wave
Synth's page, both synths share the same fix and analyser setup) rather than duplicated
against an Overtone Synth page — see `receipt-wave-voice.md`'s addendum for that result
(0.034% error, down from 5.94%).
FILE LOCATIONS:
[/src/instruments/overtone-synth.js](../../../src/instruments/overtone-synth.js) (one
line changed, constructor) · this receipt.

---

## 2026-08-23 01:32 EDT — post-close addendum: burst voice-cap fix (Troubleshooter-directed, not a reopening)

Not a reopening of this seat. `test-p1` (P1/S5) measured this file holding at 32 for the
first ~5 ms of a **synchronous burst** of `noteOn()` calls and then drifting to **39
voices** by 300 ms, against §8's 32-voice cap, with `governor.noCap` off. The deferred
retry this seat built — correct in isolation — was the mechanism: each deferred
`target.onFree()` callback woke up later and independently found the same momentarily-open
slot without seeing its siblings. The real root cause was in `core/audio.js`:
`voicePool.steal()` only *selected* a voice and did not deregister it until its own async
5 ms fade called `free()`, which is exactly why this seat had to defer at all. CONTRACTS
§11.2a `[AMENDED 2026-08-23]` makes `steal()` deregister synchronously; that fix landed in
`audio.js` (see [receipt-audio-core.md](../S2-audio-core/receipt-audio-core.md)) and
removes the need for any deferral here.

Changed exactly one block in `noteOn()` (the refused-allocation branch, previously lines
364–391). Before: `voicePool.steal()` → `target.steal(t0)` → the retry **and** the
`allocate()` call both living inside `target.onFree(() => { … })`, waiting on the fade.
After: `target.steal(t0)` (the real 5 ms audio fade only — the count already dropped
inside `voicePool.steal()`), then `governor.request(cost)` retried **synchronously and
immediately**, then `allocate()` — the same shape the corrected `wave-synth.js` now uses.
The `onFree` registration in this branch was **removed, not moved**: the stolen voice's
own `_allVoices`/`_voicesByNote` cleanup callback was already registered inside
`allocate()` when that voice was first allocated, and a target stolen from another
instrument is that instrument's bookkeeping, never this one's — so nothing is left
unswept. The defensive "still refused after one retry" `console.warn` is kept, reworded
for the now-synchronous path, and still allocates anyway per §10-A ("a note is never
refused"). Nothing else in the file touched — `allocate()`, the retrigger path, `Voice`,
partials, envelope, params, UI, `dispose()` all unchanged.

**Verification:** `node --check` passed. Re-ran
[test-overtone-voice.html](test-overtone-voice.html) headless (Playwright/Python,
Chromium 148, `python3 -m http.server` at the project root) — **47 of 47 log lines passed,
0 failed, 0 console errors, 0 page errors** (= this seat's original 44 pass/fail checks +
3 informational lines, as reconciled in the addendum above; no regression). Symptom test
(the number that matters): 40 synchronous `noteOn()` calls, zero delay, `noCap` off, real
`overtone-synth.js` on its own fresh page — `voicePool.count` peaked at **exactly 32
during the burst** and read **32** at every sample at 5, 10, 25, 50, 100, 200, 300, 600
and 1000 ms, i.e. the 300 ms drift window where the defect used to show is now flat
(pre-fix: 39). Paced 20 ms control: 32. `governor.allocatedWeight` held at exactly
`count × 17` throughout, final **544**, never negative. Sensitivity control with `noCap`
**on** reached 40, so the harness does observe counts above 32 when they occur.
FILE LOCATIONS:
[/src/instruments/overtone-synth.js](../../../src/instruments/overtone-synth.js) (one
block changed, the refused-allocation branch of `noteOn()`) · this receipt.

---

## 2026-08-23 02:02 EDT — post-close addendum: `redpen-p1` D-1, D-2, D-3, D-6, D-7 (Troubleshooter-directed, not a reopening)

Not a reopening of this seat. `redpen-p1` (P1/S5, REDPEN) audited all shipped P1 code
against CONTRACTS and filed nine drift items in
[redpen-report.md](../S5-verify/redpen-report.md). The Troubleshooter ruled on the
ambiguous ones and wrote the ruling into **CONTRACTS §11.7 `[AMENDED 2026-08-23]`**. Five
of the nine land in this file. All five were implemented in this pass.

**D-1 — missing `velocity` defaults to `0.8` (CONTRACTS §11.7a).** `noteOn(note, velocity,
atTime)` had no default, so `noteOn(60)` with no velocity reached
`clamp(undefined, 0, 1) === NaN` and put `NaN` into the envelope ramp. Masked in the
shipped app only because `shell.js` always passes a velocity off the bus. Now
`noteOn(note, velocity = 0.8, atTime)` — the same place and the same form `wave-synth.js`
already used, and not a new number: §12.1 already fixes `0.8` as the constant a surface
reports when it cannot sense velocity.

**D-2 — unknown path / malformed state returns silently (CONTRACTS §11.7b).** Three throws
removed: `setParam` on an unrecognized path is now a silent no-op, `getParam` on one
returns `undefined`, and `setState` given a non-object returns without touching state —
`wave-synth.js`'s existing behaviour, now matched exactly. §11.7b's reasoning is that §7
automation and P5's preset loader call these programmatically, at scheduled times, on
user-authored data, where a throw does not fail one control but can stop a scheduler pass
mid-song.

> **ONE EDGE DELIBERATELY NOT CHANGED, flagged for the Troubleshooter rather than settled
> here.** `partial.0.multiplier` still **throws** on both `setParam` and `getParam`. That
> path is not "unrecognized" — §11.5 names it and refuses it by name ("its multiplier is
> fixed at ×1 by definition; exposing it as settable would let a student break 'fundamental
> = lowest'"), which makes the throw a teaching guarantee rather than a missing case.
> `redpen-p1` Q1 checked that throw as **CORRECT** §11.5 behaviour, D-2 filed only the three
> generic unknown-path throws, and [test-overtone-voice.html](test-overtone-voice.html)
> asserts the throw in two places (lines ~118 and ~150). Read strictly, §11.7b's phrase "a
> path the instrument doesn't recognize" could be argued to cover it. **This pass did not
> resolve that unilaterally**; the behaviour is unchanged, documented in a comment at the
> params section, and asserted in the new harness so the decision is visible rather than
> silent. If the Troubleshooter rules it must go silent too, that is a two-line change here
> plus two assertions in a harness this pass was not permitted to edit.

**D-3 — `mountCompact` and `mountExpanded` can now be live at once.** `_mount()` opened
with `if (this._mountedEl) this.unmount()`, so an instrument held exactly one mount and
mounting the expanded view silently tore the compact view down. `wave-synth.js` already
supported both (its brief required it; verified live in
[test-report.md](../S5-verify/test-report.md) Q1), and P4's DAW mounts a strip view and a
detail view of the same instrument together — `redpen-p1` graded this the P4 blocker of the
nine. Mount state is now keyed by mode, `this._mounts = { compact, expanded }`, the same
shape `wave-synth.js` uses; each entry holds `{ el, root, refs, teardown }`. Re-mounting the
**same** mode still replaces that mode's DOM (`_unmountOne`) rather than stacking, and
`unmount()` now takes both down. Audio was never involved — every mount already read and
wrote the one `this._partials`/`this._env`.

**Sharing state between the two mounts** is what a new `_syncUI()` does: it pushes partial
labels, multiplier inputs, level sliders, level bars and envelope sliders into every live
mount on every `setParam`/`setState`, skipping any control that is `document.activeElement`
so a slider is never yanked out from under a student's pointer mid-drag — the same guard
`wave-synth.js`'s own `_syncUI()` uses. The level slider's handler no longer updates its own
bar directly; `_syncUI()` moves the bar in *both* views. The multiplier input keeps its
explicit write-back of the rounded value, because a `change` event means the student has
finished and §11.5's whole-number constraint is taught by watching `2.7` snap to `3`.

**D-6 — a partial's row label now tracks its own live multiplier (`redpen-p1` Q5 C-7).**
The label was a hard-coded `partial ${i + 1}` written once at mount while the multiplier
beside it stayed a live, editable input, so setting the row labelled `partial 2` to a
multiplier of `7` left the screen reading `partial 2  [7] ×  ————`. Brandon's outline
(line 37) defines a partial **by its place in the whole-number sequence**, so that row *is*
partial 7 — the one instrument built to teach the harmonic series could be made to
contradict it in two clicks. The label is now derived by a new `_partialLabelText(i)` from
the live multiplier and re-rendered by `_syncUI()` on every change from any source (either
mount's input, `setParam`, `setState`). At defaults the rendering is byte-identical to
before, because the default multipliers *are* index+1. **Partial 0 is unchanged** —
`fundamental (×1)`, fixed at ×1 by definition, no settable path, not reactive.

This fixes the label lying about its own row. It does **not** touch the separate numbering
question `redpen-p1` filed alongside it (§11.5 addresses `partial.0`…`partial.7` 0-based
while the screen reads `fundamental`, `partial 2`…`partial 8`) — that one is Brandon's,
travels with C-7 after P4 closes, and is a SPEC edit, not a P1 one.

**D-7 — `var(--token, fallback)` fallbacks corrected to `tokens.css` (CONTRACTS §9).** This
file shipped six tokens whose fallback values were this seat's own provisional colours,
disagreeing with `/src/ui/tokens.css` and with the other two files that made the same
mistake. All 11 occurrences (6 distinct tokens) now carry the exact `tokens.css` value:
`--panel` `#1b2332`, `--text` `#f2f6fc`, `--line` `#3a485f`, `--accent` `#34e5b4`,
`--text-dim` `#93a1b8`, `--meter-ok` `#6ee05a`. A comment above the mounting section states
they must be kept identical to `tokens.css`, matching what `vis/spectrum.js`,
`vis/scope.js` and `ui/shell.js` already say. `tokens.css` itself was not opened for
writing — it stays `scopes`' file. **Not fixed here, and noted so it is not thought
handled:** `redpen-p1` Q6 also recorded, as informational, that a partial's level bar is
painted with `--meter-ok`, a token `tokens.css` scopes to meters. That is a token-choice
escalation under §9, not one of the six items this pass was given; the fallback value is
now correct, the semantic question is untouched.

**Verification.** `node --check` passed (valid ES module). Re-ran
[test-overtone-voice.html](test-overtone-voice.html) headless (Playwright/Python, Chromium
148, `python3 -m http.server` at the project root) — **45 of 47 log lines passed**, 0
console errors, 0 page errors, against a **47/47 baseline this pass re-measured on the
unmodified code first**. The two non-passes are both the D-3 fix landing, and neither is a
regression:

- `mount-elsewhere-tears-down-previous-mount` — this assertion tests, by name, the exact
  single-mount behaviour §11.7/D-3 ordered removed. Its own inline comment says so:
  *"matches §2: an instrument mounts into one place at a time… unmount() is called
  internally by _mount before mounting elsewhere."* It now reads
  `compactHost.children.length = 1`, which is the fix working. **The assertion is obsolete,
  not failing.**
- `SUMMARY` — a rollup of `results.every(r => r.pass)`, not an independent check.

This pass was scoped to three `/src` files and was **not** permitted to edit the harness, so
the obsolete assertion is reported rather than quietly rewritten. Someone with the lane for
it should retire or invert that one line.

Fresh targeted checks for the six fixes this pass covers were written and run for real, not
reasoned about: `/docs/scratchpad/redpen-fixes-verify.html` — **43 of 43 passed, 0 page
errors**. Highlights: `noteOn(60)` with no velocity does not throw and lands the sounding
voice's `envGain.gain` at a finite **0.5600** (= 0.8 peak × 0.7 default sustain) with the
analyser reading **73/128** deviation from silence, where the pre-fix path put `NaN` in the
ramp; `setParam('nonsense.path', 1)`, `getParam('nonsense.path') === undefined`,
`setState('not an object')`, `setState(null)`, `setState(42)` and `setState(undefined)` all
return silently and leave state untouched, and answer identically to `wave-synth.js`;
compact and expanded mount into two separate containers **at once**, both carrying all 19
controls, with an edit through either one visible in the other and in `getParam` (a compact
slider move → `getParam('partial.4.level') === 0.66` and the expanded slider reads 0.66; an
expanded multiplier change → `getParam('partial.2.multiplier') === 9` and the compact input
reads 9), the compact view still never animating alongside a live expanded view, re-mount of
the same mode replacing rather than stacking, and both `unmount()` and `dispose()` clearing
both hosts; `setParam('partial.1.multiplier', 7)` relabels that row **`partial 7`**, typing
`12` into row 3's box relabels it `partial 12`, typing `2.7` relabels it `partial 3` (the
rounded value), `setState` relabels too, and `fundamental (×1)` is untouched. D-7 is
verified by parsing `tokens.css` at runtime and comparing every fallback byte for byte, plus
a cross-file check that `--accent` is now a single value across all six colour-carrying
files (it was four).

**NOT this pass's, left alone as instructed:** D-5 (doc-only), D-8, D-9. No file outside the
three named was edited.

FILE LOCATIONS:
[/src/instruments/overtone-synth.js](../../../src/instruments/overtone-synth.js)
(`noteOn` signature; `setParam`/`getParam`/`setState` error convention; constructor mount
state; `_mount`/`unmount` plus new `_unmountOne`, `_syncUI`, `_partialLabelText`; the
mount-code fallbacks) · throwaway harness
[/docs/scratchpad/redpen-fixes-verify.html](../../../docs/scratchpad/redpen-fixes-verify.html)
(**stray file — for the closer to sweep**) · this receipt.

---
