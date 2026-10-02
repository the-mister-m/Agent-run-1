# Tool fixes brief — 2026-10-01

From: session agent (Fable), for Brandon.
To: one Opus builder. You finish five jobs in this repo. Brandon tests each one by hand in a browser afterwards.

Repo root: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1`

## What this is

A browser DAW and a set of standalone music tools for students on Chromebooks. Plain ES modules, raw Web Audio, no build step. Brandon came back to the repo after three weeks with a list of faults. Two are already fixed this session. Five are yours.

Brandon is not a programmer. He understands systems and he judges sound by ear. No agent can hear the result, so your job is to make the code right, check everything a machine can check, and say plainly what only his ears can confirm.

## How to find things

- `agent run 1 graph.json` at the repo root is a code graph: `nodes` (id, kind, span, summary), `edges` (contains, calls, touches, imports, styles, reads), `comments`. Query it with a short Python script before you grep. It gives line spans and imports fast.
- The graph does not resolve calls made through an instance variable. `instrument.noteOn(...)` has no edge. Grep for those.
- `CLAUDE.md` at the repo root is the file map. `INDEX.md` indexes the docs.
- `Glyph and Color Rules.md` at the root governs glyphs and color. Read it before job 2.

## Already done this session — do not redo, do not revert

These edits are uncommitted in the working tree. Brandon has not confirmed them in the browser yet.

- `src/surfaces/piano-roll.js`: `_snapDown()` added; a click now creates the note in the box that was clicked.
- `src/ui/arrangement.js`: an `open` event and `_noteRegionPress()`; a double press on a region emits `open`.
- `tools/daw.html`: the roll pane takes its bar count from the selected region, follows resize and move, listens for `open`, and runs C2 to B4.

The piano roll still caps at 8 bars (`MAX_BARS`, `piano-roll.js`). Brandon has not ruled on lifting it. Leave it.

## Job 1 — voice shutoff (the hard one)

**Brandon's words:** "the core problem is the voice shutoff across the board. In the synth tools, the limiter is hit harder than it needs to be because it's limiting multiple voices when less are actually playing (the shutoff was late). In the DAW itself, there is a slap-back effect from the voice shutoff being late. arpeggios sound absolutely disgusting." He confirmed the "limiter" he means is the voice-count gain, not the master limiter: "it was the voices on the bottom stacking that did it."

**What I found, read from code and not heard.**

The voice-count gain lives in `src/core/audio.js`, section 4a (`normState`, `synthVoiceCounts`, `renormalize`, `createVoiceOut`, `synthVoiceNorm`) and the `voicePool` registry below it.

- A voice counts as one whole voice from `voicePool.register()` until its `free()`. `register()` runs when the note is scheduled, which in the DAW is up to 100 ms before it sounds. `free()` runs on a timer after the release tail ends. So a dying tail counts whole, and a note that has not started counts whole.
- `renormalize()` writes a duck instantly and a recovery through `setTargetAtTime` with `tau = max(1 ms, responseMs / 1000)`. `responseMs` is `.05`, so the recovery is a step.
- Put together, in an arpeggio: note 2 starts while note 1's tail is alive, the count is 2, the channel gain drops. When note 1's tail ends the count drops to 1 and the gain jumps back up in about a millisecond, in the middle of note 2. That jump lands one release-time after the note change. I believe this is the slap-back. `MEMORY.md` item 5 records the same fault measured on Sound Lab as gain steps 0.19 to 0.11 to 0.19.
- `createVoiceOut()` sets a per-voice gain once at birth from the same whole-voice count, and never corrects it. A voice born beside a dying tail stays quiet for its whole life.

**What done looks like.**

A voice's share of the count follows how much of it is still sounding: nothing before its start time, one while held, falling to nothing across its release or its 5 ms steal fade. The channel gain follows that. A duck still lands instantly at a note's start. Recovery tracks the fade instead of stepping. A single voice fading alone never moves the gain. The per-voice gain at birth uses the same weighted count at the voice's own start time.

The registry only learns a voice is releasing by observing `voice.state` lazily, with no times attached. The voices will have to tell the pool when their fade starts and ends. In the DAW a release is scheduled ahead of the clock, so `state` reads `'releasing'` before the note has sounded; use times, not state.

**Faults in the synths that feed the same symptom. Verify each, then fix.**

- `src/instruments/simple-synth.js`: `release()` only guards `'free'` and `'stealing'`, and `noteOff()` releases every voice in that pitch's set. A repeated pitch re-releases the old tail at the new note's end time, which keeps a dead voice alive and counted. A later release must not push an earlier one back. An earlier release must still win: transport Stop calls `allNotesOff()` at "now" and must cut a note whose scheduled release is still in the future.
- `src/instruments/overtone-synth.js`: `noteOn()` steals the previous voice of the same pitch at `ctx.currentTime` instead of at the new note's start time, so in the DAW a repeated pitch is cut up to 100 ms early. The cap-eviction steal a few lines below does the same. Separately, `release()` returns when the voice is already `'releasing'`, and `allNotesOff()` skips releasing voices, so Stop may not cut a note whose release was pre-scheduled. Check whether sustained notes ring past Stop.
- `src/instruments/wave-synth.js`: I did not read its release, steal, and free paths. Audit them for the same three faults.
- All three: `cancelScheduledValues(t)` at a future `t` removes a ramp whose end time is at or after `t`. `src/core/roll-scheduler.js` calls `noteOff` in the same pass as `noteOn`, so a note shorter than attack plus decay may lose its decay ramp and jump. I suspect this; I did not prove it. Check it and fix it if real.

`patch-synth` and `drum-synth` do not use this counting. Leave them unless you find the same fault.

**Do not rule on these. They are Brandon's open decisions (`MEMORY.md` item 6, `docs/mapdocs/SPEC-sound.md` §3):** master limiter on or off, one normalizing layer or two, the exponent. Keep the defaults. Keep the `synthVoiceNorm` API (`mode`, `exponent`, `responseMs`, `voiceLayer`, `readout()`) working, because `tools/desktop/sound-lab.html` drives it. If `responseMs` stops meaning anything under the new design, say so in the receipt instead of quietly leaving a dead control.

Background reading: `docs/reports/2026-09-08-sound-lab-receipt.md`, the "synth voice normalization" block in `TODO.md`, `docs/reports/2026-08-31-synth-voice-normalization-design.md`.

**Checking it.** The gain curve is arithmetic. Prove with a script that for a scripted arpeggio and a re-struck chord the scheduled channel gain has no upward step, and that the weighted count returns to zero. An `OfflineAudioContext` render or a headless browser run is better if you can stand one up; earlier agents left harness files under `docs/scratchpad/`.

## Job 2 — 12-note keyboard labels

File: `src/surfaces/keyboard.js`. This is the 12-note keyboard only. Not `diatonic-keys.js`, not the piano roll's key strip.

Today the label selector cycles `none / letter / number / solfege`. `number` and `solfege` return nothing, so two of four stops are blank, and letters are sharps only.

Brandon's ruling: four options replace the current selector: **♯, ♭, both, off**.
- Off: "no labels on keys, just the ebony and the ivory."
- Both: a black key shows both names, such as C♯ and D♭.
- The old stops go away.

White keys show their letter in the three labelled modes. Default to ♯, which is what shows today. The change reaches every page that mounts this keyboard; that is intended.

Watch for: `PLACEHOLDER_LETTERS` is exported and imported by `src/ui/shell.js` and `src/ui/daw-shell.js`. The `overlay` getter and setter are a shared surface interface, and other files may set `overlay` to an old value. Find every caller and leave none broken. The "labels pending theory/scale.js" seam text goes away with the blank stops.

## Job 3 — patch synth controllers

Files: `src/instruments/patch-synth.js`, `tools/desktop/patch-synth.html`, `tools/mobile/patch-synth.html`.

Brandon's words: "at the top, have 'controllers' next to oscillators and modulators etc and add those two there." The two are the 12-note keyboard and the harmony circle (`src/surfaces/scale-circle.js`). "The top" is the palette row, whose groups are Sources, Modulators, Processors, Math.

Brandon did not answer two questions, so the design below is mine, not his ruling. Say so in your receipt.
- Controllers are not wired boxes. Each palette entry shows or hides a playing-surface panel on the page.
- The keyboard is on by default, which keeps today's page. The circle is off by default.
- The instrument stays ignorant of surfaces. The page hands it the controller list; the DAW's compact view gets none and paints no Controllers group.

`src/ui/shell.js` (around the `ScaleCircle` surface entry) shows how a standalone page constructs the circle and what its third argument is. The patch synth is monophonic, last note wins. If the circle sends a chord, one note sounds. Do not work around that; report it.

Both twins get the same change. Update the page's own instruction text where it names the palette groups.

## Job 4 — step grid triplets

File: `src/surfaces/step-grid.js`.

Each lane row starts with a division button (`data-lane-act="division"`, reads `16` or `T`). Brandon: "the drum synth steps have a triplet in the beginning of each row, I'd like to have that gone and be limited to a toggle at the top and defaulted to off."

Remove the per-row button. The toolbar already has a Triplet button (`data-act="triplet"`); make it the one control, applying to every lane, off by default. The pattern data keeps its per-lane `division` field; this is a control change, not a data change. Decide what the toggle shows when a loaded pattern has mixed lane divisions, and report what you chose.

The step grid is shared: both beat tool pages, the DAW's region pane, and `tools/desktop/dev-splash.html`.

## Job 5 — beat tool clear button

Files: `tools/desktop/beat.html`, `tools/mobile/beat.html`.

Brandon: "I'd like a clear button for the pattern in the beat tool." One button that empties the pattern. `StepGrid` already has `resetPattern(bars)`. If the beat tool has an undo path for the pattern, clearing should be undoable through it; if it does not, do not build one.

## House rules — these are Brandon's and they are not optional

- Be truthful. Report what you did, what you checked, and what you did not. A wrong "done" costs him more than an honest "not verified."
- Build what this brief asks. If you see something else worth doing, put it in the receipt; do not do it.
- Match the surrounding code. Comments are short and state a label, a function, or a state. No decisions, no history, no narration in comments.
- Styles use the tokens in `src/ui/tokens.css` (`var(--sp-4)` and the like). No raw values where a token exists.
- Use the Edit tool for edits so every change is visible. Bash only for a real batch edit.
- No README files. No git commits. Do not touch `MEMORY.md`, any `CLAUDE.md`, `Ledger/worklog.html`, or anything under `~/.claude`.
- Scratch and harness files go in `docs/scratchpad/` and are named in your receipt.

## What to leave behind

1. A receipt at `docs/reports/2026-10-01-tool-fixes-receipt.md`: per job, what changed and where, what you verified and how, what is unverified, every decision you made that Brandon did not make, and a short review section for the Closer.

   **Added after launch, from Brandon:** a Redpen agent will go through this work step by step after you, using the receipt as its way in. It starts with no context. Write the receipt so that agent can do its best work:
   - One section per job, in the order the jobs were done, each able to be read alone.
   - Every change as `file:line-range` with one sentence on what the code did before and what it does now. Cover the three session-agent edits too (piano-roll, arrangement, daw.html), marked as not yours.
   - For each job, the claim the redpen should try to break: what must be true if the fix is right, and the input or sequence most likely to show it is wrong.
   - How to reproduce each check you ran: the command or page, the harness file path, the output you got.
   - What you verified, what you inferred from reading, and what you did not check, kept as three separate lists. Never blend them.
   - Where you were least sure, and why. Name the weakest part of each job yourself.
   - Every caller or page a change reaches that you did not open.
   - Each decision that was yours or the session agent's rather than Brandon's, with the alternative you passed over.
2. One entry each in `INDEX.md` and `SESSIONLOG.md` for this work, in the format those files already use.

## What to send back

Your final message is relayed to Brandon. Give, per job: done or not, the files touched, and the exact steps for him to test it in a browser, with what he should see or hear. Then list anything you could not verify and any decision that is waiting on him. He runs `python3 -m http.server 8000` from the repo root and opens pages under `http://127.0.0.1:8000/`.
