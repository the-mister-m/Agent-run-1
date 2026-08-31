# STAGE P1/S1 — SPEC

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Write the voice contract and the input contract precisely enough that four parallel BUILD
seats in S3 never have to talk to each other.

## SEATS IN THIS STAGE
- `spec-voice` — the only seat. SPEC function. `[M·L·H·H]`

## SHARED FILES
`Builddocs/CONTRACTS.md` — **append only**, as new sections §11 and §12. §1-§10 are frozen.

## HANDOFF IN
CONTRACTS.md (frozen by `spec-core`), `findings-webaudio.md`, [PHASE.md](../PHASE.md).

## HANDOFF OUT
CONTRACTS §11 (voice) and §12 (input surfaces) → read by every seat in P1 and reused in
P2, P3, P4.

## STAGE DONE-CHECK
A BUILD seat can write `wave-synth.js` and `overtone-synth.js` from §2 + §11 alone,
without asking a question.
