# SPEC — DAW DESKTOP

Written 2026-09-07 — session agent. Runs as L6 (Opus). Gate: Brandon rules §2 and §3.
DAW mobile is a separate gate and is not in this spec.

## 1 · WHAT EXISTS — read 2026-09-07

tools/daw-window.html owns the frame: header region · left column (selected strip +
master) · center (arrangement over a bottom third with five panes: Mixer, Surface, Piano
Roll, Node Graph, Automation) · three pointer-dragged dividers · a floating panel per track
with its instrument and a surface chip row. It builds a `handle` of mount hosts (:337–345)
and calls `wireDawShell(handle, { laneSurfaces: false })` (:355).

src/ui/daw-shell.js `wireDawShell()` :613 mounts the project header, the Surface pane, the
strips, the graph, the automation rack, the arrangement, and one roll scheduler. It owns
the track lifecycle: `busFor` · `assignInstrument` (dispose old → `new Ctor(ctx,
strip.input)` → store → lane → bus) · `onTrackAdd` · `onTrackRemove`.

How a note reaches a track:
- A **panel surface** is built with the track's bus (`new spec.Ctor(null, bus)`,
  daw-window ≈:485). The bus plays the bound instrument itself (track-bus.js:141).
- The bus gates `key` and `midi` on ARM; mouse, touch, circle, diatonic always sound
  (track-bus.js:23, :70).
- **MIDI** reaches the `input` singleton and daw-shell fans it to every bus (≈:680–692).
  Each bus's arm decides.
- The **computer keyboard** reaches a track only through an open panel with a keyboard
  surface in it, armed.
- **Piano roll** in the bottom third: `roll.setBus(shell.trackBus(region.laneId))`
  (daw-window ≈:612). Playback: roll-scheduler.js:25–50 off the clock tick.

## 2 · THE DEAD PANE — gate: delete or rebind

The bottom **Surface** pane is `mountPlayingSurface(handle.playingSurface)` (daw-shell
:614 → :593), which is shell.js's `createSurfaceSwitcher` built against the **`input`
singleton**, not a bus. daw-shell forwards only `source === 'midi'` from `input` to buses.
A tap on that pane emits `mouse`/`touch` on `input`, and nothing plays it.

Not verified in a browser. First step of L6: Brandon taps it headed. If silent:

- **Delete** — remove the Surface chip and pane from daw-window.html (:288, :299), drop
  `playingSurface` from the handle, make `wireDawShell` skip `mountPlayingSurface` when the
  host is absent, drop `surface` from its return and dispose.
- **Rebind** — build the switcher against the selected track's bus, rebuild it on
  `arrangement.on('select')` and on the Channel dropdown. That duplicates what the panels
  already do.

## 3 · RECORDING — gate: confirm the target

arrangement.js:1028–1031 subscribes each lane's `Capture` to `'commit'` →
`_commitToRegion(lane, report)` :1271. That method returns unless a region **editor** is
open for that lane (:1274). The comment at :1014–1016 says notes go "into the region under
the playhead rather than into a mounted editor." Code and comment disagree. Master Story
lists this open since 2026-09-01: "recording now drops notes when no editor is open."

Proposal, Brandon rules: commit lands in the region on that lane whose bar range contains
the playhead at commit time. If none, create a one-bar region there, the same way the
double-click path does (:1034–1039). If an editor is open for that lane, keep today's
behavior. `regions.forLane(id)` and `regions.addNotes(id, notes)` already exist.

## 4 · TROUGH HEIGHT — gate: Brandon names the px

daw-window.html:167 `.dwn-strip .cbdaw-strip__fadermeter { max-height: var(--sp-95); }`.
Open since 2026-09-04: `--sp-95` too short, `--sp-230` too tall, nothing between. Brandon
names a pixel height; L6 adds one token to tokens.css on the existing SP scale and uses it
here. No new scale.

## 5 · DUPLICATE REGIONS — repro, Brandon driving

Not found by reading. Lane build (:909), add (:859), remove (:869), and the seven store
subscriptions (:586–606, released :650–663) are balanced. Suspects the script watches:

1. Fresh load. `regions.all.length` → expect 0.
2. Add track, assign wave synth, open panel, pick Keyboard, ARM. Record two bars, editor
   closed. Count regions. Expect 0 today (§3), 1 after §3.
3. Double-click to make a region, double-click it to open the editor, record two bars,
   CLOSE. Count. Expect 1.
4. Repeat 3 without closing between takes. Count.
5. Remove the track, add a new one, repeat 3. Count. A count that climbs by 2 here means
   `_onTrackAdd` fired twice — check whether `mount()` ran twice (:573 subscribes each time).
6. Stop transport mid-record. Count.

Agent scribes each count into the receipt. Brandon reads the numbers, not the agent.

## 6 · ALSO IN L6, no gate

- Master strip's three hidden stand-in rows (strip.js, 2026-09-04) have never been seen in
  a browser. Brandon looks at Master on daw-window and on dev-splash.
- Panel cascade offsets are raw px (`80 + panelOffset`, `% 168`, daw-window ≈:545). Token
  or leave — Brandon.
- `window.addEventListener('pointerup', flushRoll)` (≈:632) writes the roll's notes back on
  every pointer-up anywhere in the page. Works; noted.

## 7 · CHECKLIST — Brandon driving

- [ ] §2 tap test done; ruled action executed; pane gone or plays the selected track
- [ ] §3 record with editor closed lands notes in the region under the playhead
- [ ] §3 record with editor open still lands in the editor's region
- [ ] §4 token added, trough looks right beside a bottom-rack strip
- [ ] §5 script run, six counts in the receipt
- [ ] Master strip rows looked at on two pages
- [ ] Space, Enter, ▶ ■ ● all work; MIDI plays an armed track; roll plays back
- [ ] receipt

## 8 · THE JOB

L6 — Opus — ≈140k. Files: daw-window.html, daw-shell.js (:593–611, :614, dispose),
arrangement.js (:1271–1276), tokens.css (one token). Blast radius: daw-shell.js is shared
with dev-splash and OLDdaw; the Surface change must tolerate a missing host. Drift risk
medium. Gap risk high on §5 — it is unfound; the script produces numbers, not a fix. If
the numbers point somewhere, that fix is a second job with its own spec.
