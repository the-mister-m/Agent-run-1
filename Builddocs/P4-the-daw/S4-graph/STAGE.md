# STAGE P4/S4 — NODE GRAPH

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Build the routing graph. Brandon: **"both, graph is the point."** The strip shows routing;
the graph is where routing is made.

## SEATS IN THIS STAGE
- `node-graph` — the only seat. BUILD function. `[H·M·H·H]`

## SHARED FILES
`/src/mixer/graph.js` — this seat creates it. Nobody in S3 was permitted to build it.
Everything from S3 — **read only.**

## HANDOFF IN
All nine files from S3, the shell and `state.js` from S2, CONTRACTS §16.

## HANDOFF OUT
`/src/mixer/graph.js` → to `automation`, `governor`, and P5's save seat.

## STAGE DONE-CHECK
A student can add an insert from the graph, build a parallel chain, and see both reflected
on the strips without ever editing a strip.
