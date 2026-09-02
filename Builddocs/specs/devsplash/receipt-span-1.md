RECEIPT — devsplash span 1 — 2026-09-01, 14:20–15:10 EDT

DONE:
1. Page skeleton — `tools/dev-splash.html`: doctype, tokens.css link, inline `<style>` +
   inline `<script type="module">`, `dsp-` chrome, top bar (title / [Pieces] [Matrix] /
   tone-gen toggle / "#dev" hint), two tab roots, inactive one `hidden`.
2. Rig (§3) — `createStrips(ctx)` → `new Graph(ctx,{strips})` → `createChannelAutomation`
   per strip (all 7, master included). `rig` on `window.dsp`. `unlock()` on the first
   document `pointerdown`, listener drops itself.
3. Tone generator (§8) — fixed bottom-left widget, collapse handle + top-bar toggle.
   One osc + gain, started once, gain 0 when off. Waveform / freq (log 40–2000, default
   220) / gain (0–0.5, default 0.15) / route dropdown. Reroute disconnects then connects.
4. Tab 1 rail + stage + rig-backed rows — 7 strips, All 7 Strips, Node Graph, 4 ch1
   automation lanes, Meter, Governor Meter. Rail grouped by §6 headings; stage prints
   piece id + its make line under the title.
5. Tab 1 frame/surfaces/sequencing rows — Project Header, Transport Bar, Playing Surface
   Block, 12-Note Keyboard, Diatonic Keys, Scale Circle, Comp Builder, Piano Roll,
   Step Grid, Arrangement.
6. Tab 1 devices/instruments/vis rows — Gate, Compressor, EQ, Reverb, Delay (standalone,
   registered as tone-gen route targets, `device.output → master.input`); Wave/Overtone/
   Drum Synth, Drum Sampler, Patch Synth; Spectrum and Scope over the ch1 instrument.
7. Matrix (§7) — tree model (`split`/`slot`), incremental render (no full rebuild),
   empty-slot picker grouped by catalog group, split ⇆ / ⇵, divider drag (ratio clamped
   0.1–0.9), merge (keeps side a), ✕ empties without collapsing the split.
8. Matrix channel picker + steal rule + header-drag swap — per-slot channel `<select>` on
   channel-scoped pieces; a rig-object occupancy registry (`strip:chN`, `graph`,
   `lane:chN:target`, `inst:chN`) so an object lives in one place and a later mount steals
   it (loser shows "moved — click to bring it back", tab 1 shows "moved to a Matrix
   slot"); grip drag between slot headers swaps the two leaves and remounts both.

STOPPED AT: item 9 — NOT STARTED. No localStorage persistence, no presets dropdown, no
[save]/[reset]/[copy JSON] buttons. `#dsp-matrix-bar` exists and is rendered but EMPTY —
that is the element item 9 fills. The layout tree is fully in memory and reachable at
`window.dsp.matrix.layout` (nodes carry `kind/key/piece/channel/ratio/dir/a/b`), which is
the exact shape item 9 has to serialize. Everything through item 8 is live and clean.

LIVE (headed Chrome, real `google-chrome` channel via playwright-core, against
`python3 -m http.server 8000` already running; screenshots in `docs/scratchpad/`):
- Item 1: page loads, title, tabs switch both ways, body paints `rgb(10,13,19)` = `--bg`.
- Item 2: `window.dsp.mixer.strips` = ch1..ch6+master, `ch1.input` a real GainNode,
  `graph` a Graph, `automation.ch1.lane('strip.gain')` an AutomationLane, `instruments`
  all null. `ctx.state` "suspended" → "running" after one click. Dev box appears on `#dev`.
- Item 3: master meterTap RMS 0 → 0.107 with tone on; meter canvas lit; freq slider log
  map correct (slider 700 → 618 Hz); routing to ch3 puts 0.051 RMS on ch3's tap.
- Item 4: all 15 rig rows mount alone, each printing its make line; tone routed to ch2
  drives Strip ch2's meter (RMS 0.074, canvas lit). Console clean.
- Item 5: all 10 rows mount alone with real class roots (`cbdaw-dawhead`,
  `cbdaw-transport`, `cbdaw-panel cbdaw-shell__surface`, `cbdaw-kbd`, `cbdaw-diakeys`,
  `cbdaw-circle`, `cb-root`, `cbdaw-roll`, `cbdaw-grid`, `cbdaw-arr`). Transport Play
  moves the Arrangement playhead 0px → 82.9px; clock state "playing".
- Item 6: gate readout `{open:false,levelDb:-100}` → `{open:true,levelDb:-7.96}` with the
  tone routed into it; compressor readout `{reductionDb:-2.37, inputDb:-7.96,
  outputDb:-6.88}`; master hears both (RMS 0.28 / 0.32). All five instruments mount.
  Keyboard pressed with a real mouse press over a key: `input.activeNotes` = [64], ch1
  RMS 0 → 0.281, master 0.281 — keyboard plays Wave Synth audibly on ch1.
- Item 7: 2×2 built by hand, four pieces mounted simultaneously (header / transport /
  graph / arrangement). Outer divider dragged 0.5 → 0.315 with `flex: 0 0 calc(31.5% -
  3px)` applied live; dragged past the edge clamps to 0.1. ✕ leaves 4 slots with 1 empty.
  Merge leaves 3 slots / 2 splits, side a kept, survivors still mounted.
- Item 8: channel picker ch1 → ch4 relabels the slot AND remounts (strip label reads
  "Channel 4"). Same strip picked in a second slot: 2 slots named "Strip ch4", exactly 1
  mounted, loser shows "moved"; clicking it back reverses the theft. Tab 1 picking Node
  Graph while a slot holds it: slot empties to "moved", tab 1 mounts it; clicking the slot
  back leaves tab 1 reading "nothing shown / moved to a Matrix slot". Grip-drag swap of
  two slots verified against the tree: holders map moved `strip:ch1` from s2 to s3, both
  slots hold a live view after the swap.
- Console: ZERO page errors and ZERO console errors on every run above.
- Boundary state, final clean load: 37 rail rows across all 7 §6 groups, Matrix back to one
  empty slot, both tabs switch, console clean. The page is not left broken.

BLOCKED: none — every §4 row mounts. Three source behaviours worth naming, none of them
faults in this page:
- `scope` refuses a Wave Synth and `spectrum` refuses an Overtone Synth (the P1 teaching
  inversion, thrown by `src/vis/scope.js:140` / `src/vis/spectrum.js:151`). The page
  catches the throw and prints the refusal in the host as a BLOCKED note. Pick the other
  instrument and the visual mounts.
- Drum Sampler mounts to its kit-picker state; nothing 404s — no kit is auto-loaded.
- `Spectrum`/`Scope` need an instrument on ch1; with none, the slot/host says "mount an
  instrument first".

SPEC CORRECTIONS (source trusted over spec, per §10):
- §4 `circle`: `new ScaleCircle(null, input)` THROWS — `scale-circle.js:391` takes
  `(element, input, store)` and requires the store. Built as
  `new ScaleCircle(null, input, state)`.
- §4 `comp-builder`: it has NO `mount()`. `comp-builder.js:358` offers `mountExpanded(host)`
  only. Built as `new CompBuilder(state).mountExpanded(el)`.
- §3 vs §4 conflict on instrument lifetime, RESOLVED IN FAVOUR OF §3, needs Brandon's
  eye: §4's teardown column says an instrument view's teardown disposes the instrument and
  clears `rig.instruments.ch1`. §3 step 4 says an instrument lives on its channel until
  another instrument is built on that channel. §11's own item-6 done-check ("keyboard
  plays wave-synth audibly on ch1") is IMPOSSIBLE under §4, since tab 1 shows one piece at
  a time — the synth would be dead before the keyboard mounted. So: a view teardown
  unmounts only; the instrument is disposed when a different one is built on that channel.
- The note bus was NOT wired to instruments anywhere in `src/` outside `shell.js`'s own
  wiring, and §3 does not mention it, but §11 item 6 requires it. Added: one page-level
  `input.on('noteon'/'noteoff')` pair dispatching to `rig.instruments.ch1`, plus
  `allNotesOff()` on window blur. CH1 ONLY — an instrument the Matrix puts on ch3 will not
  play from the keyboard. Brandon's call whether that should follow a focused channel.

DELIBERATE ADDITIONS beyond the spec text (small, disclosed, all in my own file):
- `<link rel="icon" href="data:,">` — the only console error on a clean load was Chrome's
  own `/favicon.ico` 404. §12 asks for a clean load; this makes that honest.
- `.dsp-rail` bottom padding 180px so the fixed tone-gen widget cannot cover the rail's
  last rows (it did — Patch Synth was unclickable).
- Merge is fired from the divider's own pointerup, not a `click`: the divider's
  `preventDefault()` on pointerdown suppresses the compat click on its child button. A
  press that moved >3px resizes instead of merging.
- `window.dsp.matrix` exposes `layout` and `holders` for console poking, same spirit as
  §11 item 2's `window.dsp`.

STRAY:
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item1.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item2.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item3.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item4.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item5.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item6.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item7.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-item8.png
- /Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/devsplash-span1-final.png
- The verify harness (`verify.mjs`, `step1..step8c.mjs`, `playwright-core` in
  `node_modules/`) lives in the session scratchpad OUTSIDE the repo and is gone with the
  session: /private/tmp/claude-501/-Users-moth3rship-Desktop-AI-Design-School-stuff-Chromebook-DAW-Agent-run-1/b3c4fae8-eedc-4c48-ba6b-a4aae9b6569c/scratchpad/
  `playwright-core` is NOT installed in this repo. Span 2 must `npm install
  playwright-core` in its own scratchpad and drive `chromium.launch({ headless: false,
  channel: 'chrome' })` — Brandon requires HEADED, never headless.

NEXT AGENT: start at §11 item 9. Serialize `layout` (piece id + channel + ratio + dir
only, never DOM or view handles) to `localStorage['cbdaw-devsplash:layout']` inside
try/catch on every change; restore on load, degrading a piece that fails to remount to an
empty slot. Then fill `#dsp-matrix-bar` with [save] [reset] [copy JSON] and the presets
dropdown ("1×1", "2×2", "DAW-ish"). Hand-build the preset trees with `makeSlot()` /
`makeSplit(dir, a, b, ratio)` — both already exist. After item 9, item 10 is the sweep.

Nothing under `src/` was edited. `git status` on `src/` is unchanged by this span.
