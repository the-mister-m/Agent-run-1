# STAGE P5/S1 — SPEC

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Pin down four file formats so three parallel seats never have to talk.

## SEATS IN THIS STAGE
- `spec-formats` — the only seat. SPEC function. `[M·L·H·M]`

## SHARED FILES
`Builddocs/CONTRACTS.md` — append only, as §17. §1-§16 are frozen.

## HANDOFF IN
CONTRACTS §7 and §16. P4's two reports. `findings-webaudio.md` question 6, on whether an
offline WAV render is achievable with no library.

## HANDOFF OUT
CONTRACTS §17 → to all three S2 seats and to `package`.

## STAGE DONE-CHECK
Three builders could write the save file, the WAV writer, and the MIDI writer from §17
alone, at the same time.
