# HOWTO — add a drum kit

2026-08-23 18:51 EDT · `drum-sampler`, P2/S4

Per CONTRACTS §14.4 (Brandon's own workflow, **A22**: "Bundled + you add kits"): **no
code change, no rebuild, no redeploy.** There is no build step before P5 — dropping files
is the whole job.

---

## The three steps

1. **Make a folder** under `/assets/kits/`, named whatever you want the kit called
   (letters, numbers, dashes — this becomes the name a student sees in the kit picker).

   ```
   /assets/kits/909/
   ```

2. **Put your eight `.wav` files in it, plus a `kit.json`.** The eight files can be named
   anything — `kit.json` is what tells the app which file is which piece. Copy this
   template and edit the `label` and `file` fields (leave `index` and `note` alone — see
   "the two numbers you never touch," below):

   ```json
   {
     "format": "chromebook-daw-kit",
     "version": 1,
     "name": "909",
     "pieces": [
       { "index": 0, "label": "Kick",        "note": 36, "file": "kick.wav" },
       { "index": 1, "label": "Snare",       "note": 38, "file": "snare.wav" },
       { "index": 2, "label": "Closed Hat",  "note": 42, "file": "hat-closed.wav" },
       { "index": 3, "label": "Open Hat",    "note": 46, "file": "hat-open.wav" },
       { "index": 4, "label": "Clap",        "note": 39, "file": "clap.wav" },
       { "index": 5, "label": "Low Tom",     "note": 45, "file": "tom-low.wav" },
       { "index": 6, "label": "High Tom",    "note": 50, "file": "tom-high.wav" },
       { "index": 7, "label": "Crash",       "note": 49, "file": "crash.wav" }
     ]
   }
   ```

   `label` is the only field you're meant to customize per kit — e.g. a 909 kit can say
   `"909 Kick"` at index 0 instead of `"Kick"`. Every kit still needs all eight entries,
   one per index 0–7, with no gaps and no repeats.

3. **Add the folder name to `/assets/kits/kits.json`:**

   ```json
   { "format": "chromebook-daw-kits", "version": 1, "kits": ["808", "acoustic", "909"] }
   ```

   This one line is unavoidable — CONTRACTS §14.3/§10-E: a static site with no backend
   means the browser can't list a folder on its own, so this file is how it finds out
   your new kit exists at all.

That's it. Reload the page — the new kit shows up in the kit picker.

---

## The two numbers you never touch: `index` and `note`

The eight pieces are the same eight roles in every kit, app-wide (CONTRACTS §14.1) — it's
how the Drum Synth and every sampled kit line up on the same grid without the grid ever
knowing which one it's looking at. `index` (0–7) and `note` (the MIDI number) are fixed by
that table for every kit. **Only `label` and `file` are yours to set.** If you move an
`index` or a `note`, the app ignores it and plays the piece through its real, fixed role
anyway — it does not let a kit reassign what a row means.

| index | role | note (don't change) |
|---|---|---|
| 0 | Kick | 36 |
| 1 | Snare | 38 |
| 2 | Closed Hat | 42 |
| 3 | Open Hat | 46 |
| 4 | Clap | 39 |
| 5 | Low Tom | 45 |
| 6 | High Tom | 50 |
| 7 | Crash | 49 |

*(The seven role labels above — everything but "Kick" — are Brandon's own call and are
currently a placeholder set carried so nothing blocks; see CONTRACTS §14.1's
`PROVISIONAL` note. They may get renamed later. The index/note numbers next to them will
not change.)*

---

## What happens if something's wrong

Nothing breaks the page. Per CONTRACTS §14.3:

| If… | Then… |
|---|---|
| `kits.json` is missing or broken | No kits are offered. The Drum Synth still works. |
| a kit folder has no `kit.json` | That kit shows as unavailable and can't be selected. Other kits still load. |
| `kit.json` doesn't have exactly 8 entries, or an `index` is wrong | That kit is refused — named, not silently dropped. |
| one `.wav` won't decode | The kit still loads. That one piece is silent and marked failed; the other seven play. |

A wrong sound is worse than a named missing one in a classroom — this app never guesses,
it always says what's wrong.

---

## Two real example kits are already in the repo

`/assets/kits/808/` and `/assets/kits/acoustic/` — both built exactly this way, both
loadable through the kit picker with no code involved. Use either one as a working
template if the one above isn't enough.
