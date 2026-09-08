# SPEC — MAP: MODULE CARDS

Written 2026-09-07 — session agent. Runs as L7, two Sonnets in parallel, no gate. Docs
only. Brandon grows this by hand afterward.

## 1 · ONE CARD PER FILE

Folder: `docs/mapdocs/modules/`. File name is the path with slashes turned to dashes:
`src/core/audio.js` → `src-core-audio.md`. 44 cards for src/, 8 for tools/. 52 total.

## 2 · THE TEMPLATE — every card, same seven headings, same order

```
# <path>

WHAT IT IS
One sentence. What a student-facing feature it serves, or what it is plumbing for.

OWNS
State and DOM this file holds. "Nothing" is a valid answer.

IMPORTS
From master-index.md §c. One per line, path only.

IMPORTED BY
From master-index.md §d. One per line, path only. "Nobody" if orphan.

EXPORTS AND SEAMS
Every `export` line, plus the public members a consumer calls. From `grep -n '^export'`
and the file's own header comment. No reading past that.

KNOWN GAPS
From master-story.md §d (open threads naming this file) and from the specs in this
folder. One line each, with the date it was raised.

LAST TOUCHED
Date and session name from master-story.md §c. "Read whole 2026-09-07" if the session
agent read it (list in §3).
```

No opinions. No fixes. A card that has no gap says "None recorded."

## 3 · READ STATE — what the session agent actually read 2026-09-07

Whole: shell.js · daw-shell.js · track-bus.js · roll-scheduler.js · beat.html ·
patch-synth.html · harmonyNEW.html · daw-window.html · wave-synth.html ·
overtone-synth.html · index.html.

Partial: audio.js (§4a :180–330, governor :455–485) · arrangement.js (:483–506,
:839–1045, :1271–1382) · wave-synth.js (:455–730) · strip.js (:235–275) · input.js
(:32–42) · keyboard.js (:508–518, emit sites).

Not read: everything else. Their cards say "Not read as of 2026-09-07" under LAST TOUCHED.

## 4 · THE JOB

L7 — two Sonnets, ≈150k each, under 200k hard.
- Sonnet A: `src/**`. 44 cards.
- Sonnet B: `tools/*.html`. 8 cards.
- Inputs: master-index.md §a §c §d, master-story.md §c §d, this folder's five specs,
  `grep -n '^export'` per file. **No file bodies.**
- Each writes its cards, one INDEX.md line per card under a MAPDOCS section, one SESSIONLOG
  entry, one receipt in docs/reports/.
- Blast radius: docs only. Drift risk medium — sonnets editorialize; the template forbids
  it. Gap risk medium — unread files get thin cards, which is correct and stated.

## 5 · HOW IT GROWS — Brandon's rules for later

- New file → new card, same template, one INDEX line. Nothing else.
- A file read whole in a session → its card's LAST TOUCHED says so, with the date.
- A gap closed → the line moves from KNOWN GAPS to the session log. Link, never restate.
- HOWTO-read-this-repo.md is the only front door. No README.
