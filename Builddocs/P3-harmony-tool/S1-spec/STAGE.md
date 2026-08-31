# STAGE P3/S1 — SPEC

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Write the theory contract. Everything in this phase — and every pitch label anywhere in the
app — computes from it.

## SEATS IN THIS STAGE
- `spec-scale` — the only seat. SPEC function. `[M·L·H·H]`

## SHARED FILES
`Builddocs/CONTRACTS.md` — append only, as §15. §1-§14 are frozen.

## HANDOFF IN
CONTRACTS §4 (scale state), §6 (overlay labels). [outline](../../../outline). P2's reports.

## HANDOFF OUT
CONTRACTS §15 → straight into `redpen-theory`, which reads it against the curriculum
before any of it is built.

## STAGE DONE-CHECK
§15 is specific enough that `redpen-theory` can find a music error in it without reading
code — because there is no code yet.
