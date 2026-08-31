# STAGE P3/S2 — THEORY CHECK

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Catch a music error while it is still one paragraph, not eight files.

## WHY THIS STAGE IS HERE
Brandon moved this check **early on purpose.** A REDPEN normally runs at the end of a
phase, against code. This one runs at the front, against the spec, before `scale-engine`,
`chord-engine`, and three surfaces are built on top of it. A wrong color rule caught here
costs a paragraph. Caught in S7 it costs the phase.

## SEATS IN THIS STAGE
- `redpen-theory` — the only seat. REDPEN function. `[L·L·H·H]`

## SHARED FILES
None. It writes one report and edits nothing.

## HANDOFF IN
CONTRACTS §15 from S1. [outline](../../../outline). `receipt-spec-scale.md`, including its
worked example.

## HANDOFF OUT
`Builddocs/P3-harmony-tool/S2-theory-check/theory-report.md` → to the Troubleshooter and
to Brandon.

## STAGE DONE-CHECK
Every clause of the curriculum's Scales and chords section is traced to a line of §15, or
is listed as unserved. Every music error is escalated to Brandon, not corrected.
