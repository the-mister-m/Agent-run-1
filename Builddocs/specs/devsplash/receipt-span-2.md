RECEIPT — devsplash span 2 — 2026-09-01, 15:11–16:05 EDT

DONE:
9. Matrix persistence + presets + copy-JSON (§7) — `tools/dev-splash.html`:
   `serializeNode`/`deserializeNode` (piece id + channel + ratio only, never DOM or view
   handles), `saveLayout()`/`readStoredLayout()` on `localStorage['cbdaw-devsplash:layout']`
   inside try/catch, `setLayout()` (tears the tree down, renders, remounts every filled
   slot). Auto-save wired into all six mutators: `setSlotPiece`, `emptySlot`, `splitSlot`,
   `mergeSplit`, `swapSlots`, and the divider's pointerup when it actually dragged.
   `#dsp-matrix-bar` — the element span 1 left deliberately empty — now holds the presets
   dropdown ("1×1", "2×2", "DAW-ish", hand-built trees) and [save] [reset] [copy JSON]
   plus a flash readout. Restore-on-load runs before the auto-save is armed.
10. Sweep — leak pass over all 37 rail rows ×2, §12 whole-page done-check, BLOCKED census.
    No code change needed; the page passed as span 1 left it plus item 9.

STOPPED AT: nothing pending — §11 items 1-10 are all complete and §12 is all true.
The checklist is finished. The page is not left broken: a clean load lands on 37 rail rows,
one empty Matrix slot, both tabs switching, console clean.

LIVE (headed Chrome — `chromium.launch({ headless: false, channel: 'chrome' })` via
playwright-core, never headless — against the `python3 -m http.server 8000` already
running; screenshots in `docs/scratchpad/`):

- Item 9, presets + copy: bar renders [save] [reset] [copy JSON] and preset options
  [preset… / 1×1 / 2×2 / DAW-ish]. "DAW-ish" builds 6 slots and mounts all 6 — Project
  Header / Transport Bar / Playing Surface Block / All 7 Strips / Arrangement / Node Graph,
  with `.cbdaw-dawhead`, `.cbdaw-transport`, `.cbdaw-arr` and 7 strip cells live in the DOM.
  [copy JSON] put valid parseable layout JSON on the clipboard (verified by reading the
  clipboard back, not by trusting the flash).
- Item 9, persistence: divider dragged 0.5 → 0.288, `flex: 0 0 calc(28.8% - 3px)` applied
  live, and `localStorage` held ratio 0.288 — the stored value matched the live tree.
  Dragged past the edge clamps to 0.1 and stores 0.1. A channel change ch1 → ch4 persists.
  After reload the serialized tree was BYTE-IDENTICAL to the pre-reload tree, 4/4 slots
  remounted, ratio 0.1 restored, `Strip ch4` still reading ch4.
- Item 9, degrade path: a hand-planted bad record (`piece: "no-such-piece"`, `channel:
  "ch9"`, `ratio: 5`) restored as an empty slot for the unknown piece, `strip` snapped back
  to its default `ch1` for the unknown channel, and ratio 5 clamped to 0.9. No throw.
- Item 9, reset: [reset] clears storage, returns one empty slot, flashes "reset". [save]
  writes explicitly and flashes "saved".
- Item 10, teardown leak pass: every one of the 37 rail rows mounted, then all 37 again.
  Listener counts measured with CDP `DOMDebugger.getEventListeners` (no prototype patching)
  — document 1, window 18, `#dsp-host` 0, IDENTICAL after pass 1 and after pass 2. DOM node
  count 343 after pass 1 and 343 after pass 2. Delta zero on every counter. Zero page
  errors, zero console errors across the whole 74-mount sweep.
- §12 six-slot Matrix, built through the UI (2×2 preset, then two ⇆ splits, then six picks):
  Project Header + Transport Bar + Strip ch1 + Node Graph + Arrangement + Automation gain
  ch1, all 6 mounted simultaneously. Saved, reloaded, restored byte-identical with 6/6
  remounted and the real class roots back in the DOM.
- §12 tone through a channel: routed to ch1, tone on → ch1 `meterTap` RMS 0 → 0.0741,
  ctx "running", and the ch1 strip's OWN meter canvas lit (160 pixels above threshold).
  Tone off → RMS back to 0.
- §12 four dials: dev box mounts COLLAPSED (root `#cbdaw-devbox`, a "dev" handle) — click
  the handle for the panel. All four dials visibly reshape the page: `--fs-root` 12px→22px
  moved rail type 11.00px → 20.17px; `--sp-unit` 2px→10px moved top-bar padding 12px → 60px
  and bar height 47px → 127px; `--r-unit` 2px→14px moved card radius 8px → 56px; `--bw`
  1px→4px moved the bar border 1px → 4px. Page still fully working with the skin cranked.
- §12 clean load: `#dev` load gives title "DEV SPLASH", dev box present, 37 rail rows, all
  7 group headings, one Matrix slot, body painting `rgb(10,13,19)` = `--bg`, ctx "suspended"
  before any gesture and "running" after one click. Console clean.

BLOCKED: no catalog row is blocked. Every §4 row mounts alone in tab 1 — proven twice over
in the leak pass (37 rows × 2, zero BLOCKED notes). Four conditional refusals, all thrown
BY DESIGN from `src/`, all caught and printed in the host, none a fault in this page —
full census run this span, one instrument at a time:

- `scope` + Wave Synth — REFUSED, `src/vis/scope.js:140`. "the oscilloscope belongs to
  Overtone Synth ONLY. Wave Synth's visual is the spectrum analyzer."
- `spectrum` + Overtone Synth — REFUSED, `src/vis/spectrum.js:151`. The mirror rule.
- `spectrum` + Drum Sampler AND `scope` + Drum Sampler — BOTH REFUSED (same two lines).
  The drum sampler offers neither tap. Span 1 did not catch this pair; it is new here.
- `spectrum`/`scope` with no ch1 instrument — the host says "mount an instrument first".
- Mounting cleanly: spectrum + Wave/Patch/Drum Synth; scope + Overtone/Patch/Drum Synth.
  Patch Synth and Drum Synth offer BOTH taps.

SKIPPED, per the spec's own escape clause: §4's "gate (as ch1 insert)" picker variants
("ONLY if cheap — otherwise skip, log in receipt"). Span 1 did not build them and I did
not either; the standalone device rows cover the device UIs.

JUDGEMENT CALL — MINE, NOT BRANDON'S, needs his eye:
`showPiece` calls `console.error` when a piece refuses to mount, so the four refusals above
put red in the console when Brandon deliberately picks a refused pair. Item 10 asks for a
clean console; the console IS clean on load, on tab switches, and across the full 37×2
sweep — the errors appear only on a deliberately refused pick, and the refusal is already
printed in the host where Brandon can read it. I left it loud rather than quietly downgrade
error reporting in a page whose whole job is showing what is really there. One-line change
to `console.warn` if Brandon wants those screenshots console-silent.

DELIBERATE ADDITIONS beyond the spec text (small, disclosed, all in my own file):
- `window.dsp.matrix` gained `json()` and `setLayout()` next to span 1's `layout`/`holders`,
  same console-poking spirit as §11 item 2.
- [copy JSON] falls back to a textarea + `execCommand('copy')` when the clipboard API is
  unavailable, and logs the JSON if even that fails — the flash never lies about a copy.
- Two chrome classes for the bar: `.dsp-bar-select`, `.dsp-flash` (tokens only).

CORRECTION TO SPAN 1's RECEIPT: it reports "Dev box appears on `#dev`" without saying the
box mounts COLLAPSED — a bare "dev" handle, no dials until it is clicked. Nothing is broken;
the next agent just should not expect to find `.db-name` rows on load.

STRAY (screenshots, this span):
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item9-dawish.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item9-restored.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item9-persist.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item10-leakpass.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item10-six-slot.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item10-six-slot-restored.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item10-dials.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-span2-final.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-probe-rail.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-probe2.png
  (the last two are the dead-end probe named under HARNESS NOTE below — safe to delete)

The verify harness (`verify.mjs`, `step9.mjs`, `step9b.mjs`, `step10a-d.mjs`, `probe*.mjs`,
`playwright-core` in `node_modules/`) lives in the session scratchpad OUTSIDE the repo and
dies with the session:
/private/tmp/claude-501/-Users-moth3rship-Desktop-AI-Design-School-stuff-Chromebook-DAW-Agent-run-1/b3c4fae8-eedc-4c48-ba6b-a4aae9b6569c/scratchpad/
It survived from span 1 because this span ran in the same session. `playwright-core` is
still NOT installed in this repo.

HARNESS NOTE for whoever verifies this page next: do NOT measure listeners by patching
`EventTarget.prototype.addEventListener`. I tried it first and it made rail rows report
"not visible" to Playwright from row 4 onward — a fault in the instrument, not the page,
which cost two probe runs to clear. Use CDP `DOMDebugger.getEventListeners` instead.
Second trap: the Matrix divider's merge button sits at the divider's CENTRE, so a
programmatic drag grabbed from the centre fires merge instead of a resize. Grab off-centre.

NEXT AGENT: none for this spec — §11 is finished and §12 is all true. The two open questions
are Brandon's, not the next agent's: the note bus is ch1-only (span 1's flag), and the
console.error-on-refusal call above.

Zero edits under `src/`. Every `src/` file `git status` reports as modified was already
modified before this span started; `daw-shell.js` still carries the three §2 exports at
lines 393 / 468 / 590, untouched. The only file I wrote in the project is
`tools/dev-splash.html`, plus this receipt and the INDEX/SESSIONLOG lines.
