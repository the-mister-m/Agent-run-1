# FINDINGS — WEB AUDIO

Task: replace assumption with measurement before CONTRACTS is frozen.
Written by: `recon-webaudio` seat, P0/S2, under a `goto` override. 2026-08-22 23:26 EDT.
Handoff in: [scope.md](scope.md). Handoff out: → `spec-core` (P0/S3).
Map: [BUILDPLAN.md](../BUILDPLAN.md) · [CONTRACTS.md](../CONTRACTS.md) · [PHASE.md](PHASE.md)

---

## HOW THESE WERE MEASURED — READ THIS BEFORE USING ANY NUMBER

**An execution path existed and was used.** The seat brief anticipated there might not be
one. There was. Every number below came out of a real browser.

| | |
|---|---|
| **Driver** | Playwright 1.60.0 (Python), `sync_playwright` |
| **Browsers** | bundled Chromium (`HeadlessChrome/148.0.7778.96`) and the real **Google Chrome 151.0.7922.170** installed on this machine, both headless and headed |
| **Host** | Apple **M4 Max**, 16 cores (12 performance / 4 efficiency), 64 GB, macOS 15.7.3 (24G419) |
| **Audio device** | **none — null sink.** `AudioContext.outputLatency === 0` in every launch, headed and headless |
| **Harness** | `…/scratchpad/recon/t0…t10_*.py` — outside the project tree, nothing written into `Builddocs/` |

### The three caveats that limit every number here

1. **This is an M4 Max, not a Chromebook.** A school Chromebook is roughly one to two
   orders of magnitude slower on DSP. **Every absolute number below is a ceiling this
   hardware can reach and a Chromebook cannot.** The **ratios** transfer; the **absolutes
   do not.** Per **A53**, Brandon does the hardware recon at deployment — this seat is
   explicitly not allowed to do it, and did not.
2. **There is no audio output device.** `outputLatency` is 0 in every launch. Nothing here
   was heard. "Play until it glitches" was therefore **impossible to run**, and the
   questions that depend on hearing a glitch are marked `UNVERIFIED` rather than filled
   with a plausible number.
3. **Automation suppresses two real browser behaviors** — the autoplay gesture gate and
   permission prompts. Where that contaminated a result, the result says so and is
   marked `UNVERIFIED`.

`VERIFIED` below means: this seat ran code in a browser and read the number off the run.
`UNVERIFIED` means: this seat could not run it, and **did not guess a number to fill the
slot.**

---

## Q1 · DOES THE 25 ms / 100 ms LOOKAHEAD SCHEDULER IN CONTRACTS §3 HOLD?

### `VERIFIED` — and the answer is yes, with a stated margin

Method: a real lookahead scheduler — `setInterval(25)` scanning a `currentTime + 0.100`
window, allocating a real `OscillatorNode` + `GainNode` with an exponential envelope per
eighth note, `start()`/`stop()` at exact `AudioContext` times, disconnect on `onended`.
Synthetic main-thread load was burned inside each pass. 5–6 s per run. Harness `t1`, `t2`.

**Timer accuracy, idle:**

| | p50 | p95 | max |
|---|---|---|---|
| `setInterval(25)` actual gap | **25.1 ms** | **26.2 ms** | **26.8 ms** |

`setInterval(25)` is accurate to about **+1.2 ms at p95** when the main thread is free.

**Under load — where the 100 ms window actually breaks:**

| Main-thread block per pass | Observed interval | Late events | Worst lateness |
|---|---|---|---|
| 0 ms | 25.1 ms | **0** | — |
| 50 ms | 50.0 ms | **0** | — |
| 80 ms | 80.0 ms | **0** | — |
| **100 ms** | 100.0 ms | **0** | — |
| **150 ms** | 150.0 ms | **14** | 30.7 ms late |
| 250 ms | 250.1 ms | 20 | 57.0 ms late |
| 400 ms | 400.1 ms | 31 | 276.7 ms late |

**The rule this establishes, measured:** once a pass costs more than the interval, the
interval stops mattering — the scheduler becomes **load-bound**, firing every `loadMs`
instead of every 25 ms. What saves the audio is not the interval, it is the window.
**A 100 ms lookahead absorbs a main-thread stall of up to ~100 ms with zero late
events, and starts dropping notes at ~150 ms.**

Confirmed by raising the window: at a 150 ms stall, a **200 ms** lookahead produced **0**
late events where 100 ms produced 14. At a 250 ms stall, 200 ms still held at **0**.

> **Lookahead must exceed the worst-case main-thread block.** The interval only sets how
> finely the window is refilled.

**Recommendation to `spec-core`: keep 25 ms / 100 ms.** They are correct and they have
measured margin. Nothing here justifies changing them.
**But note the risk:** the ~100 ms of headroom was measured on an M4 Max. A Chromebook
rendering a spectrum analyzer, an oscilloscope, and a piano roll on the same thread will
produce longer stalls than this machine does. If P2's `recon-scheduler` or P4's TEST seat
sees late events, **the number to raise is the 100 ms window, not the 25 ms interval** —
that is what the measurement says fixes it.

---

## Q2 · WHAT DOES ONE VOICE ACTUALLY COST?

### `UNVERIFIED` — the absolute voice count. `VERIFIED` — the cost ratios.

**What could not be done, and why.** The brief says: add voices until the audio glitches,
state the count. **There is no audio device in this environment** (`outputLatency === 0`,
null sink). Nothing can glitch, and nothing can be heard. **This seat states no voice
ceiling.** Any number here would be invented, and inventing it is the exact failure this
seat exists to prevent.

**What was done instead.** `OfflineAudioContext` renders through the same DSP code as the
realtime graph, deterministically and without a device. Rendering a fixed span of audio and
timing the render gives a true measure of **DSP cost**. That is what sets cost units in
§8 — §8 is a table of *relative* weights, and relative weight is exactly what this measures.

Method: render 2 s of stereo 44.1 kHz, N voices, each `osc(saw) → gain(4-stage envelope)`,
optionally `→ biquad(lowpass, automated freq, Q=6)`. Median of 5 runs. Harness `t6`.

| Voices | plain: ms/voice/audio-sec | +biquad: ms/voice/audio-sec |
|---|---|---|
| 16 | 0.2062 | 0.8813 |
| 32 | 0.2063 | 0.8812 |
| 64 | 0.2070 | 0.8820 |
| 128 | 0.2063 | 0.8910 |
| 256 | 0.2057 | 0.8902 |

**Perfectly linear from 16 voices up.** No knee, no allocation cliff, in either chain.

> ### The two numbers the brief asked for
> - **A plain voice** (osc + gain + envelope) = **0.206 ms per voice per audio second.**
> - **A filtered voice** (+ one automated biquad) = **0.881 ms per voice per audio second.**
> - **A biquad costs 4.3× a plain voice.** ← *this ratio is the finding that transfers*

### Per-device cost, isolated — this is the §8 table, measured

Method: one fixed source, then 1 / 4 / 8 identical device nodes chained; cost taken as the
1→8 slope so the source cancels out. Median of 7 runs. Harness `t7`.

| Node | ms per node per audio-sec | **cost units, plain voice = 1** | CONTRACTS §8 says | verdict |
|---|---|---|---|---|
| `GainNode` | 0.0286 | **0.1** | node = 1 | over-charged 10× |
| `AnalyserNode` | 0.0429 | **0.2** *(see caveat)* | — | — |
| `WaveShaperNode` | 0.0643 | **0.3** | node = 1 | over-charged 3× |
| `DelayNode` | 0.0857 | **0.4** | insert = 2 | over-charged 5× |
| `StereoPannerNode` | 0.0857 | **0.4** | — | — |
| `BiquadFilterNode` | 0.1857 | **0.9** | insert = 2 | over-charged 2× |
| `DynamicsCompressorNode` | 0.8929 | **4.3** | insert = 2 | **under-charged 2×** |
| `ConvolverNode` (2 s IR) | 5.0857 | **24.7** | reverb = 8 | **under-charged 3×** |

**Convolver cost scales with IR length** — measured, single convolver:

| IR length | cost units |
|---|---|
| 0.1 s | 13.3 |
| 0.25 s | 15.0 |
| 0.5 s | 16.5 |
| 1.0 s | 18.4 |
| 2.0 s | 23.5 |
| 4.0 s | 32.5 |

Note the shape: a convolver costs **~13 units before it convolves anything.** There is a
large fixed cost and a modest slope. **A short reverb is not a cheap reverb.**

### What this says to `spec-core` about §8

§8's cost table is wrong in **both directions**, which is worse than being wrong in one:

- **"A device insert = 2"** flattens a 10× spread. A delay (0.4) and a compressor (4.3)
  are not the same price. The flat 2 over-charges every cheap insert — so students hit the
  cap early on cheap chains — and under-charges the compressor, which is the one that
  actually costs.
- **"Reverb = 8"** is **~3× too low** at a 2 s IR. Reverb is by far the most expensive node
  in the app and §8 prices it below its real cost. **This is the line most likely to crash
  a Chromebook while the meter still reads green.**
- **"A patch-synth node = 1"** cannot be one number. Patch nodes span `GainNode` (0.1) to
  `ConvolverNode` (24.7) — a **250× spread** — and **A43** lets students wire them freely.

**`AnalyserNode` caveat:** measured at 0.2 in an offline render, where nothing ever calls
`getByteFrequencyData()`. In the real app the spectrum analyzer and oscilloscope are read
every rAF frame and the FFT runs. **The real cost of an analyser is higher than 0.2 and
was not measured.** `UNVERIFIED`. P1's `scopes` seat should be told to measure it.

**Still `UNVERIFIED` after all of the above:** the absolute number of simultaneous voices a
school Chromebook sustains without glitching. Needs a real device and real hardware. It is
Brandon's recon per **A53**, and P1/P2/P4 TEST seats should log it.

---

## Q3 · HOW DO YOU MEASURE CPU LOAD WITHOUT A PROFILER?

### `VERIFIED` — the technique in CONTRACTS §8 works, exactly as written

The governor needs a runtime 0..1. §8 specifies: scheduler pass duration against the budget
of one lookahead window, smoothed over 20 passes. **That was implemented and run.** Harness `t3`.

```js
const t0 = performance.now();
/* … the scheduler pass does its real work … */
const dur = performance.now() - t0;
hist.push(dur / WINDOW_MS);          // WINDOW_MS = 100
if (hist.length > 20) hist.shift();  // smoothed over 20 passes
governor.load = Math.min(1, hist.reduce((a,b)=>a+b,0) / hist.length);
```

Measured output against known injected load:

| Injected load per pass | `governor.load` |
|---|---|
| 0 ms | **0.000** |
| 5 ms | **0.050** |
| 15 ms | **0.150** |
| 25 ms | **0.250** |
| 50 ms | **0.500** |
| 100 ms | **1.000** |
| 150 ms | **1.000** (clamped) |

**Exactly linear, no calibration constant, no drift.** `load = passDuration / 100 ms`
smoothed over 20 passes is a correct and usable 0..1. **Keep §8's technique unchanged.**

**`performance.now()` resolution: 0.1 ms**, verified by tick-delta sampling (150 distinct
ticks over 200 000 reads, min and median both 0.1 ms). A 25 ms pass is **250 ticks** of
resolution — far more than enough. The clock is not the limiting factor.

**One thing the technique does not catch, and `spec-core` should know it:** this measures
**main-thread** cost. Audio DSP runs on a **separate audio thread**. A graph heavy in
convolvers can saturate the audio thread and glitch while `governor.load` reads near zero,
because the scheduler pass itself is cheap. **The meter as specified will not see that.**
Whether that matters is a design call, not this seat's — flagged for `open-decisions.md`.

---

## Q4 · WHAT BREAKS THE AUDIOCONTEXT?

Four sub-questions. **One verified, three not.** Stated separately and honestly.

### 4a · Autoplay policy — `UNVERIFIED`

Tested in bundled Chromium *and* real headed Chrome 151, on a real `http://127.0.0.1` page,
launched with **no** autoplay flag. Result both times: `state` was **`"running"` on
construction**, `resume()` succeeded with no gesture, and the clock advanced 0.368 s.

**That result is not trustworthy and is not reported as a finding.** A browser launched
under automation does not apply the autoplay gesture gate the way a browser a student
clicked does. The environment suppressed the exact behavior being tested.

**`UNVERIFIED` — reason: automation-launched Chrome bypasses the user-activation gate;
this environment cannot reproduce a genuine first-load autoplay block.**

**What the run should do anyway** (a design instruction, not a measurement): treat
`ctx.state === 'suspended'` as the expected first state, gate the first `resume()` behind
any real user gesture, and never assume the context is running at load. Cheap if
unnecessary, silent total failure if omitted.

### 4b · Sample rate — `VERIFIED` construction, `UNVERIFIED` mismatch

Device default: **48 000 Hz**. Every explicitly requested rate was **honored exactly**:

`3000` · `8000` · `22050` · `44100` · `48000` · `96000` · `192000` — all returned
`sampleRate === requested`, `state: "running"`, no throw. `OfflineAudioContext` at 44 100
against a 48 000 device: fine.

So `new AudioContext({sampleRate})` does **not** throw on this build, even at absurd rates.
**But the failure mode that matters — a context rate fighting a real output device rate —
cannot be provoked with a null sink.** `UNVERIFIED`.

**Consequence that is verified and does matter:** the device default here is **48 kHz**
while §7's render target and P5's WAV work in **44.1 kHz**. Resampling between them is
real work on a slow machine. `spec-core` should decide whether the app **pins** a rate or
**adopts** the device rate. Flagged for `open-decisions.md`.

### 4c · Tab backgrounding — `UNVERIFIED`

Two attempts, both failed to reproduce the condition:
1. Opened a second page and called `bring_to_front()` on it — the first page's
   `document.visibilityState` **stayed `"visible"`**. Zero `hidden` samples collected.
2. Forced `Page.setWebLifecycleState: "frozen"` over CDP — timer gaps stayed at
   **p50 25.1 / p95 26.1 / max 27.1 ms**, `visibilityState` still only ever `"visible"`,
   `AudioContext.state` still `"running"`.

**`UNVERIFIED` — reason: headless/automated Chrome does not background its pages;
the throttled state could not be entered.** This one matters in a classroom — students
switch tabs constantly — and it is untested. It goes to Brandon.

### 4d · Device change — `UNVERIFIED`

**Reason: no audio output device exists in this environment.** Headphones being plugged
into a Chromebook mid-lesson is the real-world case, and it cannot be simulated here.
Brandon's hardware recon per **A53**.

---

## Q5 · IS WEB MIDI AVAILABLE, AND WHAT HAPPENS WHEN IT IS REFUSED?

### `VERIFIED` — and it produced the most load-bearing finding in this file

**Web MIDI requires a secure context.** Measured across four URL schemes in real headed
Chrome 151. Harness `t9`:

| Origin | `isSecureContext` | `navigator.requestMIDIAccess` | `serviceWorker` in navigator |
|---|---|---|---|
| `http://127.0.0.1:8877/` | **true** | **present** | **true** |
| `http://localhost:8877/` | **true** | **present** | **true** |
| `file:///…/index.html` | **true** | **present** | true *(but see below)* |
| `about:blank` | **false** | **absent** | **false** |

This also explains an earlier confusing result: on `about:blank`,
`typeof navigator.requestMIDIAccess` is `"undefined"` even in full headed Chrome. It was
never a Chrome-version issue — **it is the secure-context gate.**

> **Consequence for deployment, and it is not small:** the site must be served from a
> **secure context — HTTPS, or localhost.** Served from a plain
> `http://someschoolserver/`, **Web MIDI disappears and so does the service worker**,
> which takes P5's entire offline-install story with it. **A10** says "Static site, no
> backend" and names no host. **This is now a hosting requirement, and it goes to Brandon.**

### The permission grant

**Per Brandon — recorded as his statement, not as something this seat tested:**
MIDI devices require a **user permission grant**; `navigator.requestMIDIAccess()` triggers
a **browser permission prompt**. This seat did not verify the prompt and does not claim to
have.

**What this seat did measure**, on a secure context, is the call's **latency**:

```
granted: true   inputs: 2   outputs: 2   onstatechange: present
elapsed: 7128.6 ms
```

**`requestMIDIAccess()` took just over 7 seconds to resolve.** Under automation the
permission prompt is auto-accepted, so that 7 s contains **no human deciding** — a real
student reading a dialog makes it longer, not shorter.

> **CONTRACTS §5 already says "Never block startup on it." This measurement proves that
> line is load-bearing.** A startup that `await`s this call gives a student a **7-second
> dead app before a prompt is even answered.** Keep §5 exactly as written.

**The degradation path, verified:** feature detection is a plain
`typeof navigator.requestMIDIAccess === 'function'` check. On a non-secure context it
returns `false` **and throws nothing** — no try/catch needed to detect absence. Refusal
after a prompt surfaces as a **rejected promise**, caught locally. Correct shape:

```js
// fire and forget — never awaited on the startup path
if (typeof navigator.requestMIDIAccess === 'function') {
  navigator.requestMIDIAccess({ sysex: false })
    .then(access => input.attachMIDI(access))   // late arrival is fine
    .catch(() => {});                           // refused: stay silent, per §5
}
```

The other three input routes (mouse, key, touch) are unaffected in every case.

---

## Q6 · CAN AN OFFLINE RENDER PRODUCE A WAV WITHOUT A LIBRARY?

### `VERIFIED` — yes, cleanly, and confirmed by three independent readers

This is P5's whole render story, and the brief asked to find out **now**, not in P5. It works.

Method: `OfflineAudioContext(2, 44100*2, 44100)`, two envelope-shaped oscillators through
`StereoPannerNode`s, `startRendering()`, then a **hand-written 44-byte canonical WAV
header** and manual interleaved 16-bit PCM conversion. **No library, no dependency** —
CONTRACTS §10 forbids dependencies and none was needed. Harness `t5`.

| | |
|---|---|
| Render time, 2 s stereo | **1.4 ms** |
| Realtime factor | **1428×** |
| Output | 88 200 frames · 2 ch · 44 100 Hz · **352 844 bytes** |
| Peak amplitude | **0.4542** — confirms real signal, not silence |

**Verified three independent ways:**

1. **In-browser round-trip** — `decodeAudioData()` on our own bytes returned
   `44100 Hz / 2 ch / 88200 frames / 2.0000 s`. Exact.
2. **Python `wave` module**, outside the browser — `nchannels 2`, `sampwidth 2`,
   `framerate 44100`, `nframes 88200`, `RIFF`/`WAVE` tags correct.
3. **macOS `afinfo`** — `WAVE`, `2 ch, 44100 Hz, Int16, interleaved`, `duration
   2.000000 sec`, `bit rate 1411200`.

A third-party OS-level decoder accepting the file is the strongest available evidence that
the header is right.

> **Answer: yes. `OfflineAudioContext` + a hand-written header produces a valid WAV with no
> library. P5's `render` seat is not blocked. Per-track stems are the same routine run once
> per channel** — the render is ~1400× realtime here, so even a slow Chromebook has enormous
> margin on a short student piece.

**Two limits, stated:** 16-bit PCM only (24-bit/float needs a different header — nobody has
asked for it); and this is offline render throughput, unaffected by the missing audio device.

### Adjacent finding — service worker, `VERIFIED`, and it changes P5

Tested while confirming secure context. Harness `t10`:

| Origin | `navigator.serviceWorker.register()` |
|---|---|
| `http://127.0.0.1:8878/` | **registered**, scope `http://127.0.0.1:8878/` |
| `file:///…/index.html` | **FAILED** — `TypeError: Failed to register a ServiceWorker: The URL protocol of the current origin ('null') is not supported.` |

**The offline build cannot be opened as a file.** `serviceWorker` *appears* present on
`file://` — the property is there — but **registration throws**. P5's "installable, works
offline" requires a real http(s) origin. Every phase DONE-CHECK already says "loads on a
static file server," which is consistent; this confirms the file:// shortcut is not
available as a fallback and Brandon should not expect double-clicking `index.html` to give
an offline app.

---

## Q7 · WHAT DID I FAIL TO VERIFY, AND WHY?

**This list goes to Brandon.** Nothing in it was guessed, filled in, or softened.

### Blocked by having no audio output device (null sink, `outputLatency === 0`)

1. **The absolute voice ceiling** — how many voices before audible glitching. The headline
   number Q2 asked for. Cost *ratios* were measured instead; the ceiling was not.
2. **Device change** — headphones in or out mid-session, and what recovery looks like.
3. **A real sample-rate mismatch** — context rate fighting a device rate.
4. **Real audio-thread saturation** — the failure mode the §8 governor structurally cannot
   see (Q3).
5. **True `AnalyserNode` cost** — offline render never runs the FFT read path. The measured
   0.2 units understates it. P1's `scopes` seat should measure it live.

### Blocked by automation suppressing real browser behavior

6. **The autoplay gesture gate** (Q4a) — automated Chrome does not apply it.
7. **Tab backgrounding and timer throttling** (Q4c) — two methods tried, neither could
   enter the hidden/frozen state. **Relevant to a classroom and untested.**
8. **The Web MIDI permission prompt itself** — recorded **per Brandon**, not tested here.

### Out of this seat's lane by Brandon's own order (**A53**)

9. **Anything on real Chromebook hardware.** "don't recon the real chrome… I'll do the
   recon on deployment." Not attempted. Every absolute in this file is an **M4 Max** number
   and should be read as an upper bound a Chromebook will not reach.

### Not attempted — outside the seat questions

10. **Relative ES-module imports over `file://`**, **`AudioWorklet` cost** (present but
    unused by the current design), **memory ceilings**, and **sample-decode cost for the
    Drum Sampler's kits** (P2). None were asked for; none were tested; none are guessed at.

---

## HANDOFF TO `spec-core` — THE SHORT VERSION

| CONTRACTS line | Finding | Recommendation |
|---|---|---|
| §3 `PPQ = 480` | not a measurable quantity | **keep** — untouched by recon |
| §3 `25 ms` interval | p95 26.2 ms idle; becomes load-bound above budget | **keep** |
| §3 `100 ms` window | absorbs a ~100 ms stall, breaks at ~150 ms | **keep** — margin verified |
| §8 probe technique | linear, exact, no calibration | **keep verbatim** |
| §8 `32 voices` | ceiling `UNVERIFIED` — no audio device | **keep as a conservative default**, do not invent a new number |
| §8 `24 patch nodes` | node cost spans 0.1 → 24.7 units, a 250× spread | **flat count is the wrong unit** — → Brandon |
| §8 `4 inserts/channel` | insert cost spans 0.4 → 4.3 units | over-charges cheap inserts → Brandon |
| §8 `2 sends` | **nothing in the transcript defines a send** (scope §5D) | → Brandon |
| §8 `device insert = 2` | delay 0.4, biquad 0.9, **compressor 4.3** | wrong in both directions → Brandon |
| §8 `reverb = 8` | **measured ~24 units at a 2 s IR** | **~3× under-priced** → Brandon |
| §8 `patch node = 1` | 0.1 (gain) → 24.7 (convolver) | one number cannot hold → Brandon |
| §5 Web MIDI opportunistic | **7.1 s to resolve, secure context required** | **keep §5 exactly** — now proven necessary |
| §1 / P5 packaging | SW needs http(s); **fails on `file://`** | hosting is a **Brandon** decision |
| §7 44.1 kHz | device default is **48 kHz** here | pin or adopt? → Brandon |

**Test harness retained at**
`…/e6910bca-a57b-455a-9fef-7350c0a3514b/scratchpad/recon/` (`t0`–`t10`, plus the verified
`render_test.wav`). It is **outside the project tree** — no scratch files were written into
`Builddocs/`.

**No finding in this file contradicts a BUILDPLAN FIXED DECISION.** The §8 cost-unit
numbers are contradicted by measurement, but §8 lives in CONTRACTS, not in FIXED DECISIONS,
and CONTRACTS is `spec-core`'s to amend this one time.

*End of `findings-webaudio.md`.*
