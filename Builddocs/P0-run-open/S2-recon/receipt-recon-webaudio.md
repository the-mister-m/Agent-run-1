# RECEIPT — recon-webaudio (P0/S2)

Stamped 2026-08-22 23:37 EDT. Written under a `goto` override. One receipt for the stage,
not seven. Ran **after** S1 and **before** S3, in strict series — S3 consumed this file's
real output, not a placeholder.

## DELIVERABLE STATE

**DONE.** [findings-webaudio.md](../findings-webaudio.md) answers all seven seat questions.

**An execution path existed and was used.** The brief allowed for there being none. I
checked before assuming: **Playwright 1.60.0 + bundled Chromium + the real Google Chrome
151.0.7922.170** installed on this machine. Every number came out of a real browser.
**Nothing was stated from memory.**

| Q | State | Result |
|---|---|---|
| **1** scheduler | **VERIFIED** | 25 ms / 100 ms **hold — KEEP BOTH.** `setInterval(25)` p95 **26.2 ms**. The 100 ms window absorbs a **100 ms** stall with **zero** late events; breaks at **150 ms**. Rule: **lookahead must exceed worst-case main-thread block** |
| **2** voice cost | **SPLIT** | **Ratios VERIFIED, absolute ceiling UNVERIFIED.** Plain voice **0.206 ms/voice/audio-sec**, +biquad **0.881** — **a biquad is 4.3× a voice.** Linear from 16 voices up |
| **3** CPU probe | **VERIFIED** | §8's technique is **correct — keep verbatim.** Injected load → `governor.load` mapped exactly linear: 5 ms→0.05, 25→0.25, 100→1.00. `performance.now()` resolution **0.1 ms** |
| **4** what breaks it | **1 of 4 VERIFIED** | sample-rate construction verified (every rate 3 k–192 k honored; device default **48 kHz**). **Autoplay, backgrounding, device-change all UNVERIFIED** |
| **5** Web MIDI | **VERIFIED** | **Requires a secure context** — absent on non-secure origins. Resolve took **7128 ms**. Degradation is a `typeof` check that throws nothing |
| **6** WAV render | **VERIFIED** | **Yes, no library.** `OfflineAudioContext` + hand-written 44-byte header, confirmed **three independent ways** |
| **7** failures | **DONE** | 10 items listed, grouped by cause. Nothing guessed |

**The finding that changed the most:** §8's cost units are wrong **in both directions.**
Measured against a plain voice: gain **0.1**, delay **0.4**, biquad **0.9**, compressor
**4.3**, **convolver 24.7** — where §8 said "insert = 2, reverb = 8." **Reverb was priced
~3× under its real cost** — the line most likely to crash a Chromebook with a green meter.

**Second finding, unasked but load-bearing:** service worker registration **fails over
`file://`** and succeeds over `http://`. P5's offline story requires a real origin.

## NEXT ACTION

**None for this seat.** S2 is closed and S3 consumed it.

Carried forward as instructions to later seats:
- **P1 `scopes`** — measure real `AnalyserNode` cost live. The 2-unit figure is a floor;
  the offline render never ran the FFT.
- **P2 `recon-scheduler`** — re-measure Q1 against the real clock. **If late notes appear,
  raise the 100 ms window, not the 25 ms interval.**
- **P1/P2/P4 TEST seats** — log the absolute voice ceiling. This seat could not.

## OPEN DECISIONS

- **§8 cost units** — corrected by `spec-core` from these measurements. The *policy*
  question (flat node counts vs. summed weight) → **D-7**.
- **`2 sends`** — nothing defines a send. → **D-3**
- **Hosting must be HTTPS** or MIDI and offline both vanish. → **D-2**
- **48 kHz device vs 44.1 kHz spec** — pin or adopt? → **D-6**
- **No finding contradicts a BUILDPLAN FIXED DECISION.** §8 is contradicted by
  measurement, but §8 lives in CONTRACTS, which P0 is the one phase allowed to amend.
  Nothing needed escalation on that ground.

**Honest limits on every number above:** measured on an **Apple M4 Max, 64 GB, macOS
15.7.3, with no audio output device** (`outputLatency === 0`). **Ratios transfer;
absolutes do not.** Per **A53** no Chromebook was touched — that is Brandon's recon at
deployment.

## FILE LOCATIONS

- **Written:** `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P0-run-open/findings-webaudio.md`
- **This receipt:** `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P0-run-open/S2-recon/receipt-recon-webaudio.md`
- **Test harness (11 scripts + verified `render_test.wav`):**
  `/private/tmp/claude-501/-Users-moth3rship-Desktop-AI-Design-School-stuff-Chromebook-DAW-Agent-run-1/e6910bca-a57b-455a-9fef-7350c0a3514b/scratchpad/recon/`
  **Outside the project tree — no scratch was written into `Builddocs/`, and
  `recon-scratch/` was not created** since it was not on the authorized write list.
- **Touched nothing else.** No `/src`, no CONTRACTS (that is S3), no scope.md.
