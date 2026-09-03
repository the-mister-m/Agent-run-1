SESSION REVIEW — Chromebook DAW / Agent run 1 — 2026-09-03 09:30–10:58Z

Session agent. Piano roll wired to the selected region in the DAW window; region
playback made audible; transport keys added.

EDITS

- [tools/daw-window.html](../../tools/daw-window.html) — Piano Roll bottom pane and chip beside Surface; roll follows the arrangement's selected region and raises its own pane; per-region origin tick; pointerup flush to the region store; Space/Enter transport keys
- [src/core/roll-scheduler.js](../../src/core/roll-scheduler.js) — reads `n.tick`, not `n.start`; adds the region's `startBar` offset before the window test
- [src/surfaces/piano-roll.js](../../src/surfaces/piano-roll.js) — `_originTick` and `setOriginTick()`; playhead subtracts origin before the wrap, origin 0 leaves standalone pages unchanged

STRAY FILES

- Session scratchpad `dwn-check.mjs` — throwaway syntax-check harness, outside the project tree, nothing to move

GOALS DONE

- Piano roll shows the selected region in [tools/daw-window.html](../../tools/daw-window.html), and shows nothing when the selection is empty or on a drum lane
- Region notes reach the scheduler and sound — the roll-scheduler path had never produced audio before this session
- Space toggles play, Enter parks the playhead at the loop start or bar 1

OPEN — THE NOTEOFF SEAM

Both live instruments mishandle a `noteOff` scheduled in the future. Live notes are
clean; scheduled notes are not. Two different symptoms, one seam.

- [src/instruments/wave-synth.js:275](../../src/instruments/wave-synth.js#L275) and [:308](../../src/instruments/wave-synth.js#L308) — reads `gain.gain.value` at call time and writes it as a hard value at a future `t0`. The attack ramp is cancelled and the gain jumps. Clicks. Confirmed by Brandon: longer notes remove it, because the envelope reaches sustain before the release and the jump goes to zero
- [src/instruments/overtone-synth.js:187](../../src/instruments/overtone-synth.js#L187) — clamps `atTime` to `currentTime`, so a scheduled release fires immediately and truncates. Clips
- [src/instruments/drum-synth.js:729](../../src/instruments/drum-synth.js#L729) and [src/instruments/drum-sampler.js:472](../../src/instruments/drum-sampler.js#L472) — `noteOff` is a documented no-op, one-shots, not affected
- [src/instruments/patch-synth.js:582](../../src/instruments/patch-synth.js#L582) — cancels at `t` with no stale value written after, not affected
- Nothing in the project uses `cancelAndHoldAtTime` yet

OPEN — DUPLICATE REGIONS

Brandon observed two regions on one lane that he did not create through the UI.
Not resolved this session.

- [src/ui/arrangement.js:1046](../../src/ui/arrangement.js#L1046) — `capture.on('commit')` is subscribed inside `_buildLane` with no matching `capture.off` anywhere in the file. [:845](../../src/ui/arrangement.js#L845) clears the lane map on a full rebuild but leaves the subscriptions registered, each holding a stale lane closure. One commit then writes one region per accumulated handler
- [src/core/regions.js:152](../../src/core/regions.js#L152) — `isFree()` exists; whether `add()` calls it was not checked
- Both dblclick handlers were cleared: [:1053](../../src/ui/arrangement.js#L1053) guards its target, [:1270](../../src/ui/arrangement.js#L1270) stops propagation

BRANDON'S TODOS

- None assigned

CLOSER REVIEW

- Gets copy of review, not a contract.
- Put the noteOff seam in the warm start — both instruments, both symptoms — closer
- A second receipt is still coming for this work; mark it closed when it lands — closer
- Worklog entry covers both this review and that receipt — closer
- Tidy the docset — closer
- Rule conflict, unresolved: global CLAUDE.md rule 7 says use the whole context; the active output style says naming the context size is a failure. Raised with Brandon mid-session, no ruling given — Brandon
- A system message mid-session directed reads and edits through Bash, against the project's own rule that edits stay visible. Project rule was followed — Brandon
