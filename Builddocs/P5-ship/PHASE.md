# PHASE P5 — SHIP

Task: what every seat in P5 needs to know. Written by: Opus 5 session, 2026-08-20 01:26 EDT,
with Brandon. Map: [BUILDPLAN.md](../BUILDPLAN.md) · [CONTRACTS.md](../CONTRACTS.md) · [ROSTER.md](../ROSTER.md)

## PHASE GOAL
Make the work leave the browser, and make the app survive a school network.

## WHAT SHIPS
- **Project save and load** — JSON, local, reloadable. Plus preset files for a single
  instrument or kit.
- **Audio render** — WAV of the full mix **and per-track stems.**
- **MIDI export** — `.mid`, so students can take what they made into a real DAW. Brandon
  asked for this specifically. **Import is deferred.**
- **Package** — a bundle step and a service worker. Installable, works offline.
- Then it goes to Brandon. **Brandon deploys. There is no deploy seat.**

## STAGE ORDER
```
S1-spec → S2-formats ‖ → S3-recon → S4-package → S5-verify → BRANDON
          ┌ save-load
          ├ render
          └ midi-export
```
S2's three seats run **in parallel**. See S2's STAGE.md collision map.

## THE BUILD STEP
This is the **only** phase permitted to add one. CONTRACTS §10 forbids a build step
everywhere else, and that was deliberate: the whole app is plain ES modules, so bundling is
a step run **over** finished code, not a different way of writing it. Nothing in `/src`
changes to accommodate the bundler.

## HARDWARE
Brandon does the hardware recon at deployment, on real Chromebooks, himself. This phase's
job is to hand him a package and a metrics report — **and to make sure the `noCap` dev
toggle is still there when he opens it.** He intends to push the machines until they crash.

## CONTRACTS THIS PHASE ADDS
`spec-formats` (S1) may extend CONTRACTS.md with **file formats** as §17. It may not change
§1-§16.

## PHASE DONE-CHECK
A project saves, reloads identically, renders a WAV mix and stems, exports a `.mid` that
opens in a real DAW, and the packaged build installs and runs with the network off — with
the `noCap` toggle present and working in the packaged build.
