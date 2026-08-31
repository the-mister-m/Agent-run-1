# RECEIPT — `fix-shell`, repair seat (BUILD)

Spawned by the Troubleshooter to close item 3 in
[receipt-beat-shell.md](receipt-beat-shell.md) — `shell.js` exported `createFileMenu` and
`createCpuMeter` but not the module-private `acquireShellStyle()` those components need to
render styled, forcing `beat.html` to carry a marked byte-identical CSS duplicate.

Owns `/src/ui/shell.js` only. Did not touch `beat.html`, `wave-synth.html`,
`overtone-synth.html`, or any other tool page.

Stamped: 2026-08-23 19:46 EDT.

---

## DELIVERABLE STATE

**Fixed.** `acquireShellStyle()` and `releaseShellStyle()` in `/src/ui/shell.js` are now
named exports. No other line in the file changed — `createFileMenu`, `createCpuMeter`,
`ToolShell`, and every other export keep their existing signatures and behavior.

```js
export function acquireShellStyle() { … }   // was: function acquireShellStyle() { … }
export function releaseShellStyle() { … }   // was: function releaseShellStyle() { … }
```

`ToolShell.mount()`/`unmount()` still call these two functions internally, unchanged — the
fix widens who can reach the same ref-counted singleton, it does not add a second path.

**Verified in a real browser, headless Chromium, over `python3 -m http.server`, viewport
1366×768 (P1's own DAW-target size):**

| Check | wave-synth.html | overtone-synth.html |
|---|---|---|
| mounts, `.cbdaw-shell` present | true | true |
| `.cbdaw-shell__error` box present | false | false |
| console errors | 0 | 0 |
| page errors | 0 | 0 |
| file menu count / styled | 1, `border-radius: 6px`, `border: rgb(58,72,95)`, `background: rgb(10,13,19)` | same |
| CPU meter track visible, rAF live (`frameCount` climbing) | true | true |

P1's two shipped tools render and behave exactly as before — this repair did not regress
already-shipped output.

**New export proved with a throwaway page** (`import { createFileMenu, acquireShellStyle,
releaseShellStyle } from '/src/ui/shell.js'`, written to `docs/scratchpad/`, deleted after
the check — not a deliverable):

| Check | Result |
|---|---|
| stylesheet absent before any `acquireShellStyle()` call | true |
| `acquireShellStyle()` injects `#cbdaw-shell-style` | true |
| `createFileMenu`'s button picks up shell's real CSS (not fallback/unstyled) | `border-radius: 6px`, `padding: 7px 12px` — shell.js's own rule, matched exactly |
| page's own `<style>` tag count | **0** — no CSS duplicated on the consuming page |
| second `acquireShellStyle()` call (simulating a second consumer) | still exactly 1 `#cbdaw-shell-style` tag — ref-counted, not re-injected |
| one `releaseShellStyle()` (of two refs) | stylesheet still present |
| second `releaseShellStyle()` | stylesheet removed |

That is the actual bug closed: a consumer can now pull the stylesheet through the exported
function and apply it with zero duplicated CSS, and the ref count behaves the same as it
does inside `ToolShell` itself.

## NEXT ACTION

None for this seat. `beat.html`'s marked duplicate CSS block (its own OPEN DECISIONS #1) can
now be deleted in favor of `import { acquireShellStyle, releaseShellStyle } from
'../src/ui/shell.js'` — that edit is `beat-shell`'s file, not this seat's, so it is not made
here. P3 seats reusing `shell.js` hit the same export already available; no further
`shell.js` change is needed for that.

## OPEN DECISIONS

None raised by this fix. The two items directly downstream are both other seats' calls:

1. Deleting the duplicate CSS block in `tools/beat.html` now that the export exists —
   `beat-shell`'s file, flagged for the Troubleshooter to route.
2. `receipt-beat-shell.md` OPEN DECISIONS #2 (`TOOLS` table's `beat` row still
   `available: false`) is untouched by this fix and remains open — different bug, same
   file, not what this seat was spawned to close.

## FILE LOCATIONS

- Fixed: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/ui/shell.js`
- This receipt: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S6-shell/receipt-fix-shell.md`
- Finding closed: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S6-shell/receipt-beat-shell.md` (item 3 under OPEN DECISIONS)
- Verification: headless Chromium (Playwright) against `python3 -m http.server`, serving
  `/tools/wave-synth.html`, `/tools/overtone-synth.html`, and a throwaway import-test page
  (written to and deleted from `docs/scratchpad/` — not left behind)

**Lane, proved by mtime.** `find src tools assets docs -type f -newermt
"2026-08-23T19:20:00"` returns three paths: `src/ui/shell.js` (this seat, 19:44:45 —
the only file this seat edited), plus `tools/beat.html` (19:39:54) and
`docs/scratchpad/repro-lane-division.html` (19:46:25) — both touched by other concurrent
seats, neither opened or written by this one.
