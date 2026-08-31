# RECEIPT — tone-shell — P1/S4

Seat: `tone-shell`, BUILD, OPUS-CLASS. Opened 2026-08-23 00:41 EDT.
Task: [A-tone-shell.md](A-tone-shell.md). Stage: [STAGE.md](STAGE.md). Phase: [PHASE.md](../PHASE.md).
Binds to: [CONTRACTS.md](../../CONTRACTS.md) §1, §2 (+ amendments), §3, §4, §5, §9, §10, §11, §12.

**Lane: three files, all three named in the brief.**
`/src/ui/shell.js` · `/tools/wave-synth.html` · `/tools/overtone-synth.html`.
Nothing else was written or edited. Verified by mtime against every S2/S3 file plus
CONTRACTS.md at the end of the DONE-CHECK — all nine predate this seat's earliest file.
`/index.html` (P4's) and `/src/ui/overlays.js` (P3's) do not exist and were not created.

**DONE-CHECK: 83 passed · 0 failed · 4 informational.** Real headless Chromium 148 via
Playwright, both pages, served by `python3 -m http.server` at the project root. Nothing in
this receipt claims to have heard anything — see UNVERIFIED at the end.

---

## 2026-08-23 00:41 EDT — start

DELIVERABLE STATE: Read, in full and before writing a line: A-tone-shell.md, STAGE.md,
CONTRACTS.md (§1, §2 + its four amendments, §3, §4, §5, §9, §10, §11, §12), PHASE.md,
ROSTER.md, and **all seven S2/S3 source files themselves** — `core/audio.js`,
`core/input.js`, `instruments/wave-synth.js`, `instruments/overtone-synth.js`,
`surfaces/keyboard.js`, `vis/spectrum.js`, `vis/scope.js`, `ui/tokens.css` — plus the five
receipts (`audio-core`, `wave-voice`, `overtone-voice`, `keys-input`, `scopes`) for the
quirks and UNVERIFIED items each seat flagged. Confirmed `/tools/` did not exist yet.
Confirmed the standing environment fact that bounds every claim below: **no audio output
device** (`outputLatency === 0`, findings-webaudio.md).

The quirks that shaped the build, each read out of a real file rather than assumed:
- `core/input.js` calls `requestMIDI()` itself at module load — the shell must **not** call
  it (keys-input receipt, NEXT ACTION).
- `core/audio.js` installs its own `pointerdown`/`keydown`/`touchstart` gesture net on
  `window` and only `audio.dispose()` removes it. The shell must not assume it owns unlock.
- `core/audio.js`'s `dispose()` **closes the one AudioContext**. That is a page teardown,
  not a shell teardown, so the shell does not call it (see Q7).
- `OvertoneSynth.setParam` **throws** on an unknown path; `WaveSynth.setParam` ignores one.
  The shell touches neither — it only routes notes.
- `vis/spectrum.js` and `vis/scope.js` **throw in their constructors** on the wrong
  instrument. That is the inversion enforced mechanically, and the shell lets it fail loud.
- `scopes` OPEN DECISION #2: both synths' analysers ship at `maxDecibels = -30`. This seat
  is the first to see what that does on a real page. See Q3 and the escalation at the end.

NEXT ACTION: answer the seven seat questions in code, then verify against both real pages.
OPEN DECISIONS: none yet.
FILE LOCATIONS: no writes yet.

---

## 2026-08-23 00:47 EDT — Q1: what is the standalone layout?

DELIVERABLE STATE: **Expanded, everywhere, and there is no code path to compact.**
`ToolShell.mount()` calls `instrument.mountExpanded(host)`, `visual.mountExpanded(host)`,
and the surface switcher calls `surface.mountExpanded(host)`. **`.mountCompact(` appears
zero times across all three of this seat's files** — asserted as a source check in the
DONE-CHECK, not just claimed. Compact is P4's view of the same seven modules and P4 builds
it.

Layout, in DOM order: top bar (file menu · title · CPU meter) → two columns (instrument
controls | visual + scale seam) → playing surface. Verified live on both pages:
`.ws-root.ws-expanded` / `.overtone-synth--expanded`, `.vis.vis-expanded`,
`.cbdaw-kbd[data-variant="expanded"]` all present, and **zero** `.vis-compact` or
`[data-variant="compact"]` anywhere.

**One layout decision that was measured, not styled by eye, and it changed the design.**
The first version was a single scrolling document with the visual full-width. Measured at
1366×768 — the Chromebook screen this ships to — the page was **1062 px tall and the
KEYBOARD ended at y=966**: the one control every student needs first was below the fold,
on both pages, at both 1366×768 and 1280×720. Rebuilt as a fixed-viewport app layout: the
top bar and the playing surface are pinned, the middle column pair is the part that
scrolls, falling back to ordinary document scroll below 620 px of viewport height.
Re-measured: keys fully on screen at **1366×768, 1280×720 and 1920×1080**, and the middle
region scrolls to reveal every control (verified: the Wave Synth ADSR row is fully visible
after scrolling the column region). This is in this seat's own file and its own lane.

NEXT ACTION: Q2 — the file menu.
OPEN DECISIONS: the fixed-viewport layout above is this seat's call, made against a
measurement. **Decider if a plain scrolling page is preferred: Brandon / `redpen-p1`.**
Not blocking; it is one media query in one file.
FILE LOCATIONS: [/src/ui/shell.js](../../../src/ui/shell.js) §6 `ToolShell.mount`, §1a
(`.cbdaw-shell__columns`, `.cbdaw-shell__surface`).

---

## 2026-08-23 00:49 EDT — Q2: where is the file menu?

DELIVERABLE STATE: **At the top of both pages, and built in `shell.js` so P4 inherits it.**
`createFileMenu({items, currentId, label, onSelect})` is an independent exported component;
the shell's `TOOLS` table is only its **default argument**, not a list hard-coded inside it.
That is the whole reason it is here rather than in the pages: Brandon asked for a menu that
isolates one thing, in P1 the one thing is which tool you are in, and in P4 the same
component becomes the DAW's isolate control by being handed different `items` and a
different `onSelect`. **The component never learns what selecting means** — P1 passes a
navigate handler, P4 will pass an isolate handler, and nothing inside changes.

It lists all five `/tools/*.html` pages from CONTRACTS §1 plus `/index.html`. The four not
built yet render **disabled and tagged with the phase that builds them** — a later phase
flips one boolean. A class never clicks through to a 404.

Verified live on both pages: menu present inside `.cbdaw-shell__top`; **6 entries**;
`aria-current` on exactly the current tool; exactly two entries enabled
(`wave-synth`, `overtone-synth`); opens on click and closes on an outside click and on
Escape; and — the real test — **clicking the other tool actually navigates**: from
`wave-synth.html` to `overtone-synth.html` and back, each landing with the right
`.cbdaw-shell[data-tool]` mounted.

NEXT ACTION: Q3 — no build step.
OPEN DECISIONS: `TOOLS` currently lists `/index.html` as "P4 — not built yet". **Decider:
P4's `daw-shell`**, which flips it. Not blocking.
FILE LOCATIONS: [/src/ui/shell.js](../../../src/ui/shell.js) §1 (`TOOLS`), §2
(`createFileMenu`).

---

## 2026-08-23 00:51 EDT — Q3: does each page work with no build step?

DELIVERABLE STATE: **Yes — plain ES module imports, relative paths, no bundler, no
dependency, nothing to compile** (CONTRACTS §10).

**The serve command and both URLs, as the DONE-CHECK requires:**

```
cd "/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1"
python3 -m http.server 8000 --bind 127.0.0.1
```
- `http://127.0.0.1:8000/tools/wave-synth.html`
- `http://127.0.0.1:8000/tools/overtone-synth.html`

It must be HTTP, not `file://` — Chrome refuses ES module imports from a `file://` origin,
and both Web MIDI and P5's service worker need a secure context (§5, §10). `127.0.0.1`
counts as secure, which is why the Web MIDI route is live in the DONE-CHECK below.

Each page is a `<link>` to `tokens.css`, a `<noscript>`, and one `<script type="module">`
with three imports and a single `mountStandaloneTool({…})` call. Verified live on both:
**zero HTTP responses ≥ 400**, **zero requests to any origin other than the local server**,
**zero page errors**, **zero console errors**, and a source check that no import anywhere in
this seat's three files uses a bare specifier or a URL.

NEXT ACTION: Q4 — the scale control.
OPEN DECISIONS: none added.
FILE LOCATIONS: [/tools/wave-synth.html](../../../tools/wave-synth.html) ·
[/tools/overtone-synth.html](../../../tools/overtone-synth.html).

---

## 2026-08-23 00:53 EDT — Q4: does each page own its own scale control?

DELIVERABLE STATE: **Yes, minimal, and the seam is stated on screen rather than buried.**
`createScaleControl()` holds a state object shaped **exactly** like CONTRACTS §4's
`state.scale`, carrying §4's own literal default values — `{tonic: 0, degrees:
[0,2,4,5,7,9,11], name: 'Major'}`. That is quoting the frozen contract, not picking a
scale. Per BUILDPLAN, in a standalone tool the tool owns its own scale, so this object is
per-page and local; it is not a global header and there is no `core/state.js` yet.

**Where it deliberately stops, and why:**
- Tonic moves across the 12 pitch classes — a §4 field with a stated range and no theory
  content. Spelling is **imported from `surfaces/keyboard.js`'s exported placeholder
  table**, not written again here, so P3's real labeller has one seam to replace and this
  seat never picked a spelling (§10-H).
- `degrees` is **read-only**. Altering a degree needs §4's `altered`/`preset` machinery and
  the `+/-` UI that P3's surfaces own.
- **No preset list.** Naming the "12 scales" is open-decisions **D-1**, is UNRESOLVED, and
  is Brandon's alone — §4's own ⚠ block and §10-H both say so. Not guessed.
- Nothing in P1 sounds different when the tonic moves, and the panel **says so on screen**,
  so a student does not read an unbuilt dependency as a broken control.
- The keyboard's `number` and `solfege` overlays stay blank for the same reason — that is
  `keys-input`'s own documented seam awaiting `theory/scale.js`, not a shell defect.

P3 replaces the body of this one function. The shape the shell binds to —
`{el, scale, on(fn), dispose()}` — is what makes that a function swap and not a shell
rewrite. Verified live on both pages: the state object matches §4 byte for byte, the tonic
control moves it (0 → 1) and fires subscribers with the new value, the readout tracks
(C → C♯), 7 read-only degree cells render, and the P3 seam text is in the DOM.

NEXT ACTION: Q5 — the surface switcher.
OPEN DECISIONS: none this seat can settle. The blocking question upstream of the real
control is **D-1, decider Brandon**, and P3's `redpen-theory` gates on it before
`scale-engine` writes a line. This seat did not touch it.
FILE LOCATIONS: [/src/ui/shell.js](../../../src/ui/shell.js) §4 (`createScaleControl`).

---

## 2026-08-23 00:54 EDT — Q5: do the input surfaces switch rather than stack?

DELIVERABLE STATE: **They switch, and it is structural rather than promised.**
`createSurfaceSwitcher()` holds at most ONE live surface in a single variable. Selecting a
surface **disposes the outgoing one first** — which also releases anything it was holding
on the bus (§12.1) — then empties the host, then constructs the incoming one. There is no
code path in the component that can produce two live surfaces, and `liveCount` is a getter
over that one variable so the property can be asserted rather than eyeballed.

Per BUILDPLAN, stacking all three at once is reserved for P3's harmony engines. **P1 has
one surface, and the switcher is still built as a switcher with one option in it.** P3 adds
`diatonic-keys` and `scale-circle` by calling the exported `registerSurface({id, kind,
label, Ctor})` — no edit to the switcher's body. The registry carries a `kind`
(`'pitch' | 'rhythm'`) so P2's beat page can ask for its own surfaces without being offered
a piano. The one-option case states the P3 seam on screen so it reads as "one so far", not
as a broken menu.

Verified live on both pages: exactly one option (`keyboard`); exactly one surface live, one
button pressed, one `.cbdaw-kbd` in the DOM; and re-selecting the same surface leaves the
count at one rather than stacking a second.

NEXT ACTION: Q6 — the CPU meter.
OPEN DECISIONS: `registerSurface()` is this seat's addition and is not named in CONTRACTS.
It is additive inside this seat's own file, contradicts nothing, and is what lets P3 extend
the switcher without editing it. **Decider: `spec-scale` / Troubleshooter, on whether §12
should name it.** Not blocking.
FILE LOCATIONS: [/src/ui/shell.js](../../../src/ui/shell.js) §1 (`SURFACES`,
`registerSurface`, `surfacesOfKind`), §3 (`createSurfaceSwitcher`).

---

## 2026-08-23 00:56 EDT — Q6: does the CPU meter show?

DELIVERABLE STATE: **`governor.load` is in the top bar of both pages, and `noCap` is one
click away** — no dev console, no query string, no hidden gesture. §8: "when noCap is on,
the meter still reads and still turns red. Nothing is blocked. Brandon wants the
Chromebooks to crash."

The cluster reads: `audio` state (with a "Click to start sound" button while suspended,
per §3), the CPU bar + numeric `governor.load`, live `voicePool.count` across the whole
DAW, this instrument's live `cpuWeight` (§2/§11.6 — analyser included), and the `noCap`
checkbox. Read on rAF only — §3: visuals read from rAF, audio reads from the scheduler, and
the two never cross.

Verified live on both pages: the meter is present inside `.cbdaw-shell__top` with non-zero
width and a live numeric readout; **one click on the checkbox flips `governor.noCap` false
→ true, `governor.load` keeps returning a number the whole time, and a second click flips
it back.**

**Two honest limits, stated in the meter's own tooltip so a green bar never misleads a
teacher, and neither is this seat's to fix.** (1) §8's own warning: this probe measures
MAIN-THREAD cost, and a graph heavy in convolvers can saturate the AUDIO thread while this
reads near zero. (2) `audio-core`'s receipt: `clock.js` (P2) does not exist, so
`governor.load` today times `core/audio.js`'s own registry bookkeeping rather than a real
scheduler pass — true moving work, not yet the scheduler's work. Measured on both pages at
one voice: **`load` reads 0.00**, which matches findings-webaudio.md Q3's own idle row.

NEXT ACTION: Q7 — teardown, then the full DONE-CHECK.
OPEN DECISIONS: the meter's colour bands are this seat's choice — `--meter-ok` below 0.70,
`--warn` 0.70–0.90, `--meter-hot` above 0.90. §8 says the meter "turns red" and names no
threshold; §10-B's numbers are for dBFS audio meters, not this one. **Decider: Brandon /
P4's `governor` seat.** Not blocking — one constant object in one file.
FILE LOCATIONS: [/src/ui/shell.js](../../../src/ui/shell.js) §5 (`createCpuMeter`,
`CPU_BANDS`).

---

## 2026-08-23 00:58 EDT — Q7: does it tear down? — and the full DONE-CHECK

DELIVERABLE STATE: **Zero leaks, proven by an independent count rather than by the shell's
own self-report.**

`ToolShell.unmount()` runs in dependency order, and the order is the point: drop the bus
subscriptions so no new note can arrive → `input.allNotesOff()` so nothing is left
sounding → dispose the **visual** first (it reads the instrument's analyser every frame and
must stop reading before that node is disconnected) → dispose the **surface** (its own DOM
listeners and bus subscriptions, §12.1) → dispose the **instrument** (force-frees every
live voice, disconnects its own nodes, §2) → `releaseChannel()` → the shell's own chrome
(CPU meter, scale control, file menu) → its ref-counted stylesheet.

**Two things it deliberately does not do, both because they are not the shell's to do.**
It does not call `audio.dispose()` — that closes the one AudioContext for the whole
document (§10), which is right for a page going away and wrong for a shell a later phase
may remount. It does not call `input.dispose()` — the bus is module-level and shared by
every surface on the page; the shell drops its own two subscriptions and leaves the bus
alive.

**Verified in real Chromium, by an `addEventListener`/`removeEventListener` ledger wrapped
before any module loads:** after `unmount()`, the **only** listeners left anywhere in the
document are `core/audio.js`'s three window gesture listeners (`pointerdown`, `keydown`,
`touchstart`, all stack-traced to `audio.js:137`), which only `audio.dispose()` removes.
**Zero** are left from `shell.js`, `keyboard.js`, `input.js`, either synth, or either
visual. Also verified: shell/keyboard/canvas DOM all removed; both stylesheets removed
(ref-counted); the visual's and the CPU meter's rAF frame counters **do not advance by a
single frame over 600 ms** after unmount; `instrument.voiceCount === 0` and
`voicePool.count === 0`; notes held on two routes at teardown were **released, not
stranded** (`input.activeNotes === []`); `input.listenerCount` back to 0; and a fresh page
load re-mounts cleanly, so unmount is a stop and not a break.

### DONE-CHECK — 83 passed · 0 failed · 4 informational

Real headless Chromium 148 via Playwright, both pages, served by `python3 -m http.server`
at the project root. Driver script `verify_tone_shell.py` is scratchpad-only, outside the
project tree — **nothing was written into `Builddocs/` or `/src/` beyond this receipt and
this seat's three lane files.** Against the DONE-CHECK line by line:

- *Both pages load from `python3 -m http.server` with no build step* — yes. Zero 4xx/5xx,
  zero external requests, zero page errors, zero console errors, on both.
- *Make sound from every input route* — yes, all four, on both pages:
  · **mouse** — a real trusted `page.mouse.down()` on a white key: 1 voice, analyser peak
  deviation 72/128, and it is also the gesture that took `ctx.state` from `suspended` to
  `running` (§3);
  · **key** — a real physical `KeyZ` press: 1 voice, deviation 72/128, `activeNotes [60]`;
  · **touch** — a `PointerEvent` with `pointerType: 'touch'`: 1 voice, deviation 72/128;
  · **midi** — a simulated port through the shipped `input.attachMIDI()` path: 1 voice,
  deviation 71/128, `activeNotes [64]`, **and it lit the same surface key the other three
  routes light**, which is §5's "all four routes produce identical events" as a measurement.
- *Correct visual, and only that visual* — yes. Wave Synth: 1 `.vis-spectrum`, 0
  `.vis-scope`, 1 canvas. Overtone Synth: 0 / 1 / 1. Enforced three ways: the page names
  one `Visual` class; `ToolShell` refuses to mount if the instrument offers the other tap;
  and `vis/*.js`'s own constructors throw on the wrong pairing.
- *Expose the CPU meter and `noCap`* — yes, both pages, verified by flipping it.
- *Dispose cleanly on unmount* — yes, as above.
- Plus: the file menu really navigates between the two tools, and both visuals are running
  on rAF off real data (spectrum `avgReadMs` 0.042 / `avgDrawMs` 0.264; scope `avgReadMs`
  0.009 / `avgDrawMs` 0.293 / `avgPeriodMs` 0.386 — consistent with `scopes`' own figures).

**Rendered and looked at, not only asserted.** Screenshots of both pages at 1366×768 with a
note held. The Wave Synth page shows the four waveform buttons, the spectrum with a labelled
`FUNDAMENTAL` line, and the lit key. The Overtone Synth page shows the eight partial rows
with the fundamental called out, and the oscilloscope locked with `ONE REPETITION —
2.85 ms` at **350.4 Hz against a true 349.23 Hz (0.34%)**. Two layout defects were caught by
looking rather than by a test — the top bar wrapping the CPU meter onto a second row, and
the instrument panel being cut mid-control at first paint — and both were fixed in this
seat's own file.

NEXT ACTION: none — seat is done. Not building the DAW, not looking for more work.

**On the one required state-change message.** `SendMessage` to `agent-run-1-76` was
attempted and **refused**: that name is this process's own main session, addressable only
as `"main"` from inside it — i.e. the seat is running as a subagent of the very session it
was told to message, and this seat's closing report already lands in that conversation.
Rather than post the same content into the same conversation twice, the state change and
the escalation below were delivered in the closing report. Recorded here so the count is
honest: **one delivery, not two, and not a message I claimed to have sent.**

---

## ⚠ REPORTED, NOT FIXED — an S3 file behaving unexpectedly on a real page

**File: `/src/instruments/wave-synth.js` (and the same line in
`/src/instruments/overtone-synth.js`). Symptom: the Wave Synth page's on-screen
`FUNDAMENTAL` readout is wrong by 1.5–6%.**

Both synths create their `AnalyserNode` with Web Audio's default `maxDecibels = -30`. On a
real page that clips the top of the peak flat across 3 bins, and `vis/spectrum.js`'s
"lowest significant local maximum" scan plus its parabolic interpolation both land on the
wrong side of the plateau. Measured on the shipped page, four notes, one voice each:

| played | true | readout shows | error | pinned bins | on-screen warning |
|---|---|---|---|---|---|
| MIDI 60 | 261.63 Hz | **246.09 Hz** | **5.94%** | 3 | not shown |
| MIDI 65 | 349.23 Hz | **339.84 Hz** | **2.69%** | 3 | not shown |
| MIDI 69 | 440.00 Hz | **433.59 Hz** | **1.46%** | 3 | not shown |
| MIDI 72 | 523.25 Hz | **503.91 Hz** | **3.70%** | 3 | not shown |

Setting `maxDecibels = -15` at runtime **in a throwaway probe — nothing was edited** —
collapses the error to **0.04% / 0.05% / 0.07% / 0.12%**, with **0 pinned bins**.

This is `scopes`' OPEN DECISION #2 (`maxDecibels ≈ -15`, "one line each, in their file, not
mine"), now with the classroom consequence attached. **The safety net does not catch it:**
`spectrum.saturated` is `false` in every row above, because only 3 of 1024 bins pin and the
detector fires above 2%. So the page teaches a wrong number **silently**, on the one readout
the curriculum names by name ("fundamental = lowest and loudest").

**Not fixed here.** Fixing it means editing another seat's file — a STOP condition in this
brief — and reaching into the instrument's analyser from the shell to paper over it would
break §2's rule that the instrument owns that node. The shell also does not compensate in
the drawing. There is a comment at the mount point in `shell.js` pointing at this entry.
**Decider: Troubleshooter → `wave-voice`/`overtone-voice`'s files.** One line each.

---

## OPEN DECISIONS

1. **The analyser `maxDecibels` finding above.** Decider: Troubleshooter. **The only one
   with a visible effect on what a student reads.** Not blocking this seat — both pages
   ship and everything else on them is correct.
2. **The fixed-viewport layout** (top bar and playing surface pinned, middle scrolls),
   adopted because the keyboard measured below the fold at 1366×768. Decider: Brandon /
   `redpen-p1`. One media query.
3. **`registerSurface()`** is this seat's addition, not named in CONTRACTS §12. It is what
   lets P3 add two surfaces without editing the switcher. Decider: `spec-scale` /
   Troubleshooter.
4. **CPU meter colour bands** (0.70 warn / 0.90 hot). §8 says "turns red" and names no
   threshold. Decider: Brandon / P4's `governor` seat.
5. **`window.cbdawShell`** is exposed on purpose so `test-p1` and `redpen-p1` have a handle
   to call `unmount()` and count what came down. Decider: Troubleshooter, if it should not
   ship on the deployed build.
6. Carried forward, not this seat's: **the palette awaits Brandon** (`scopes` #1);
   **`VOICE_CPU_WEIGHT` measured ~92 vs the frozen 17** (`overtone-voice` #1);
   **`createChannel()`/`releaseChannel()` are not in CONTRACTS** (`audio-core` #1) — this
   shell uses them, because they are the only thing that produces §2's `out` node before
   P4's `mixer/strip.js` exists; **`input.on('shift')`** (`keys-input` #1).

## UNVERIFIED — with reasons, same discipline as findings-webaudio.md

1. **Anything heard.** No audio output device exists here (`outputLatency === 0`). "Makes
   sound" is verified as: `ctx.state === 'running'`, real voices in the node graph, and
   non-silent data on the instrument's own `AnalyserNode`. **No hearing test was performed
   or fabricated.** Brandon's hardware recon, per **A53**.
2. **Real MIDI hardware.** No device and no permission prompt. The route was exercised
   through the shipped `attachMIDI()` path with a simulated port on a secure origin — same
   standing limit `keys-input` recorded.
3. **Chromebook performance.** Every timing here is an Apple M4 Max. A Chromebook drawing
   an expanded visual, a keyboard and an instrument panel on one thread will be materially
   worse. Same caveat §3 and `scopes` already carry.
4. **Ten-foot projector legibility.** §9's actual test, for the palette and for this
   shell's own chrome. No projector exists here. Brandon's room test.
5. **Touch on real hardware.** The touch route was driven by a synthetic `PointerEvent`
   with `pointerType: 'touch'`, not by a finger on a Chromebook touchscreen. Multitouch
   chords in particular are untested on real hardware.

## WHAT IS MISSING / LEFT TO DO

Nothing in this seat's lane — all seven seat questions are answered in code and the
DONE-CHECK passes 83/83. For the seats after this one:
- **`test-p1`** — `window.cbdawShell` is the handle; `unmount()` returns a counted report,
  and both visuals plus the CPU meter expose `frameCount` for a by-count teardown proof.
- **`redpen-p1`** — the analyser `maxDecibels` finding above is the one live contract-drift
  question on these pages, and it belongs to the synth files, not to this shell.
- **P2 `beat-shell`** — reuse `ToolShell` with a different descriptor and
  `surfaceKind: 'rhythm'`; flip `TOOLS`' `beat` row to `available: true`.
- **P3** — replace `createScaleControl()`'s body with the real engine, keeping
  `{el, scale, on, dispose}`; call `registerSurface()` twice.
- **P4 `daw-shell`** — `createFileMenu` is the isolate control; hand it different `items`
  and a different `onSelect`, and call `mountCompact` where this shell calls `mountExpanded`.

## FILE LOCATIONS

| What | Where |
|---|---|
| The reusable shell | [/src/ui/shell.js](../../../src/ui/shell.js) |
| Wave Synth page | [/tools/wave-synth.html](../../../tools/wave-synth.html) |
| Overtone Synth page | [/tools/overtone-synth.html](../../../tools/overtone-synth.html) |
| This receipt | `/Builddocs/P1-tone-tool/S4-shell/receipt-tone-shell.md` |

**Serve command and URLs:**
```
cd "/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1"
python3 -m http.server 8000 --bind 127.0.0.1
```
- `http://127.0.0.1:8000/tools/wave-synth.html`
- `http://127.0.0.1:8000/tools/overtone-synth.html`
