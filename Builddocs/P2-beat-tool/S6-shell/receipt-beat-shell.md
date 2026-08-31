# RECEIPT — `beat-shell`, P2/S6

Seat: `beat-shell` · BUILD · Opus-class (Brandon's assignment at spawn; the brief's own
MODEL-TIER line says SONNET-CLASS and was overridden).
Opened: 2026-08-23 19:17 EDT · Last written: **2026-08-23 19:41 EDT**
Brief: [A-beat-shell.md](A-beat-shell.md) · Owns `/tools/beat.html` and nothing else.

Written after each of the seven seat questions, in order. This is write **7 of 7 — final**.

**Lane, proved rather than asserted.** As of the final write,
`find src tools assets Builddocs/CONTRACTS.md -type f -newermt "2026-08-23 19:17"` returns
exactly one path: **`tools/beat.html`**. No other seat's file was modified, in any way, at any
point in this seat.

---

## DELIVERABLE STATE

`/tools/beat.html` exists, loads over plain static HTTP with no build step, and mounts clean —
zero console errors, zero page errors.

### Seat question 1 — are both machines on one page? **ANSWERED, and verified in a browser.**

Both machines are on one page and on **one grid**, driven by **one pattern**.

The grid holds a single instrument (`StepGrid.bindInstrument`). Two grids would be two
patterns, two edits, and two chances to drift. So this page binds the grid to `KitPair`, a
nine-line adapter in `beat.html` that satisfies CONTRACTS §14.5's instrument contract exactly —
`static pieces` and `noteOn(note, velocity, atTime)` — and forwards to both machines. §14.5 is
verbatim that those two members are "the grid's entire knowledge of an instrument"; `KitPair`
has both and nothing else the grid could reach for. It owns no AudioNode, allocates no voice,
has no `cpuWeight` of its own, and never touches the AudioContext.

§14.5's promise that the two machines share §14.1's role table is **asserted, not assumed** —
`assertSameRoles()` compares `DrumSynth.pieces` against `DrumSampler.pieces` index-by-index and
note-by-note before a single node is built, and refuses to mount if they ever diverge. One
pattern driving two different role tables would be heard by a class before anyone read a diff.

**The A/B is a pair of `hear` toggles**, one per machine column. Mute the sampler and you hear
the made sound; mute the synth and you hear the recorded one; leave both and you hear them on
the same step, off the same pattern, at the same `AudioContext` time. The toggle gates the
fan-out inside `KitPair` — it does not stop, mute, or reconfigure either instrument, and
touches nothing inside either seat's file.

**Browser evidence** (headless Chromium 1366×768, real AudioContext, autoplay policy
disabled — the exact page over the serve command below):

| Probe | Result |
|---|---|
| page mounted, `.bt-error` present? | `mounted: true`, error `null` |
| grid rows / cells / ruler cells | 9 (ruler + 8 lanes) · 128 (8 × 16) · 16 |
| machine columns · pads each | 2 · 8 synth, 8 sampler |
| grid's bound instrument === the pair | `true` |
| `KitPair.pieces` index:note | `0:36,1:38,2:42,3:46,4:39,5:45,6:50,7:49` — §14.1 exactly |
| 4 kicks + 2 snares, transport run 2.1 s | **synth 7 triggers, sampler 7 triggers** — identical |
| scheduled `atTime` values | monotonic; `1.2307, 1.7307, 1.7307, 2.2307, 2.7307, 2.7307` |

That `atTime` sample is the proof the fan-out did not become a second scheduler: 0.5 s apart at
120 BPM, doubled exactly where kick and snare share a step, and every value is the grid's own
`timeOf(tick)` passed straight through untouched.

### Seat question 2 — is it the expanded view? **ANSWERED, and measured on screen.**

`mountExpanded` on all three mounted components — the grid, the Drum Synth, the Drum Sampler.
The check is mechanical: `grep -c '\.mountCompact(' tools/beat.html` → **0**. The word appears
twice in the file and both are in the comment that states this rule.

The real estate is spent, not just claimed. Computed styles off the live page at 1366×768:

| What | Measured | Compact would be |
|---|---|---|
| grid cell height | **40 px** | 14 px |
| ruler beat digit | **22 px** | 8 px |
| ruler subdivision syllable | **18 px** | 8 px |
| ruler labels drawn | **`1 e + a 2 e + a 3 e + a 4 e + a`** | beat digits only |
| Drum Synth per-piece parameter sections | **8** (44 live sliders) | 0 — pads only |
| per-lane division buttons · bars control | **8 · present** | division buttons only |
| body scrollWidth vs viewport | 1366 vs 1366 — **no horizontal overflow** | — |

That ruler string is §13.3's own sequence (§6 frozen for 16ths), rendered by `step-grid.js`'s
`stepLabel()`. This page draws no label of its own and builds no label string — §13.3: "Three
surfaces, one function."

Each machine column scrolls **inside itself** (`max-height: 620px`), so the Drum Synth's 44
sliders cannot push the Drum Sampler off the page and neither can push the grid off the top.
The grid and the transport are what a teacher must never lose to a scroll, so they are pinned;
everything below scrolls as an ordinary document.

### Seat question 3 — does the transport show what the curriculum names? **ANSWERED. All five, plus the two §3 members without which two of the five are invisible.**

Every control writes one public member of §3's transport, spelled the way §3 spells it. This
page keeps no shadow tempo, no shadow meter, and no transport behaviour `clock.js` does not
already have.

| Named in the brief | Control | Writes |
|---|---|---|
| tempo | number box + slider, 40–220, and a live "committing…" flag | `clock.bpm` |
| time signature | top −/+, bottom select limited to §13.4's 2·4·8·16 | `clock.timeSignature` in place |
| count-in | 0–4 bars, with a bars-remaining readout while it sounds | `clock.countIn` |
| loop region | on/off, **start bar + length in bars**, "= pattern" | `clock.loop` |
| record arm | summary in the bar; the eight switches in the Record panel | `capture.arm/disarm` |
| — (added) | ▶ Play · ■ Stop · ● Record | `clock.play/stop/record` |
| — (added) | Metronome | `clock.metronome` |

**Why the metronome was added rather than left out.** It is §3 transport state, and the
count-in *is* metronome clicks — `clock.js` sounds them and suppresses its own `'tick'` event
across them. With no way to turn it on, a count-in runs silently and a student cannot tell it
happened. Adding the toggle makes a control the brief *did* name actually observable.

**Why the loop control takes a LENGTH, not an end bar.** `clock.loop.endBar` is EXCLUSIVE —
`clock.js`'s own LOOP GEOMETRY note and §7's `{startBar: 1, endBar: 5}` are a *four*-bar loop.
The control takes "from bar 1 for 4 bars", does the `start + length` arithmetic itself, and
reads out **"bars 1–4"** — what a student says out loud. The punch control in the Record panel
uses the identical arithmetic for `punchIn(start, start + length)`, so the convention is
learned zero times instead of twice.

#### ⚠ THE TIME SIGNATURE BOTTOM IS A DIGIT, AND THAT CONTRADICTS THIS SEAT'S OWN BRIEF

Seat question 3 asks for "time signature with a **symbol** bottom." **This page renders two
digits and invents no glyph.** CONTRACTS §13.4 rules the other way, citing Brandon directly:
open-decisions **D-20**, which asked for that exact symbol set, is answered by him — *"it
doesn't need to be there"* — and §13.4 states "**Brandon's answer governs. The app stores the
digit and does not render a bottom symbol. No seat invents a glyph set, and no seat re-opens
this.**" §13.4 also says on its own face that this contradicts the seat brief and puts the
contradiction on the record rather than resolving it silently.

Three things settled it: the brief's own sentence says "Per CONTRACTS §3 and §13", pointing at
the section that rules against the symbol; `grid` (P2/S4) hit the identical conflict and
followed §13.4; and two time-signature displays on one page disagreeing would be worse than
either choice. **Decider: Brandon. Nobody else reopens it.**

#### FOUND AND FIXED IN MY OWN FILE — the "bar 0" flash at the top of every take

`clock.countingIn` flips false when the **scheduler's leading edge** reaches the record point,
but `clock.position` deliberately reports the **audible now**, up to one 100 ms window behind
it. For that window the flag says the count-in is over while the student is still hearing the
last clicks, and `position` is still on the negative side of the record point. Measured on this
page before the guard existed: the readout showed **`0 . 4 . 461`** — bar zero — for about a
tenth of a second at the top of every take.

Both numbers are correct and they are correct about *different instants*. The display has to
pick the one the student is hearing. The fix is in `beat.html`'s readout — it treats
`positionTicks < 0` as "audibly still counting in" and shows the bars remaining. **`clock.js`
was not touched.** Reported below as a seam for the Troubleshooter.

#### Browser evidence — every control driven the way a student drives it

| Action | Result |
|---|---|
| typed `90` into the tempo box | `clock.bpm === 90` |
| pressed meter `+` twice | `{top: 6, bottom: 4}`, display `6/4`, lane grew 16 → **24 cells** |
| ruler after the meter change | `1 e + a 2 e + a 3 e + a 4 e + a 5 e + a 6 e + a` |
| pressed meter `−` twice | back to `{top: 4, bottom: 4}` |
| pressed Loop | `{on: true, startBar: 1, endBar: 5}`, readout **"bars 1–4"** |
| count-in 1 bar, pressed ● Record | `state: recording`, `countingIn: true`, readout **"0.9 bars of count-in left"** |
| after the count-in elapsed | `countingIn: false`, readout `0 . 4 . 461` → now shows count-in remaining (guard above) |
| pressed ■ Stop | `state: stopped`, take committed |

#### The record path, end to end, in the browser

One pad press with the transport stopped reached **both** machines with **no `atTime`** — the
live-monitor path, sounding at `ctx.currentTime`. The number keys did the same. Then four kick
hits recorded over one bar:

| | |
|---|---|
| on-screen report | **"4 hits (4 mouse) · 4 snapped, average 14 ticks (15 ms) — 2 late, 2 early"** |
| grid kick lane | `0, 0.8, 0, 0, 0, 0.8, 0, 0, 0, 0.8, 0, 0, 0, 0.8, 0, 0` — four steps, §13.5's `{v}` |
| `capture.toProjectNotes()` | ticks **120 · 600 · 1080 · 1560** — exactly 480 apart, §7's four frozen fields and nothing else |
| Undo take | kick lane back to **0** steps |
| Redo | back to **4** steps |

That drift line is `capture.js`'s seat question 2 made real: a student who played it loose can
see that it snapped, by how much, and which way.

### Seat question 4 — does `shell.js`'s file menu carry over? **YES. Reused, and no second one exists.**

`import { createFileMenu } from '../src/ui/shell.js'` and one call. This page writes no menu:
the only occurrences of `cbdaw-menu` in `beat.html` are in the duplicated CSS block (OPEN
DECISIONS #1) and in the one import. `shell.js` was not edited.

**The one wrinkle, and how it was handled without touching another seat's file.**
`shell.js`'s `TOOLS` table still carries `{id: 'beat', available: false, phase: 'P2'}`, so the
Beat row would render disabled and tagged "P2 — not built yet" *on its own page*. shell.js's
comment says a later phase "flips one boolean" — but that boolean is in `tone-shell`'s file and
this seat's brief is explicit: "reuse it, do not edit it."

`createFileMenu({items, currentId, onSelect})` already takes its list as a parameter — the
component is **told** what to isolate rather than knowing, which is exactly what `tone-shell`
built it for. So `beat.html` hands it `TOOLS.map(...)` with its own row marked available and
reaches into nothing. Verified after load: `shell.js`'s own `TOOLS.find(t => t.id === 'beat')
.available` is **still `false`** — this page copies, it does not mutate.

| Check | Result |
|---|---|
| `.cbdaw-menu` elements on the page | **1** |
| the object is shell's component | `menu.setCurrent` is a function — yes |
| button label | `Tool · Beat ▾` |
| items | Wave Synth (P1, enabled) · Overtone Synth (P1, enabled) · **Beat (P2, `aria-current`)** · Harmony, Patch Synth, The DAW (disabled, "not built yet") |
| Escape closes it | `data-open` → `false` — shell's own document-level listener, in shell's own bag |
| styled | list is `position: absolute`, `rgb(27,35,50)` = `--panel`, 1 px border |
| `shell.js` TOOLS mutated? | **no** — `available` still `false` in the module |

### Seat question 5 — is the CPU meter visible and is `noCap` reachable? **YES — and one of its three numbers does not move, which is reported and said out loud on the page.**

`shell.js`'s `createCpuMeter()`, reused not rewritten, in the top bar. It is handed the
**pair**, so `cpuWeight` on screen is the honest sum of both machines' live voices rather than
one machine's half. `noCap` is a checkbox in the top bar — no dev console, no query string, no
hidden gesture, per §8: it "SHIPS ON THE DEPLOYED BUILD."

| Check | Result |
|---|---|
| meter on screen | track **120 × 10 px at y = 47** — inside the 768 px viewport, visible |
| `noCap` control present | yes, `[data-nocap]` |
| clicking it | `governor.noCap` `false` → **`true`**, label lights `--warn` |
| meter is live | `cpu.frameCount` 63 → 87 over 400 ms — rAF running |
| audio state readout | `running` |

**Then it was pushed — 200 triggers across both machines with `noCap` on:**

| Readout | Under load | Honest? |
|---|---|---|
| `voices` | **150** | yes — climbs without limit, exactly as §8 wants |
| `w` (cpuWeight) | **2277** | yes — the pair's real sum (synth 2277, sampler 0: no kit decoded) |
| CPU bar + number | **`0.00`, 0 % wide, still green** | **NO** |

#### ⚠ THE CPU BAR CANNOT MOVE, AND IT IS NOT THIS PAGE'S TO FIX

`governor.load` in `core/audio.js` times *that module's own registry bookkeeping* — a sweep
plus one `voice.state` read per voice — divided by the 100 ms window. That is microseconds of
work, so at 150 live voices it still rounds to `0.00`.

`audio-core`'s own comment predicted this exactly: *"`clock.js` (P2) does not exist yet, so
there is no lookahead scheduler pass for this file to wrap… When P2's clock.js exists it owns
the real scheduler pass; how the two probes reconcile is noted as an open decision."*
**`clock.js` now exists and does not time its `pass()` either.** So the open decision is
overdue and nothing measures the real scheduler pass. Brandon's stated want here — "push the
machine until it breaks" — is served by `voices` and `w`, and actively undercut by a green bar.

Both files are other seats'. **Escalated with the numbers; not patched.** What this page did
instead is tell the truth on its own face: a line under the top bar names which two numbers are
honest under load and says the bar is a reported P2 open decision. `shell.js`'s meter tooltip
still says "clock.js (P2) does not exist yet", which is now stale — also reported.

### Seat question 6 — does it work with the network off? **YES for the Drum Synth. The Sampler fails exactly the way §14.3 says, names it, and the page names it too.**

The page itself has **zero** network dependencies beyond its own three files: relative ES module
imports, `../src/ui/tokens.css`, no CDN, no web font, no external anything. Only
`drum-sampler.js` reaches out, and only to `/assets/kits/`.

**Tested by killing the network at the request layer, four ways, in a real browser:**

| Scenario | Page | Sampler | Drum Synth |
|---|---|---|---|
| everything reachable | mounts, no error box | `"No kit loaded."`, picker enabled, 2 kits offered | 8/8 pieces, 8 voices, w144 |
| **`/assets/**` aborted** (network gone) | **mounts, no error box**, grid's 128 cells intact | **`"No kits found (kits.json missing or unreadable)."`**, picker **disabled** | **8/8 pieces, 8 voices, w144** |
| `kits.json` served as garbage | mounts, no error box | same named refusal | 8/8, unaffected |
| `808` kit loaded for real | — | `"808" loaded.`, 8 buffers, pads read `808 Kick`… | plays alongside |

That is §14.3 quoted back: "the sampler offers no kits and says so on its face. **The app still
loads and the Drum Synth still works**" — §3's "nothing may block startup." Nothing on this
page awaits `ready()` from either machine; both are called and their rejections logged, never
blocked on.

**§14.5's label rule held under a real kit load.** With `808` decoded, the sampler's own pads
read `808 Kick`, `808 Snare`… while the **grid rows kept §14.1's generic role labels**. The kit
override reaches the machine's own UI and never the grid — `drum-sampler.js`'s design decision
1, verified rather than assumed.

**The A/B was driven, not described.** With `808` loaded, one `pair.noteOn` per role gave
synth 8 / sampler 8. Unticking the Drum Synth's `hear` box: **synth 0 / sampler 8**, the
sampler still at 8 voices and w80. A student can isolate either machine on the same beat.

**What this page adds that the Sampler cannot know:** whether the browser is offline at all.
A line in the Sampler's column tracks `navigator.onLine` and the `online`/`offline` events, and
when offline it turns `--warn` and says the Drum Synth is unaffected — the machine to reach for.
It never claims the kits *will* load (a captive portal reports "online"), only what the browser
believes.

### Seat question 7 — does it tear down? **YES. By count, mid-flight, and it survives the leak test.**

`window.cbdawBeat.dispose()`, also wired to `pagehide` — which is the teardown a student
actually performs, because navigating away is clicking the file menu and going to another tool.

**Order is load-bearing**, and the file says why at each step: the page's rAF stops reading
`clock.position` into DOM about to vanish → the bus stops delivering and releases what is
sounding → the clock's two subscriptions come off → **capture** (it writes into the grid's
pattern, so it must stop first) → **the grid** (its `'tick'` handler is the only thing that
calls the machines' `noteOn` from the scheduler, so it must stop before they disconnect) →
**both machines** → the two channels → the shell's chrome → this page's own listeners.

**Deliberately NOT disposed**, the same reasoning `shell.js` states for itself: `core/audio.js`,
`core/input.js` and `core/clock.js` are document-lifetime singletons — one AudioContext (§10),
one bus every surface shares, one transport every instrument latches to (§3). The transport is
**stopped, never disposed**; `clock.dispose()` would clear the module's 25 ms interval for the
entire document.

**Torn down mid-flight** — a kit decoded, a 12-step pattern running, the transport *playing*,
two notes held on the bus:

| Before | After |
|---|---|
| `clock.state` `playing` | **`stopped`** |
| 2 notes held on the bus | **0** |
| 4 bus listeners | **0** |
| 4 live voices | **0** |
| page in the DOM, 854 nodes | **removed** |
| `step-grid` stylesheet present | **removed** (refcount reached zero) |

**The dispose report — a count, not a claim:**

```
pageRafCancelled true · busUnsubs 2 · notesReleased 2 · clockSubscriptionsDropped 2
captureUnsubs 3 · capture {busSubscriptionsDropped 5}
grid {domListeners 17, tickSubscriptionsDropped 1, rafCancelled 1}
synth {nodesDisconnected 6, listenersDropped 52} · sampler {nodesDisconnected 1, listenersDropped 9}
channelsReleased 2 · cpu {listenersDropped 2} · menu {listenersDropped 9}
listenersDropped 68 (this page's own)
```

**The leak test that matters:** after teardown the transport was started again and left running
for 900 ms. **38 scheduler windows fired and `voicePool.count` stayed at 0** — no orphaned
handler scheduled anything. **Zero page errors** across every probe in this receipt. A second
`dispose()` returns `{alreadyDisposed: true}`.

---

## DONE-CHECK — every clause, driven in a real browser

> "You are done when `/tools/beat.html` loads from `python3 -m http.server` with no build step,
> both machines play on the shared grid, triplet mode and per-step velocity work, live capture
> and loop work, the CPU meter reads, and disposal leaves zero leaks."

| Clause | Verdict | Evidence |
|---|---|---|
| loads from `python3 -m http.server`, **no build step** | **PASS** | plain ES modules, relative imports, no bundler, no dependency. Serve command below |
| **both machines play on the shared grid** | **PASS** | one pattern → synth 7 / sampler 7 triggers, identical, at the grid's own `timeOf(tick)` |
| **triplet mode** | **PASS** | ruler division 3, all 8 lanes 3, 12 cells/lane, labels `1 + a 2 + a 3 + a 4 + a` (D-14) — and it **sounds** at **0.1667 s** between hits = §13.2's exact 160 ticks at 120 BPM |
| **per-step velocity** | **PASS** | press-and-drag a cell to the top → `{v: 0.9}`, fill 90 %; to the bottom → `{v: 0.1}`; a plain tap toggles off, then back on at `{v: 0.8}` |
| **live capture** | **PASS** | 4 hits → grid steps + §7 notes at ticks **120 · 600 · 1080 · 1560**; report reads "4 hits (4 mouse) · 4 snapped, average 14 ticks (15 ms) — 2 late, 2 early"; Undo empties, Redo restores |
| **loop** | **PASS** | loop bars 1–2, played 5 s: position wrapped, max 3820 of 3840 ticks. See the ⏮ finding below |
| **CPU meter reads** | **PARTIAL — reported** | `voices` and `w` are honest (150 / 2277 under load); the **load bar cannot move** — `governor.load` times `audio.js`'s bookkeeping, not a scheduler pass. Another seat's file; escalated, and said on the page |
| **disposal leaves zero leaks** | **PASS** | counts above; 0 listeners, 0 voices, 0 scheduled events after teardown |

**Serve command and URL, as the brief asks for them in the receipt — from the PROJECT ROOT,
not from `/tools`** (the sampler fetches `/assets/kits/kits.json` root-relative, §14.2):

```
python3 -m http.server 8000
http://127.0.0.1:8000/tools/beat.html
```

HTTP, not `file://` — Chrome refuses ES module imports from a `file://` origin and Web MIDI
needs a secure context (§5, §10). `127.0.0.1` counts as secure.

## NEXT ACTION

**None for this seat. Handoff is `/tools/beat.html` to `test-p2` and `redpen-p2`.**

Three things those two should look at first, because they are the three this seat could not
close inside its own lane: the CPU load bar (OPEN DECISIONS 3), the machines' own pads
bypassing the input bus (4), and the stale lane-division closure in `step-grid.js` (6).

## OPEN DECISIONS

Nothing below was fixed. Every one is in another seat's file, or is Brandon's.

1. **`shell.js`'s chrome components are exported but their stylesheet is not.**
   `createFileMenu()` and `createCpuMeter()` are exported for reuse (shell.js's own header:
   "WRITTEN TO BE REUSED… P2/P3 reuse it"), but the stylesheet they need is injected by a
   module-private `acquireShellStyle()` that only `ToolShell.mount()` calls. A page reusing the
   components without mounting a P1-shaped `ToolShell` gets them unstyled. `beat.html` carries
   a **marked duplicate** of exactly those selectors, byte-identical, in a block that names
   this item. Duplicates drift. **Fix: one line in `shell.js` — export
   `acquireShellStyle`/`releaseShellStyle` (or `STYLE_TEXT`) — then delete the duplicate here.**
   Decider: Troubleshooter. P3 will hit this the same way.

2. **`TOOLS` in `shell.js` still has `{id: 'beat', available: false}`.** shell.js's own comment
   says a later phase "flips one boolean." `beat.html` passes its own `items` copy to
   `createFileMenu` instead and leaves the module untouched (verified: still `false` after
   load). **The one-line flip is still needed** so the two P1 pages — and P4's `index.html` —
   stop offering Beat as "P2 — not built yet." Decider: Troubleshooter.

3. **⚠ THE CPU LOAD BAR CANNOT MOVE. `governor.load` measures the wrong thing, and the seat
   that wrote it said so in advance.** `core/audio.js`'s probe times its own registry sweep
   plus one `voice.state` read per voice, divided by the 100 ms window — microseconds, so at
   **150 live voices and cpuWeight 2277 it still reads `0.00` with a green 0 %-wide bar.**
   `audio-core`'s comment: *"clock.js (P2) does not exist yet, so there is no lookahead
   scheduler pass for this file to wrap… When P2's clock.js exists it owns the real scheduler
   pass; how the two probes reconcile is noted as an open decision."* **`clock.js` now exists
   and does not time its `pass()` either**, so the reconciliation never happened and nothing
   measures real scheduler cost. Brandon's stated want — "push the machine until it breaks" —
   is served by `voices`/`w` and undercut by the bar. **Decider: Troubleshooter, and it is a
   `clock.js` + `audio.js` change, not a shell one.** `beat.html` states the limitation on its
   own face rather than letting a green bar mislead a teacher.
   Related and smaller: `shell.js`'s meter tooltip still reads "clock.js (P2) does not exist
   yet" — now stale on all three tool pages.

4. **Both machines' own pads bypass the input bus, so nothing they play is recorded.**
   `drum-synth.js` and `drum-sampler.js` each wire their pads to `this.noteOn(...)` directly.
   Those pads audition that one machine: they never reach the other machine, and — because
   `capture.js` listens to `core/input.js` and only to it — **they are never captured.** A
   student playing a beat in on the Drum Synth's pads would hear one machine and record
   nothing. §5's "four routes produce identical events" is written about hardware routes and
   §12.1 is written about surfaces, so neither file is strictly in breach; the effect is real
   anyway. **Not fixed — both are other seats' files.** `beat.html` works around it by drawing
   one pad row of its own that emits on the bus like a surface should, and says on the page
   that the machines' own pads are auditions. Decider: Troubleshooter — either the pads should
   emit on the bus, or the docset should say plainly that an instrument's own UI is an
   audition path.

5. **QWERTY keys 1–8 for the eight drum roles are THIS SEAT'S addition, and are marked as one.**
   §5 names QWERTY as a route but `input.js` maps only the twelve pitch keys, and a rhythm
   needs two hands — a mouse holds exactly one pad. The mapping is §14.1's eight roles in index
   order, the same order the pads and grid rows already use. No velocity (§12.1's 0.8, applied
   by `input.js`, not re-declared here), no modifiers, no accents — §10 forbids inventing an
   interface and nobody asked. **If a rhythm surface belongs in `shell.js`'s `SURFACES`
   registry under `kind: 'rhythm'` instead, that is a Troubleshooter call and this page's row
   should be deleted in favour of it.**

6. **`step-grid.js`: the per-lane division button closes over a stale `lane` object.**
   `_renderLane(index)` captures `const lane = this._pattern.lanes[index]` and the row's
   division-button listener is attached once, closing over *that* object. `setPattern()`
   replaces `this._pattern.lanes` with new objects — and `capture.js` calls `setPattern()` on
   **every live-projected note**. After any recording, a lane's "T" button reads a stale
   `lane.division` and can toggle to the value the lane already has (a silent no-op). Cell
   painting is unaffected (`_renderLane` re-reads), and `_onCellPointerDown` reads fresh.
   **Low severity, real. Not fixed — `grid`'s file.** For `redpen-p2`.

7. **`clock.js`: `countingIn` flips at the scheduler's leading edge, `position` reports the
   audible now, and the ~100 ms between them renders as "bar 0."** Measured here as
   `0 . 4 . 461` at the top of every counted-in take. Both values are right about different
   instants. **Worked around in `beat.html`'s readout only** (`positionTicks < 0` is treated as
   audibly-still-counting-in); `clock.js` untouched. Whether the clock should expose an
   `audiblyCountingIn` of its own is the Troubleshooter's call.

8. **`clock.js`: `stop()` does not return to zero, and `play()` from past `loop.endBar` never
   enters the loop.** `pass()`'s wrap test is `fromTick < lb.end`, so with the loop on and the
   playhead parked beyond it, playback runs straight past forever (measured: loop bars 1–1,
   played from tick ~2400, reached 4871 without wrapping). `clock.js`'s own receipt already
   lists return-to-zero as an open decision. **Not changed.** `beat.html` gives the student the
   control `clock.js` itself names — a ⏮ button calling `seek(1, 1, 0)` — and turns the loop
   readout `--warn` with "playhead is outside, press ⏮" rather than silently seeking on their
   behalf. Decider: `clock`/Troubleshooter.

9. **Quantize default `{on: true, division: null, strength: 1}` is still Brandon's call.**
   Built to the shipped default exactly, as instructed, and not blocked on. All three fields
   are on the Record panel so the default can be changed by hand and re-applied to existing
   takes with "Re-snap takes" (`capture.requantize()`, non-destructive both ways —
   `trueTick` is never overwritten). **Decider: Brandon.**

10. **The time-signature bottom is a digit, not a symbol — this seat's brief says the
    opposite.** Resolved in favour of CONTRACTS §13.4 and Brandon's D-20 answer, "it doesn't
    need to be there," which §13.4 says governs and forbids any seat from reopening. Written up
    in full under seat question 3. **Decider: Brandon, and nobody else.**

11. **The eight piece labels are still §14.1's PROVISIONAL words.** Carried verbatim, exactly as
    `drum-synth`, `drum-sampler` and `grid` carry them. `beat.html` reads them from
    `DrumSynth.pieces` and never writes one of its own, so Brandon overwriting §14.1's table
    changes this page with no edit to it. **Decider: Brandon.** Already escalated by
    `spec-clock`; not re-escalated here.

12. **The two instrument files collide on CSS class names.** `drum-synth.js` and
    `drum-sampler.js` each inject a stylesheet defining `.ds-root`, `.ds-expanded`, `.ds-pads`,
    `.ds-pad`, `.ds-title` with **different values** (expanded padding 28/36 px vs 32/40 px;
    `.ds-title` `display: none` vs `block`). On this page — the first page to mount both at
    once — whichever injects second wins every tie. Cosmetic only: both machines render, both
    play, nothing throws. **Not fixed; two other seats' files.** For `redpen-p2` to rule on a
    prefix.

## FILE LOCATIONS

- Deliverable: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/tools/beat.html`
- This receipt: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S6-shell/receipt-beat-shell.md`
- Serve command (from the **project root**, not `/tools`):
  `python3 -m http.server 8000` → `http://127.0.0.1:8000/tools/beat.html`

**Read and called, never edited** (all confirmed unmodified by mtime at the final write):

| Module | Seat | What this page uses |
|---|---|---|
| `src/ui/shell.js` | `tone-shell`, P1/S4 | `TOOLS`, `createFileMenu`, `createCpuMeter` |
| `src/core/audio.js` | `audio-core`, P1/S2 | `ctx`, `unlock`, `createChannel`, `releaseChannel` |
| `src/core/input.js` | `keys-input`, P1/S3 | `input` — subscribe, and emit from this page's pads |
| `src/core/clock.js` | `clock`, P2/S3 | `clock`, `fromTicks`, `ticksPerBar` |
| `src/surfaces/step-grid.js` | `grid`, P2/S4 | `StepGrid` |
| `src/instruments/drum-synth.js` | `drum-synth`, P2/S4 | `DrumSynth` |
| `src/instruments/drum-sampler.js` | `drum-sampler`, P2/S4 | `DrumSampler` |
| `src/core/capture.js` | `capture`, P2/S5 | `Capture` |
| `src/ui/tokens.css` | `scopes`, P1/S3 | every colour, via `var(--token, fallback)` — no literal |

**Handoff out:** `/tools/beat.html` → `test-p2`, `redpen-p2`. `window.cbdawBeat` is the handle;
`.dispose()` returns the count report quoted above, and `.grid`, `.capture`, `.pair`, `.synth`,
`.sampler`, `.cpu`, `.menu` are all reachable on it for testing.
