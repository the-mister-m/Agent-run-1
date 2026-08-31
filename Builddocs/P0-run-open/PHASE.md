# PHASE P0 — RUN OPEN

Task: what every seat in P0 needs to know. Written by: Opus 5 session, 2026-08-20 01:26 EDT,
with Brandon. Map: [BUILDPLAN.md](../BUILDPLAN.md) · [CONTRACTS.md](../CONTRACTS.md) · [ROSTER.md](../ROSTER.md)

## PHASE GOAL
Settle what is being built and what everything binds to, before one line of instrument
code exists. P0 produces documents, not code.

## WHAT SHIPS
- A cut scope: in / out / deferred, sized.
- A findings file on what Web Audio and school-Chromebook-class browsers actually do.
- [CONTRACTS.md](../CONTRACTS.md) confirmed or amended — the one file every later seat binds to.

## STAGE ORDER
```
S1-scope  →  S2-recon  →  S3-spec-core
```
Strict series. Nothing in P0 runs in parallel. Each stage's output is the next one's input.

## CURRICULUM IT SERVES
None directly. It serves every later phase by making sure no BUILD seat has to guess.

## CONTRACTS THIS PHASE ADDS
P0 does not add to CONTRACTS.md — it **confirms or amends** it. This is the only phase
permitted to amend §1-§10. After S3 closes, CONTRACTS.md is frozen except by Brandon.

## PHASE DONE-CHECK
CONTRACTS.md carries a line at the top reading `CONFIRMED <timestamp> by spec-core`, and
every open question raised in S1 or S2 is either answered in CONTRACTS.md or listed in
`Builddocs/P0-run-open/open-decisions.md` with Brandon named as the decider.
