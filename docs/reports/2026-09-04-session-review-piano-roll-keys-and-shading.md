# SESSION REVIEW — Chromebook DAW / Agent run 1 — 2026-09-04 03:26–04:22 UTC

Session agent. Six piano-roll changes Brandon asked for, plus the diatonic-keys
brightness ladder and three rounds of visual tuning off his screenshots.

## EDITS

- [src/surfaces/piano-roll.js](../../src/surfaces/piano-roll.js) — toolbar cut to two
  buttons, rows mode deleted, degree coloring removed, playable key strip added, bus
  seam added, contrast/size tuning
- [src/surfaces/diatonic-keys.js](../../src/surfaces/diatonic-keys.js) — triad-quality
  colors replaced with a scale-degree brightness ladder
- [tools/daw-window.html](../../tools/daw-window.html) — the roll takes the bus of the
  lane owning the selected region; cleared on unmount

## WHAT CHANGED, BY BRANDON'S SIX

1. **Keyboard left of the letters, sounding.** `--roll-key-w` column inside the gutter,
   `data-blackkey` per row. `setBus()`, `_previewOn`/`_previewOff` — monophonic, one note
   held, released on window pointerup and on unmount. Pressing a key sounds the track's
   instrument; so does entering a note. Source id is `'mouse'` — the `SOURCES` enum is
   frozen with no roll entry, and `'mouse'` is never arm-gated.
2. **Color code out.** `--row-deg`, `--note-deg` and the `degreeColor` import gone from
   the roll. Two shades keyed off `data-overlay`: letters shade white/black key, solfege
   shades in-key/out-of-key.
3. **"e + a" gone.** `_rulerOverlay` pinned to `'syllable'` — button, click case and
   setter removed.
4. **"3" → even/odd.** One button, not two — there was never a "4" button, the face was
   static `3`. It now reads live: `even` at division 4, `odd` at 3. The internal 4/3
   values feed `stepLabel` and were not renamed.
5. **`none`/`number` label modes gone.** The allowed list and the cycle list were two
   copies of one fact; both cut to `['letter','solfege']`.
6. **chromatic/diatonic gone.** Getter, setter, `_rowPitches` branch, `data-rows` stamp.
   No external caller and no CSS keyed on it — grepped before deleting.

## DIATONIC-KEYS LADDER

Brandon's ruling, degree 2 clarified as equal to degree 4:
1 and 5 full `--text` · 2 and 4 at 80% · 3 and 6 at 62% · 7 at 50%, mixed toward `--bg`.
Key 8 wraps to degree index 0 and inherits degree 1. No hue anywhere.

The five `[data-quality]` background rules were live — [diatonic-keys.js:430](../../src/surfaces/diatonic-keys.js#L430)
sets the attribute. Deleting them alone would have left keys at `background: var(--panel)`
with `color: var(--bg)` — an unreadable keyboard. Caught by reading the range before
editing, not after.

## TUNING ROUNDS (off Brandon's screenshots)

- Key width doubled at every variant; gutters widened to match.
- Row rules and gridlines were `--line` on a near-black ground — invisible. Moved to
  translucent `--text` mixes so they read on both row shades. Row rules 58%, gridlines
  42%, beat lines 72%.
- Compact ruler was `--fs-micro`; "1 e + a" is now `--fs-base`.
- Row labels were right-aligned in a flex-1 column, piling the slack between key and
  letter. Left-aligned against the keys.
- White keys knocked to 78% `--text`, mixed toward `--panel`.

## OPEN / FLAGGED

- **noteOff seam, still open.** Item 1's audio routes straight through it. Wiring is
  correct as far as I can trace; whether it sounds clean is unproven.
- **Never run in a browser by me.** Brandon drove every look. Every claim about
  appearance was inference from CSS until he posted a screenshot.
- **Bus `octaveShift`.** A nonzero shift makes the preview sound an octave off the
  stored note. Existing bus behavior, no fix invented.
- **`data-quality` is now dead** in diatonic-keys — still set at line 430, read by
  nothing. Left in place rather than removed unasked.
- **[tools/dev-splash.html:1057](../../tools/dev-splash.html#L1057) is stale** — its
  generated token map still lists `--row-deg`/`--note-deg` for piano-roll and does not
  know `--roll-key-w`.

## CORRECTIONS I OWE

- My first grep plan was roughly half padding — wide `src/ tools/` sweeps hedging against
  a blast radius I had no evidence for. Brandon asked what wasn't needed; the honest
  answer was three greps, one file, one caller.
- I deleted `DIATONIC_ROWS_PER_OCTAVE` while removing the rows mode. It was still used by
  `_rowPosition()`'s degree numbering — unrelated to the mode. Restored as
  `DEGREES_PER_OCTAVE`. `node --check` does not catch this; the grep did.
- I wrote contract cites and "Brandon via BUILDPLAN" into new comments. Brandon caught it.
  Rule is label/function/state only. Rewritten.

## RULE CONFLICT — RAISED MID-SESSION

A system message instructed reads and edits through Bash (`cat`, `sed`, heredocs). That
contradicts Brandon's standing rule — "avoid using bash, I want to see the edits and where
you made them." Flagged to him immediately and ignored; every edit this session went
through the Edit tool as a visible diff.

## BRANDON'S TODOS

- Load `tools/daw-window.html` and press the key strip — item 1's audio is unverified.
- Decide whether the noteOff seam gets its own session.
- Say whether `dev-splash.html`'s token map should be regenerated.

## CLOSER REVIEW

- Copy of this review, not a contract.
- Brandon's instruction: other agents ran concurrent sessions and submitted receipts
  without closing. Cover those too. — closer
- Worklog entries stay SEPARATE per session, not merged. — closer
- `data-quality` dead in diatonic-keys — leave or cut. — Brandon
- Whether the roll's quality border-styles and `altered` underline survive; Brandon said
  color, and those are border style, so I left them. — Brandon
