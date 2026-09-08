SESSION REVIEW — Chromebook DAW / Agent run 1 — L6 DAW desktop — 2026-09-07 [exact timestamps: ask Brandon]

L6 loop, run headed against `http://localhost:8080`, Chromium 1366×768. Baseline shots and
counts taken before any edit; the same shots and counts re-taken after. Brandon's rulings at
the DAW gate drove §2 (delete) and §3 (yes to the proposal). Every claim below is a
screenshot, a count, or a probe number — no sound, click, clip or sign-off is claimed.

EDITS

- [tools/daw.html](../../tools/daw.html) — Surface chip and `#dwn-pane-surface` removed from the bottom-third chipbar and pane list; `playingSurface` dropped from the `wireDawShell` handle; `surface` dropped from the `PANES` map; the roll comment no longer names a pane that is gone
- [src/ui/daw-shell.js](../../src/ui/daw-shell.js) — `mountPlayingSurface` now called only when `handle.playingSurface` is present; `surface` dropped from `wireDawShell`'s return object and from its `dispose()`; the function's own description no longer lists a playing surface. The `mountPlayingSurface` export itself is untouched — [tools/desktop/dev-splash.html](../../tools/desktop/dev-splash.html) calls it directly with a real host and is unaffected
- [src/ui/arrangement.js](../../src/ui/arrangement.js) — `_commitToRegion` rewritten to Brandon's §3 ruling: an open editor on this lane still wins; otherwise the take lands in `regions.at(lane.id, clock.position.bar)`, and if nothing covers that bar a one-bar region is added there the way the double-click path adds one

WHAT THE §2 TAP TEST SHOWED — the pane was dead

With a track added, Wave Synth assigned and the lane armed, the bottom Surface pane's C key
was pressed and held. It lit ([02-surface-tap-before.png](L6-shots/02-surface-tap-before.png)).
The probe counted, across that press:

| probe | count |
|---|---|
| `input` singleton `noteon` | 1 |
| any track bus `noteon` | 0 |
| the track instrument's `noteOn()` | 0 |

The key registered on the input singleton and reached no bus and no instrument. Deleted per
the ruling. After the edit the chip is absent and `#dwn-pane-surface` is not in the DOM.

WHAT §3 NOW DOES — driven on the real page

`_commitToRegion` could not be reached through the transport (see FOUND, NOT FIXED #1), so
the take was opened on the lane's own `Capture` and the notes played through `input` as MIDI.
Three takes, one page, zero console errors:

| take | editor | playhead bar at stop | result |
|---|---|---|---|
| A — no regions anywhere | closed | 2 | new region `r1` created at bar 2, 3 notes |
| B — `r1` already covers bar 2 | closed | 2 | `r1` took the notes, 3 → 5. No second region |
| C — editor open on `r2` at bar 9 | open | 2 | `r2` took the 2 notes. `r1` untouched at 5 |

That is the ruling in all three branches: region under the playhead, else a new one-bar
region there, else the open editor.

§4 TROUGH — Brandon picks from the pictures

No token was added. `.dwn-strip .cbdaw-strip__fadermeter` is still `max-height: var(--sp-95)`
(190px). The SP scale has no step between `--sp-95` (190px) and `--sp-230` (460px), so the
second shot uses a temporary injected `325px` — the midpoint — applied in the browser only
and removed before the next shot. Nothing in the repo was changed for it.

§5 DUPLICATE REGIONS — six counts, before and after

| step | what it drives | before | after |
|---|---|---|---|
| 1 | fresh load | 0 | 0 |
| 2 | add track · Wave Synth · panel · Keyboard · ARM · record two bars, editor closed | 0 | 0 |
| 3 | double-click empty row → region · double-click it · record two bars · CLOSE | 1 | 1 |
| 4 | same again, two takes without closing between them | 2 | 2 |
| 5 | remove the track · add a new one · repeat 3 | 1 | 1 |
| 6 | stop the transport mid-record | 1 | 1 |

No count climbs anywhere the spec says it should not. Step 5 does not climb by 2, so
`_onTrackAdd` is not firing twice and `mount()` is not running twice. Removing a track
cleared its regions to 0 before the new track was added, as `onTrackRemove` intends.

Read the numbers with FOUND, NOT FIXED #1 and #2 in hand: in steps 2–6 nothing was actually
recorded and no editor ever opened, so those counts move only on the double-click region
creations. Step 2's before/after are both 0 for the same reason — not because §3 failed.

FOUND, NOT FIXED — two blockers, neither ruled, neither touched

1. **No take is ever opened by the UI.** `capture.record()` is the only thing that opens a
   take — [src/core/capture.js](../../src/core/capture.js):728, and its own comment says
   `_onStateChange` is not the opener. The transport's record button calls `clockRef.record()`
   and nothing else ([src/ui/daw-shell.js](../../src/ui/daw-shell.js):453). A repo-wide grep
   finds no caller of `capture.record()` or `stopTake()` anywhere in `src/` or `tools/`. The
   transport therefore enters `'recording'`, no lane opens a take, no notes are captured, and
   no `'commit'` ever fires. Probe: 0 commit events across the whole six-step run.
2. **Double-clicking a region never opens its editor.** The first click's `pointerdown` runs
   `_beginBlockDrag`; the `pointerup` publishes a store change, which re-renders the lane and
   replaces the region's DOM node. The second click lands on a new node, so no `dblclick`
   event fires. Measured directly: the node is replaced (`true`), Playwright's `dblclick` and
   two hand-paced clicks both produced 0 `open` events and no editor; a direct
   `_emit('open', region)` produced the editor immediately. This is what made
   SPEC-daw-desktop §5 step 3 undrivable.
3. **Recording into a region whose editor is open, then closing, loses the take.**
   `_closeEditor` writes `surface.getNotes()` back over the region. In take C the two
   recorded notes were in `r2` while the editor held a stale empty copy; CLOSE overwrote them
   and `r2` went back to 0 notes. Pre-existing — the editor path was the only destination
   before this change — and not part of the ruling.
4. `wireDawShell` no longer disposes a playing surface it mounts. Per the ruling, `surface`
   came out of both the return and `dispose()`. No caller passes `handle.playingSurface` any
   more, so nothing leaks today; a future caller that passes one would.

§6 MASTER STRIP — looked at on both pages

Master renders on both. The three stand-in rows are doing what a hidden stand-in does: they
hold the height, and they draw nothing — on both pages Master shows its label, a band of
empty space where a channel strip carries its instrument select and M/S+pan, the fader and
trough, more empty space where a channel carries its insert slots, then `→ Output`. Whether
that blank band reads right beside a channel strip is Brandon's call off
[05](L6-shots/05-master-daw-after.png) and [06](L6-shots/06-master-devsplash-after.png);
what the shots prove is that the rows build and take up space, not that they look correct.
Master's trough is visibly taller on dev-splash than in the DAW's left column, which is the
`--sp-95` cap in §4 and not a strip difference.

Panel cascade offsets left as raw px, per the ruling.

VERIFY

- ESM parse: `src/ui/daw-shell.js`, `src/ui/arrangement.js` and the extracted
  `<script type="module">` block of `tools/daw.html` each copied to `.mjs` and `node --check`ed — all three clean
- Browser reload after the edits: `tools/daw.html`, `tools/desktop/dev-splash.html` — zero
  `console.error`, zero `pageerror`, on every run, before and after
- No page threw on load at any point

SHOTS

- [01-load-before.png](L6-shots/01-load-before.png) · [01-load-after.png](L6-shots/01-load-after.png) — fresh load. The bottom chipbar loses its Surface chip between the two
- [02-surface-tap-before.png](L6-shots/02-surface-tap-before.png) — the Surface pane's C key held down and lit, track armed with Wave Synth; the probe counts beside it say nothing reached the track
- [02-surface-tap-after.png](L6-shots/02-surface-tap-after.png) — no Surface chip to click; pane gone from the DOM
- [03-trough-sp95-before.png](L6-shots/03-trough-sp95-before.png) · [03-trough-sp95-after.png](L6-shots/03-trough-sp95-after.png) — left-column trough at today's `--sp-95` (190px) beside the bottom-rack strip
- [04-trough-325-before.png](L6-shots/04-trough-325-before.png) · [04-trough-325-after.png](L6-shots/04-trough-325-after.png) — the same view with a temporary 325px, the midpoint between `--sp-95` and `--sp-230`
- [05-master-daw-before.png](L6-shots/05-master-daw-before.png) · [05-master-daw-after.png](L6-shots/05-master-daw-after.png) — Master in the DAW's left column, its stand-in rows below the fader
- [06-master-devsplash-after.png](L6-shots/06-master-devsplash-after.png) — Master on dev-splash, reached through the MIXER rail group
- [06-master-devsplash-before.png](L6-shots/06-master-devsplash-before.png) — dev-splash on load with nothing mounted; the rail group was still closed on that pass
- [07-dupes-step1](L6-shots/07-dupes-step1-before.png) through [12-dupes-step6](L6-shots/12-dupes-step6-before.png), before and after — one shot per §5 step, matching the counts table
- [13-s3-no-editor.png](L6-shots/13-s3-no-editor.png) — take A: the region the commit created at the playhead bar
- [14-s3-same-region.png](L6-shots/14-s3-same-region.png) — take B: same region, no second one
- [15-s3-editor-open.png](L6-shots/15-s3-editor-open.png) — take C with the editor open on the bar-9 region
- [16-s3-after-editor.png](L6-shots/16-s3-after-editor.png) — after CLOSE, showing #3 above

STRAY FILES

- [docs/scratchpad/L6/daw-probe.js](../scratchpad/L6/daw-probe.js) — the before/after probe, both phases
- [docs/scratchpad/L6/diag.js](../scratchpad/L6/diag.js) — the diagnostic that found the dblclick and take-opener blockers
- [docs/scratchpad/L6/verify-s3.js](../scratchpad/L6/verify-s3.js) — the §3 three-branch proof and the dev-splash Master shot
- [docs/scratchpad/L6/probe-before.json](../scratchpad/L6/probe-before.json) · [probe-after.json](../scratchpad/L6/probe-after.json) · [verify-s3.json](../scratchpad/L6/verify-s3.json) — raw run output
- `docs/scratchpad/L6/*.mjs` — the ESM parse copies

GOALS DONE

- §2 tap test run and screenshotted before deleting; pane confirmed dead by probe, then deleted from both files
- §3 implemented to the ruling and demonstrated in all three branches on the real page
- §4 both trough shots taken; no token added, nothing left overridden in the repo
- §5 six-step script run before and after, twelve counts recorded
- §6 Master looked at on both pages; cascade offsets left alone
- ESM parse clean on all three touched files; zero pageerrors on every reload

BRANDON'S TODOS

- Pick the trough height off [03](L6-shots/03-trough-sp95-after.png) and [04](L6-shots/04-trough-325-after.png). The token gets added when you name the px
- Rule whether the transport's record button should open a take on every armed lane (FOUND #1). Until it does, §3 and the §7 checklist line "record with editor closed lands notes in the region under the playhead" cannot be exercised by hand
- Rule the region double-click (FOUND #2). It is the only way into the editor and it does not work
- Rule the editor-writeback collision (FOUND #3)
- §7's remaining lines are yours: Space · Enter · ▶ ■ ● · MIDI into an armed track · roll playback

CLOSER REVIEW

- Gets a copy of this review, not a contract.
- SPEC-daw-desktop §2 and §3 are executed; §4 stays open on Brandon's px; §5 produced numbers and no duplication — closer
- FOUND #1 and #2 are each a separate job with its own spec; neither is in this spec's blast radius — Brandon/closer
- The `wireDawShell` dispose asymmetry (FOUND #4) is one line if it is ever wanted back — closer
- SPEC-daw-desktop's file list still says `daw-window.html`; the file is `tools/daw.html` — closer
