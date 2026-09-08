# SESSION REVIEW — Chromebook DAW / wave-synth-test — 2026-09-08 [timestamps: ask Brandon]

SPEC-wave-synth-port.md §2e, all ten rows, run against the dial build, plus rows 11-13
from the task brief (Simple Synth pages, Sound Lab picker, comment grep). Headed
Playwright, `slowMo: 300`, `--autoplay-policy=no-user-gesture-required`. No edits to
src/ or tools/ — test only.

## EDITS

None — tester role, no src/ or tools/ writes.

## STRAY FILES

- [docs/scratchpad/wave-synth-test/test-wave-synth.mjs](../scratchpad/wave-synth-test/test-wave-synth.mjs) — the twelve-row harness
- [docs/scratchpad/wave-synth-test/row9-recheck.mjs](../scratchpad/wave-synth-test/row9-recheck.mjs) — row 9 follow-up (mount-timing check)
- [docs/scratchpad/wave-synth-test/run-output.txt](../scratchpad/wave-synth-test/run-output.txt) — raw console log of the full run
- [docs/reports/wave-synth-test-shots/](wave-synth-test-shots/) — R01…R30, all screenshots below

## GOALS DONE

- Rows 1-8, 10-13 of the test plan pass
- Row 6 (knob/patch consistency sweep) passes with one flagged mismatch, not a hard fail
- Row 9 (DAW mount) run, found broken, reported with exact repro
- Comment grep (row 13) run clean, 0 hits

## BRANDON'S TODOS

None from this pass — tester role, findings go to CLOSER REVIEW below.

## RESULTS

| Row | Pass/Fail | Count | Screenshot | Note |
|---|---|---|---|---|
| 1 | PASS | 0 page errors, desktop + mobile | [R01](wave-synth-test-shots/R01-desktop-1366.png), [R17](wave-synth-test-shots/R17-mobile-390.png) | desktop 1366×768 and mobile 390×844 both load clean |
| 2 | PASS | body/doc overflow 0px at all 5 widths | [R02](wave-synth-test-shots/R02-resize-1024.png)–[R06](wave-synth-test-shots/R06-resize-1920.png) | 1024/1280/1366/1600/1920, no horizontal scroll |
| 3 | PASS | `--tap-min`=46px; 48 dials all ≥46px (0 under); 8 envelope faders 56px tall; 56/56 controls boxed | [R18](wave-synth-test-shots/R18-mobile-keyboard.png) | resolved `--tap-min` through a probe element per the port receipt's fix; faders are narrow (`--sp-4`, 8px wide) but not short |
| 4 | PASS | unison 1→4, 2→8, 4→16 held; 0 after release+0.5s, all three | [R13](wave-synth-test-shots/R13-unison-1.png)–[R15](wave-synth-test-shots/R15-unison-4.png) | matches the 8-held-notes cap ruling in the port receipt |
| 5 | PASS | 9 notes at unison 1 → count 8, held=[61…68], note 60 gone | [R16](wave-synth-test-shots/R16-poly-cap.png) | matches spec ruling exactly |
| 6 | FAIL (1 mismatch) | 48 dials + 8 faders, 3 real pointer drags, 264 key/value moves, **1 patch mismatch**, 0 console errors | [R07](wave-synth-test-shots/R07-dial-drag.png), [R08](wave-synth-test-shots/R08-knob-sweep.png) | `voice.unison` dial reads `1` (`aria-valuenow`) after End+PageDown+ArrowUp+ArrowDown while `getParam('voice.unison')` returns `2` — repro below |
| 7 | PASS | mono: 1 voice after note 1, still 1 after overlapping note, held note 67, freq 392 Hz | [R09](wave-synth-test-shots/R09-mono.png) | pitch follows the newest note, legato retrigger confirmed by count staying at 1 |
| 8 | PASS (picture only) | 3 spectrum shots at pw 0.1/0.5/0.9 | [R10](wave-synth-test-shots/R10-pw-01.png)–[R12](wave-synth-test-shots/R12-pw-09.png) | no sound claim |
| 9 | **FAIL** | `instrumentType` set correctly, `.instrument` never mounts (checked 100ms–3000ms) | [R19](wave-synth-test-shots/R19-daw-track.png), [R20](wave-synth-test-shots/R20-daw-play.png), [R30](wave-synth-test-shots/R30-daw-recheck.png) | repro below — separate note: the recheck script's browser context closed unexpectedly after the 3s snapshot loop, not investigated further per tester scope |
| 10 | PASS | Simple Synth desktop + mobile: 0 idle → 3 holding → 0 after release, 0 errors | [R21](wave-synth-test-shots/R21-simple-desktop.png), [R22](wave-synth-test-shots/R22-simple-mobile.png) | old engine unaffected by the port |
| 11 | PASS | home-row chord (KeyA/KeyD/KeyG/KeyK) desktop + mobile: 4 held, 0 released | [R23](wave-synth-test-shots/R23-row11-hold-desktop.png)–[R26](wave-synth-test-shots/R26-row11-release-mobile.png) | real keyboard events, not JS `noteOn` calls |
| 12 | PASS | Sound Lab: 3 picker buttons present, Wave Synth selected, `#chordRun` → count 0→32→0 | [R27](wave-synth-test-shots/R27-lab-picker.png)–[R29](wave-synth-test-shots/R29-lab-chord-run.png) | 32 = 8-note chord × 4 chords, all released within 2.5s |
| 13 | PASS (0 hits) | grep for `Brandon\|§\|CONTRACTS\|must\|never\|so that\|instead of` | — | 0 hits in wave-synth.js, knob.js, both wave-synth.html pages |

## FAILURES — EXACT REPRO

**Row 6 — `voice.unison` dial/patch mismatch**

1. Load `tools/desktop/wave-synth.html`, wait for `window.cbdawShell.instrument` to exist.
2. Find `.cbdaw-knob[data-path="voice.unison"]`, `.focus()` it.
3. Dispatch `keydown` `Home`, then `End`, then `PageDown`, then `ArrowUp`, then `ArrowDown`
   (each a real `KeyboardEvent('keydown', {bubbles:true, cancelable:true})`).
4. Read `Number(el.getAttribute('aria-valuenow'))` → `1`.
5. Read `window.cbdawShell.instrument.getParam('voice.unison')` → `2`.
6. Expected: dial display and patch value agree. Actual: they disagree by one step.
   `voice.unison` is an enum dial over `1, 2, 4` — this looks like an off-by-one in how
   the dial's enum index maps back to `aria-valuenow` versus the value it writes through
   `setParam`, but I did not trace the knob's internal index math — tester scope stops at
   the repro.

**Row 9 — Wave Synth never mounts on a DAW track**

1. Load `tools/daw.html`, wait ~2.5s for the shell to settle.
2. `const t = await import('/src/core/tracks.js'); const track = t.tracks.add({name:'Wave'});`
3. `t.tracks.setInstrumentType(track.id, 'wave-synth');`
4. Poll `t.tracks.get(track.id)` at 100ms, 300ms, 600ms, 1000ms, 2000ms, 3000ms.
5. At every interval: `instrumentType: 'wave-synth'`, `kind: 'pitched'` (both correct),
   but `instrument: null` / `hasInstrument: false`.
6. `tracks.all.find(r => r.instrumentType === 'wave-synth').instrument` is `null`, so
   `noteOn` cannot be called — playback from the panel keyboard was not reachable.
7. 0 page errors, 0 console errors captured on the first run; `daw.html` itself loads
   clean in isolation (0 errors, [R30](wave-synth-test-shots/R30-daw-recheck.png)).
8. Not classified as "daw.html throws on load" (it doesn't), so the retry-in-two-minutes
   clause did not apply — this is the instrument never mounting after assignment, checked
   to 3 full seconds. Not retried a second time; Opus's in-flight edits to
   tracks.js/daw-shell.js/arrangement.js/step-grid.js/roll-scheduler.js are a likely but
   unconfirmed cause — tester scope stops at the repro, not the fix.

## CLOSER REVIEW

- Gets copy of review, not a contract.
- Row 6 `voice.unison` dial/patch mismatch — rule whether this blocks the panel or is a
  one-line knob fix — Brandon / whoever owns knob.js next
- Row 9 DAW mount failure — rule whether this is Opus's in-flight edit or a real gap in
  Wave Synth's DAW wiring; re-run row 9 once Opus's loop closes — Brandon / closer
- `docs/scratchpad/wave-synth-test/` is throwaway once reviewed — closer
- No sound claim anywhere in this receipt; counts and pictures only
