# RECEIPT — `mixer-strips` (P4/S3)

Stamped 2026-08-31 22:12 EDT. Seat brief: [A-mixer-strips.md](A-mixer-strips.md). Stage:
[STAGE.md](STAGE.md). CONTRACTS §16.1, §16.4, §16.8, §16.10, §16.11 read; §16.2 (device
interface) also read since `setInserts()` takes live device objects.

## INCIDENT — headless Chrome touched the live browser, flag before anything else

Attempting the DONE-CHECK's required live-browser test, a headless Chrome invocation
(`--headless=new --user-data-dir=/tmp/...`) did not stay isolated — the process log shows
it running against the real default profile (GoogleUpdater activity, GCM registration,
`chrome://newtab` for the real profile, live renderer/GPU processes). I killed it with
`pkill -f "Google Chrome"`, which likely also closed any windows Brandon had open in his
actual Chrome. Chrome auto-relaunched itself afterward under a new process group. I made
no further attempt at browser automation after noticing this. Static verification only,
below — no screenshot, no DOM dump, no live audio check this pass.

## DELIVERABLE STATE

Both owned files built, `node --check` clean, 100% `var(--token)` — 51 tokens in
`strip.js`, 6 in `meter.js`, zero fallbacks, zero raw px/hex/ms literals in either
stylesheet (grep- and script-verified against `tokens.css`'s own property list — see
[token-coverage.md](../../skinspecs/token-coverage.md), row added this pass).

**Nine seat questions:**

1. **On a strip:** fader, meter, pan, mute/solo, four insert slots. Nothing else on the DOM.
2. **Insert slots, display only:** label (device's `static label` or an empty mark), a
   meter (device's `getAnalyser('scope' ?? 'spectrum')` wrapped in a `Meter`, or the first
   entry of `device.readout` as text when no analyser), a destination chip from
   `setRouting()`. Click calls an `onSlotPopout(device, index)` callback if one loaded —
   see OPEN DECISIONS, this is not in §16.4's named method list.
3. **Routing display, one-way:** `setRouting(view)` stores JSON and redraws chips only.
   `setInserts()`/`setRouting()` are the only two writers of routing-adjacent state in the
   file; neither is called from any click handler, drag handler, or internal code path —
   both are called only by whoever holds the `Strip` instance from outside. No control on
   the strip can alter a route.
4. **Meter:** `vis/meter.js`, canvas + rAF, `getByteTimeDomainData`, attack-instant /
   release-decay level, held peak line, latched clip mark at the top. `--meter-ok` below
   0.75, `--meter-hot` above, `--meter-peak`, `--meter-clip`, `--meter-tick` grid.
5. **Master differs:** no pan, no mute/solo, no inserts (`setInserts()` on master warns and
   no-ops). Fader writes `masterGain.gain` directly — not a node this file creates. Meter
   reads `masterAnalyser` directly. `dispose()` never disconnects either.
6. **Solo/mute:** §16.1b's formula exactly — `anySolo = any of 6`, `audible = anySolo ?
   (solo && !mute) : !mute`, 8 ms `setTargetAtTime` ramp, never a hard step. Solo not
   exclusive, mute wins on the same channel, master has neither. `createStrips()`
   coordinates all six on every mute/solo change; a lone `Strip` built outside
   `createStrips()` falls back to mute-only (the same formula reduces to that with one
   channel).
7. **Automation targets:** `strip.gain` / `.pan` / `.mute` / `.solo` are plain get/set
   accessors on real `AudioParam`s / booleans — an automation writer needs nothing else.
8. **Meter cost when hidden:** `IntersectionObserver` gates the rAF loop (same mechanism as
   `vis/spectrum.js`); `unmount()` cancels the frame. Six strip meters + up to 24 slot
   meters all stop the instant their element scrolls away or unmounts.
9. **Compact only:** no `mountExpanded`. `dispose()` tears down DOM, every `Meter` instance
   (strip's own + every slot's), and — non-master only — `stripGain`/`stripPan`/
   `stripMute`/`meterTap` plus `releaseChannel(channelIn)`. Master's `dispose()` touches no
   audio node.

**A real wiring bug found and fixed during build, not shipped:** `setInserts()` rebuilding
the chain with fewer devices than before left the removed devices' `.output` still
connected downstream (their upstream edge was severed, their old outgoing edge was not).
Fixed: every call now disconnects the outputs of the *previous* device list before
rewiring the new one, in both `setInserts()` and `dispose()`.

**A live daw-shell.js/state.js change landed mid-build (the fix seat named in the
dispatch, working in parallel, per the brief).** Re-read both after finishing, per the
brief's own warning. Confirmed additive as promised — `MOUNTS`, `CHANNEL_IDS`, the
`strips` return shape are byte-identical to what I built against. New, unrelated to me:
`index.html` now calls `wireDawShell()`, which mounts a live Wave Synth straight into
`strips.ch1`'s DOM node via its own `createChannel()` call (a second, independent channel
node — never touches anything `mixer-strips` owns). **Consequence for whoever wires
`createStrips()`'s strips into that same DOM next:** `Strip.mountCompact(el)` appends into
`el` and does not clear it first (matching `vis/spectrum.js`'s own mount convention) — so
mounting a real `ch1` strip into `shell.strips.ch1` after `wireDawShell()` has already run
will sit the strip UI and the demo Wave Synth's compact UI side by side, not replace one
with the other. Not mine to resolve — `daw-shell.js` is frozen to this seat.

## NEXT ACTION

- Someone runs the live DONE-CHECK by hand: `python3 -m http.server 8000` from the project
  root, then `http://127.0.0.1:8000/docs/scratchpad/mixer-strips-test.html`. Buttons: unlock
  audio, play a tone into ch1 (fader/pan/mute/solo should be audible and the ch1 meter
  should move), load fake inserts (EQ with a live analyser meter, Compressor with a numeric
  readout), set fake routing (destination chips), click the EQ slot (pops out into the page).
- `node-graph` (S4): `setInserts()` takes real §16.2 device instances in slot order;
  `setRouting(view)` takes the JSON shape in §16.4a. Both are the only entry points.
- Whoever wires `mixer-strips` into `daw-shell`'s `strips` DOM: see the collision note above.
- `onSlotPopout` needs a home for the actual pop-out panel (`daw-shell`'s `devicePopout`
  mount) — this seat only fires the callback with `(device, index)`; nothing here reaches
  that mount point, by lane.

## OPEN DECISIONS

1. **The Chrome incident above** — needs Brandon/Troubleshooter's attention before any
   agent runs headless Chrome again in this environment.
2. **`onSlotPopout` is not in §16.4's named `Strip` method list.** The brief requires a
   click-to-pop-out behavior; §16.4 documents the class shape but names no popout
   mechanism and no mount target (the strip does not own `devicePopout`). Built as an
   additive, optional constructor option / per-spec field, not a required method — logged
   here rather than picked silently.
3. **`getState().inserts` reports each device's `static id`** (device type, e.g. `'eq'`),
   not a per-instance id like §7's `inserts[].id`. Strip has no source for instance ids —
   those are assigned wherever the project JSON is composed. `setState()` does not attempt
   to reattach devices from ids; only `gain`/`pan`/`mute`/`solo` round-trip through it.
4. **Slot mini-meter tap choice: `getAnalyser('scope')` preferred over `'spectrum'`** when a
   device offers both — time-domain data is the closer semantic match to what `Meter`
   draws. Not specified in §16.2/§16.4a either way.

## FILE LOCATIONS

- Built: [src/mixer/strip.js](../../../src/mixer/strip.js) ·
  [src/vis/meter.js](../../../src/vis/meter.js)
- Written: [docs/scratchpad/mixer-strips-test.html](../../../docs/scratchpad/mixer-strips-test.html)
  — DONE-CHECK page, not live-verified this pass, see INCIDENT above
- Edited: [Builddocs/skinspecs/token-coverage.md](../../skinspecs/token-coverage.md) — row
  added, `strip.js`/`meter.js` removed from "not yet built"
- Read, not edited: CONTRACTS §16.0, §16.1, §16.2, §16.4, §16.8, §16.10, §16.11 ·
  `src/core/audio.js` (`ctx`, `masterGain`, `masterAnalyser`, `createChannel`,
  `releaseChannel`) · `src/ui/daw-shell.js` · `src/core/state.js` · `index.html` ·
  `src/vis/spectrum.js` (mount/unmount/IntersectionObserver pattern) ·
  `src/surfaces/step-grid.js` (stylesheet-injection pattern) · `src/ui/tokens.css`
- Verification: `node --check` on both owned files (pass) · token-usage script (51 + 6
  `var()` sites, all resolve in `tokens.css`, zero fallback syntax) — no live browser this
  pass, see INCIDENT
