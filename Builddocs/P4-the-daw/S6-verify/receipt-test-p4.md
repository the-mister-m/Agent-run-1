# RECEIPT — test-p4 — P4/S6

2026-09-01 02:27 EDT

SEAT: `test-p4` (TEST, report only — no fixes made, none authorized). Brief:
[A-test-p4.md](A-test-p4.md). Full answers: [test-report.md](test-report.md).

## DELIVERABLE STATE

All ten seat questions answered — pass, fail, unverified, or a number, per the brief's
done-check. Report written headed, live, against the running app, not from static reading
alone: Playwright's own Chromium, `http://127.0.0.1:8793/index.html`, served from the project
root.

**Headline finding:** the app as currently wired mounts **zero instruments onto any
channel** — `src/ui/daw-shell.js`'s `wireDawShell()` takes an `instrumentCtor` param it never
reads, confirmed by source inspection and by `receipt-shell-cleanup.md` (which deliberately
removed the only code that ever used it). This fails the PHASE done-check's "six instruments
on six channels run on one transport" clause outright, and blocks full verification of Q3,
half of Q4, half of Q6, and the first row of Q9's metrics table. Two further dead-integration
gaps, same shape: `governor`'s P4 breakdown meter (`src/ui/cpu-meter.js`) is never imported
by the app, and device pop-outs (`onDevicePopout`/`onSlotPopout`) are never wired to the
`device-popout` mount. All three are `daw-shell`'s file, `src/ui/daw-shell.js`, per CONTRACTS
§16.11.

Everything else measured live and matched CONTRACTS exactly: the 32-voice cap, the 4-insert
cap, reverb's full six-point IR-cost table (133/150/165/184/235/325), the delay 95% feedback
clamp, the automation schema, the fader-grab rule, zero leaks over 20 full mount/dispose
cycles, and a correctly-built §16.5b parallel chain with a live-read cap refusal.

## NEXT ACTION

- `daw-shell` (or the Troubleshooter, if that seat has ended its run): wire an instrument
  onto at least `ch1` so P4's core claim — six instruments on one transport — becomes
  testable at all. Wire `createGovernorMeter` in place of the base meter. Wire
  `onDevicePopout`/`onSlotPopout` to the `device-popout` mount.
- `device-dynamics`: check whether the compressor's gain-reduction visual draws via canvas or
  DOM/CSS — this pass's canvas-selector check found none and cannot rule out its own
  methodology being wrong.
- `redpen-p4`: this report and `test-report.md` are your inputs.
- Brandon: three items in test-report.md's AWAITING-BRANDON section need ears, with exact
  reproduction steps, in the still-open browser tab.

## OPEN DECISIONS

None escalated. No CONTRACTS §8 cap number is in question — every cap measured this pass
matched the contract exactly. The three gaps above are integration/wiring reports, not
requests to change a number.

## FILE LOCATIONS

See test-report.md's FILE LOCATIONS section — not repeated here.
