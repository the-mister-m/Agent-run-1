# STAGE P4/S1 — SPEC

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Write the channel, device, and graph contracts so **six** parallel BUILD seats in S3 never
have to talk to each other. This is the largest fan in the run and the spec is what makes
it safe.

## SEATS IN THIS STAGE
- `spec-transport` — the only seat. SPEC function. `[H·L·H·H]`

## SHARED FILES
`Builddocs/CONTRACTS.md` — append only, as §16. §1-§15 are frozen.

## HANDOFF IN
CONTRACTS §2, §3, §7, §8, §13, §15. All three phase report pairs from P1, P2, P3.

## HANDOFF OUT
CONTRACTS §16 → to every seat in P4 and P5.

## STAGE DONE-CHECK
Six builders could work from §16 alone, at the same time, without a single message between
them.
