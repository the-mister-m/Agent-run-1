# RECEIPT — `fix-grid`, repair seat, function BUILD

Spawned by the Troubleshooter to close the bug `beat-shell` (P2/S6) found in an
already-closed file during integration:
[receipt-beat-shell.md](receipt-beat-shell.md) item 4 / OPEN DECISIONS item 6.
Owns `/src/surfaces/step-grid.js` only.

Opened: 2026-08-23 19:44 EDT · Closed: **2026-08-23 19:48 EDT**

---

## DELIVERABLE STATE

**Fixed, reproduced first, and re-verified in a real headless browser (Playwright /
Chromium 148).**

### The bug, exactly as found

`_renderLane(index)` builds each lane row once (`if (!row) { … }`) and attaches the
division button's `click` listener inside that same one-time block, closing over
`const lane = this._pattern.lanes[index]` — the lane object that existed at that moment.
`setPattern()` replaces `this._pattern.lanes` with **brand-new lane objects**
(`pattern.lanes.map(...)`), and `capture.js` calls `setPattern()` on every
live-projected note during recording (`_liveProject`, `_flushDeferred`, `_commit`).
Once that happens once, the closure's `lane` is permanently orphaned — never
reassigned, because an existing row's listener is never re-attached — and every
click after that computes its toggle direction from that one frozen snapshot,
forever, regardless of what the lane's real division actually is.

**Why it doesn't fail on the very next click, only sometimes:** the first click after
a `setPattern` still happens to toggle correctly, because the stale snapshot and the
live lane still agree (nothing but a click changes division, and the frozen snapshot
was taken at that value). It's the click *after that* — once the live lane has since
changed via the earlier click but the stale snapshot hasn't — where the button
computes the value the lane **already has**, and `setLaneDivision`'s own
`if (next === lane.division) return;` guard makes it a silent no-op. No error, no
console output, nothing — the button just stops doing anything.

### Repro, before the fix (throwaway test page + Playwright, real browser, project's
own `StepGrid` class, no mocks of the class under test)

Sequence: mount → `setPattern(getPattern())` (mimics capture.js's live-projection
call) → click → `setPattern(getPattern())` again → click again.

| Step | `lane.division` |
|---|---|
| mount | 4 |
| after 1st `setPattern` (before any click) | 4 |
| click 1 (4 → 3, triplet) | **3** — correct |
| after 2nd `setPattern` | 3 |
| **click 2 (expect 3 → 4)** | **3 — BUG: silent no-op** |

Confirmed against `/tools/beat.html` itself too, not just the throwaway page — same
sequence, driving the real mounted grid via `window.cbdawBeat.grid`, same result:
click 2 no-op'd, button stuck on `"T"` / `aria-pressed="true"` when it should have
flipped to `"4"` / `aria-pressed="false"`. Zero page errors either way — the whole
point of the bug is that it fails **silently**.

### The fix

One change, in `_renderLane`'s one-time listener-attach block: read
`this._pattern.lanes[index]` **fresh, at click time**, instead of closing over the
object captured at row-creation time. `index` (the lane's fixed §14.1 position) is
the only thing safe to close over — it never changes; the object at that position
does, via `setPattern`.

```js
this._addDom(el.querySelector('[data-lane-act="division"]'), 'click', (e) => {
  e.stopPropagation();
  const current = this._pattern.lanes[index];
  if (!current) return;
  const next = current.division === TRIPLET_DIVISION ? DEFAULT_DIVISION : TRIPLET_DIVISION;
  this.setLaneDivision(index, next);
});
```

The `if (!current) return;` guard follows §11.7(b)'s no-throw-on-malformed-input
principle, already this file's own stated philosophy (see the file's comment on
`setPattern`) — a defensive read, not new behavior; `this._pattern.lanes[index]`
never actually becomes undefined in the current design (§14.1 fixes exactly eight
lanes, index-stable), but the read is no longer trusted to be the same object it was
at mount, so it shouldn't be trusted to exist either without a check.

### Re-verified after the fix, same two harnesses, same sequence

| Step | `lane.division` |
|---|---|
| mount | 4 |
| after 1st `setPattern` | 4 |
| click 1 | 3 |
| after 2nd `setPattern` | 3 |
| **click 2 (expect 3 → 4)** | **4 — FIXED** |

On `/tools/beat.html`: button label and `aria-pressed` now update correctly through
the same sequence too (`"4"` / `false` → `"T"` / `true` → `"4"` / `false`). Zero page
errors before or after.

### What was NOT touched, and how that's known rather than assumed

Only `/src/surfaces/step-grid.js` was edited. Every other file this bug touches
(`capture.js`, `clock.js`) was read, never written — verified by content, since a
concurrent seat's own activity in this shared repo moved `clock.js` and `shell.js`'s
mtimes during this session and an mtime-only check would have been misleading here.
This seat's own edit tool calls in this session targeted exactly two paths: this
file, and a throwaway test page under `docs/scratchpad/`, deleted after use (see
STRAY FILES).

## NEXT ACTION

None for this seat. Fix closes receipt-beat-shell.md OPEN DECISIONS item 6. Handoff
to the Troubleshooter to close the finding.

## OPEN DECISIONS

None raised by this fix. The other items in receipt-beat-shell.md's OPEN DECISIONS
(1–5, 7–12) are unrelated to this bug and untouched by this fix.

## FILE LOCATIONS

- Fixed: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/surfaces/step-grid.js`
  (the one-time click-listener block inside `_renderLane`)
- This receipt: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S6-shell/receipt-fix-grid.md`
- Bug source: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S6-shell/receipt-beat-shell.md` item 4 / OPEN DECISIONS item 6
- Read, never edited: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/core/capture.js`,
  `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/CONTRACTS.md` §13

### STRAY FILES (created, then removed — none left behind)

- `docs/scratchpad/repro-lane-division.html` — throwaway Playwright-driven repro page,
  built to reproduce the bug before fixing it and re-run after. Created, run against
  the pre-fix code (bug reproduced), run again against the fixed code (bug gone),
  then deleted. Not part of the deliverable.
- A local `python3 -m http.server 8123` (project root) used to serve the ES modules
  for both the throwaway page and `/tools/beat.html` during verification — stopped
  after use.

### Verification harnesses used (both real Chromium via Playwright, not eyeballed)

1. Throwaway page importing `StepGrid` directly with a minimal fake clock — isolates
   the class under test with no other seat's file in the loop.
2. The real `/tools/beat.html` via `window.cbdawBeat.grid` — same sequence, driven
   through the actual integrated page `beat-shell` built, confirming the fix holds in
   the real DOM the grid ships in (button label / `aria-pressed`, not just the data).
