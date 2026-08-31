# ROSTER — Chromebook DAW

Task: every seat in the run, its function, and its ratings. Written by: Opus 5 session,
2026-08-20 01:26 EDT, with Brandon. Map: [BUILDPLAN.md](BUILDPLAN.md).

**EVERY SEAT READS THIS FILE** — you need to know the crew you are on.

---

## THE SIX FUNCTIONS

| Function | Does | Never does |
|---|---|---|
| **SCOPE** | cuts what is in, out, deferred; sizes the work | writes code |
| **RECON** | verifies unknowns against reality, writes findings | writes code |
| **SPEC** | writes the contract builders bind to | writes code |
| **BUILD** | writes code | changes a contract |
| **TEST** | runs the acceptance check, reports pass/fail + metrics | fixes what it finds |
| **REDPEN** | reads output against contract or curriculum, marks drift | fixes what it finds |

TEST and REDPEN **report**. They do not repair. A failure goes back to the seat that
owns the file, or to the Troubleshooter if that seat has ended its run.

---

## STANDING SEAT

**Troubleshooter** — runs the session, settles judgment calls, builds nothing.
`[size M · drift L · decisions H · blast H]`
Contract: [skills/troubleshooter-seat.md](skills/troubleshooter-seat.md).
Its context is the most expensive resource in the run. Everyone protects it: never
paste raw work product at it, never send it anything a receipt already says.

---

## SEATS BY PHASE

Ratings are `[size · drift · decisions · blast]`, H/M/L.

### P0 · RUN OPEN
| Seat | Fn | Rating |
|---|---|---|
| scope | SCOPE | M·L·H·H |
| recon-webaudio | RECON | M·L·M·M |
| spec-core | SPEC | H·L·H·H |

### P1 · TONE TOOL
| Seat | Fn | Rating |
|---|---|---|
| spec-voice | SPEC | M·L·H·H |
| audio-core | BUILD | H·L·M·H |
| wave-voice | BUILD | M·L·L·M |
| overtone-voice | BUILD | M·L·M·M |
| keys-input | BUILD | M·L·M·H |
| scopes | BUILD | M·L·L·L |
| tone-shell | BUILD | M·M·M·M |
| test-p1 | TEST | M·L·L·L |
| redpen-p1 | REDPEN | M·L·M·M |

### P2 · BEAT TOOL
| Seat | Fn | Rating |
|---|---|---|
| spec-clock | SPEC | M·L·H·H |
| recon-scheduler | RECON | L·L·M·M |
| clock | BUILD | H·L·M·H |
| grid | BUILD | M·L·L·M |
| drum-synth | BUILD | M·L·L·L |
| drum-sampler | BUILD | M·L·M·M |
| capture | BUILD | M·M·M·M |
| beat-shell | BUILD | L·M·L·L |
| test-p2 | TEST | M·L·L·L |
| redpen-p2 | REDPEN | M·L·M·M |

### P3 · HARMONY TOOL
| Seat | Fn | Rating |
|---|---|---|
| spec-scale | SPEC | M·L·H·H |
| redpen-theory | REDPEN | L·L·H·H |
| scale-engine | BUILD | M·L·H·H |
| chord-engine | BUILD | H·L·H·M |
| scale-circle | BUILD | M·M·M·M |
| diatonic-keys | BUILD | M·L·L·M |
| piano-roll | BUILD | H·M·M·M |
| chord-module | BUILD | M·M·M·M |
| state-seam | BUILD | not rated — spawned mid-session per Brandon's direct instruction, not planned at ROSTER's writing. See [receipt-state-seam.md](P3-harmony-tool/S5-surfaces/receipt-state-seam.md). |
| test-p3 | TEST | M·L·L·L |
| redpen-p3 | REDPEN | M·L·M·M |

### P4 · THE DAW
| Seat | Fn | Rating |
|---|---|---|
| spec-transport | SPEC | H·L·H·H |
| daw-shell | BUILD | H·M·H·H |
| arrangement | BUILD | H·M·M·H |
| mixer-strips | BUILD | H·M·M·H |
| device-dynamics | BUILD | M·L·L·M |
| device-spectral | BUILD | M·L·L·M |
| device-space | BUILD | M·L·M·M |
| patch-synth | BUILD | H·M·M·M |
| node-graph | BUILD | H·M·H·H |
| automation | BUILD | M·L·L·M |
| governor | BUILD | M·L·H·H |
| test-p4 | TEST | M·L·M·M |
| redpen-p4 | REDPEN | M·L·M·M |

### P5 · SHIP
| Seat | Fn | Rating |
|---|---|---|
| spec-formats | SPEC | M·L·H·M |
| save-load | BUILD | M·L·M·H |
| render | BUILD | M·L·L·M |
| midi-export | BUILD | M·L·L·L |
| recon-package | RECON | L·L·M·M |
| package | BUILD | M·L·M·H |
| test-p5 | TEST | M·L·M·M |
| redpen-p5 | REDPEN | M·L·M·M |

---

## COUNT

| Function | Seats |
|---|---|
| SCOPE | 1 |
| RECON | 3 |
| SPEC | 6 |
| BUILD | 33 |
| TEST | 5 |
| REDPEN | 6 |
| **Total** | **54** |

54 seats plus the standing Troubleshooter (33 BUILD, 21 not — roughly 39% of the run writes
no code). Deploy is Brandon and is not a seat. **`state-seam` (BUILD, P3) is the 54th** —
spawned mid-P3, after this table's original count, per Brandon's direct instruction; see its
row in the P3 table above.

---

## CHAIN OF COMMAND

Brandon → Troubleshooter → seat.

The Troubleshooter assigns with Brandon's authority. Brandon overrides all. A seat
that is blocked messages the Troubleshooter and **waits** — it does not improvise,
guess, or expand scope. "I don't know" sent early beats invented work sent late.

Tap-out requests are the one exception: they go **to Brandon directly in chat**, not
through the message system. See [skills/tapout-receipt.md](skills/tapout-receipt.md).
