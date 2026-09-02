# PATCH SYNTH — HANDOFF, OPUS 1 → OPUS 2

Stamped 2026-08-31 22:00 EDT. File: `/src/instruments/patch-synth.js`, 763 lines.

> **CLOSED 2026-08-31 22:50 EDT by opus agent 2.** Everything this doc calls OPEN or
> STUBBED is built, and §16.7 is complete at 1768 lines. The plan below was followed. The
> final state, the two verification harnesses, and the decisions agent 2 made are in
> [receipt-patch-synth.md](receipt-patch-synth.md) under **AGENT 2**. Read the receipt
> first; what follows is the record of the handover, kept as written.
>
> **Four corrections to what this doc says, for anyone reading it as truth:**
>
> 1. **NEXT step 1 is wrong about one thing.** It says refuse "an input already taken".
>    §16.7.6 says that, but §16.7.7's parallel chain needs two cables into one `gain`
>    input. Built: audio inputs fan in, control inputs hold one. See the receipt's OPEN
>    DECISION 1 — Brandon should confirm.
> 2. **NEXT step 2's math weights were guesses.** Built as counted nodes: `add` 2 (a gain
>    plus a constant, not one gain), `multiply` 1, `scale` 3, `invert` 1.
> 3. **The port seam grew one method.** A math node's `a`/`in` control input is an
>    AudioNode inlet, not an `AudioParam`, so `PatchNode.controlIn(portId)` sits beside
>    `sink(portId)`. `connect` tries `controlIn` first, then `sink`. `portConnected` and
>    `portIsConnected` were added so a math node's `b` param yields to a patched `b` port.
> 4. **There is one raw literal in the file** — `90deg`, in the canvas gradient. No angle
>    token exists. Receipt OPEN DECISION 3.
>
> **How to run it.** Stub: `node patch-synth-smoke.mjs` from this folder, 65 assertions.
> Browser: serve the project root over HTTP and open
> `/docs/scratchpad/patch-synth-harness.html`. There is still no `tools/patch-synth.html`
> — no seat owns it.

---

## STATE

**BUILT AND RUNNING — the audio engine and the node model.**

- `PatchSynth` implements every method CONTRACTS §16.7.1 names. Nothing throws.
- Seven node kinds are real Web Audio and make sound: `osc`, `noise`, `lfo`, `env`,
  `filter`, `gain`, `out`.
- `addNode` / `removeNode` / `getNode` / `listNodes` work. The 24-node cap is enforced
  and `governor.noCap` lifts it. A refusal returns `{ ok: false, reason }` and creates
  nothing.
- `setParam` / `getParam` address `'<nodeId>.<param>'` and `'<kind>.<param>'`.
- `noteOn` / `noteOff` / `allNotesOff` set every `osc` base frequency and drive every
  `env` gate. Monophonic, last-note priority.
- `cpuWeight` sums the nodes actually present plus the analyser. `voiceCount` reports
  1 while a note is held or an envelope release is still running.
- `getState` / `setState` round-trip every node — id, kind, x, y, every param — plus
  palette group state. `dispose` tears down every node, every control sink, every timer.
- 29 assertions pass against a stubbed Web Audio context.
  Harness: `Builddocs/P4-the-daw/S3-systems/patch-synth-smoke.mjs`. Run
  `node patch-synth-smoke.mjs` from that folder. It is self-contained — it reads the real
  source and swaps the one `governor` import for a stub, so no AudioContext is built.

**STUBBED — bodies are empty, callers are safe.**

- `mountCompact(el)` / `mountExpanded(el)` store the element and call `_paint`, which
  does nothing. `_syncUI()` does nothing. `unmount()` fully works.
- `getState().cables` is a hard-coded `[]`.

**NOT BUILT — nothing exists at all.**

- Cables. There is no `connect` / `disconnect` and no edge store. The audio seams they
  need are built (see EXPORTS: `audioIn`, `audioOut`, `sink`).
- The four math node kinds.
- Any DOM, any CSS, any token use. The file writes no markup and no style today, so it
  currently uses zero tokens.
- Any starting patch. A fresh instrument holds exactly one node: `out`.

---

## EXPORTS

One default export. No named exports. `PatchNode` is module-private.

```js
export default class PatchSynth {
  static id = 'patch-synth';
  static label = 'Patch Synth';
  static playable = true;
  static needsLoad = false;
  static pieces = null;
  static emitsNotes = false;
  static groups = GROUPS;
  static kinds = KINDS;

  constructor(ctx, out)
  async ready()

  get nodeCap()
  get nodeCount()
  get lastRefusal()
  get groupOpen()
  setGroupOpen(groupId, open)

  addNode(kind, x = 0, y = 0)
  removeNode(id)
  getNode(id)
  listNodes()

  noteOn(note, velocity = 0.8, atTime)
  noteOff(note, atTime)
  allNotesOff()
  onNoteOut(_fn)
  offNoteOut(_fn)
  bindState(_store)
  unbindState()

  setParam(path, value)
  getParam(path)
  getState()
  setState(obj)

  get voiceCount()
  get cpuWeight()
  getAnalyser(which)

  mountCompact(el)
  mountExpanded(el)
  unmount()
  dispose()

  _createNode(kind, x, y)
  _claimId(node, id)
  _refuse(reason)
  _resolve(path)
  _listen(which, el, type, fn)
  _clearMountListeners(which)
  _paint(_which)
  _syncUI()
}
```

Module-private, and the whole seam the cable layer builds on:

```js
class PatchNode {
  constructor(ctx, id, kind, x, y)
  get weight()
  get sounding()
  portSpec(portId, dir)      // dir = 'in' | 'out'
  audioIn(portId)            // AudioNode or null
  audioOut(portId)           // AudioNode or null
  paramTarget(portId)        // AudioParam or null
  sink(portId)               // GainNode scaled by the port's span, or null
  setParam(id, value)
  getParam(id)
  trackNoiseDest(dest, add)
  setNote(freq, atTime)
  gateOn(atTime, peak = 1)
  gateOff(atTime)
  toJSON()
  dispose()
  _build()
  _swapNoise(color)
  _applyOscFreq(freq, atTime)
}
```

Module constants: `NODE_CAP = 24`, `ANALYSER_COST = 2`, `MIN_RAMP = 0.001`,
`NOISE_SECONDS = 2`, `WAVE_TYPES`, `WAVE_TO_OSC_TYPE`, `FILTER_TYPES`, `NOISE_COLORS`,
`LFO_WAVES`, `GROUPS`, `GROUP_OPEN_DEFAULT`, `KINDS`, `noiseBuffers`.
Helpers: `clamp(v, lo, hi)`, `midiToFreq(note)`, `noiseBuffer(ctx, color)`.

`KINDS[kind]` shape:

```js
{ group, label, weight, fixed?, ins: [{ id, domain, label, span? }],
  outs: [{ id, domain, label }],
  params: [{ id, kind, label, def, values? | min?, max?, step? }] }
```

`domain` is `'audio' | 'control' | 'trigger'`. `param.kind` is
`'enum' | 'int' | 'float'`. `span` exists only on control inputs.

---

## SPEC DELTA

| § | title | status |
|---|---|---|
| 16.7.1 | The instrument shell | **DONE** — except `mountCompact`/`mountExpanded` bodies, which are 16.7.8's |
| 16.7.2 | Sources | **DONE** |
| 16.7.3 | Modulators | **DONE** |
| 16.7.4 | Processors | **DONE** |
| 16.7.5 | Math nodes, and how they stay optional | **OPEN** — rule 1 and rule 2 are half-built: `GROUPS` orders Math last and `GROUP_OPEN_DEFAULT.math` is `false`. The four kinds do not exist |
| 16.7.6 | Cables — what may connect to what | **OPEN** — nothing built. Port domains and spans are declared and ready |
| 16.7.7 | A parallel chain inside the instrument | **OPEN** — needs 16.7.6 first |
| 16.7.8 | Caps, state, and views | **OPEN** — the node cap is DONE and refuses correctly; `getState`/`setState` carry nodes but not cables; both mount views are empty |

---

## DECISIONS MADE

- `osc` weight 9 — §8's plain voice (10) minus its `GainNode` (1). §8 has no
  `OscillatorNode` row.
- `noise` weight 9 — an `AudioBufferSourceNode` priced as an oscillator. Unmeasured.
- `lfo` 10 (osc 9 + depth gain 1), `env` 1 (`ConstantSourceNode`), `filter` 9, `gain` 1,
  `out` 1. Each connected control input adds 1 for its scaling gain.
- `cpuWeight` includes the instrument's one `AnalyserNode` at 2, matching `wave-synth.js`.
- A control input owns a `span` — the amount one unit of incoming signal moves that
  param. `osc.freq` 500 Hz, `osc.detune` 1200 cents, `filter.cutoff` 5000 Hz,
  `filter.q` 20, `gain.amount` 1. Without this an LFO at depth 1 cannot move a cutoff in
  Hz and the LFO lesson would require a `scale` math node.
- The span lives in a `GainNode` built by `PatchNode.sink(portId)`, lazily, on the
  destination side. The cable connects source → sink; the sink is already wired to the
  `AudioParam`. Disposed with the node.
- `env.gate` is domain `'trigger'`, a third domain beyond §16.7.6's two. No node has a
  trigger output, so no cable can reach it. Gates are driven only by
  `noteOn`/`noteOff`/`allNotesOff`. `sink()` returns null for it.
- Monophonic, last-note priority. One patch, not one patch per note. `voiceCount` is 0
  or 1.
- `noteOn` velocity scales the envelope peak, so all four stages scale with it.
- Node ids are `kind` + a per-kind counter: `osc1`, `osc2`, `filter1`. Global numbering
  was tried first and made the first filter `filter3`.
- `setParam`/`getParam` accept a bare kind as an alias for the first node of that kind,
  so §2's own `'osc.wave'` and `'env.attack'` examples work literally.
- `gain.amount` defaults to 0.7 so `osc → gain → out` is audible with no envelope.
  A student wanting envelope-only loudness sets it to 0.
- Refusals return `{ ok: false, reason }` and also land on `lastRefusal`
  (`{ reason, at }`). No listener interface was invented.
- Pink noise is generated into the buffer (Paul Kellett filter) rather than filtered at
  runtime, so `noise` costs no extra node. Buffers are cached per colour per sample rate.
- `osc`, `noise` and `lfo` sources start at construction and free-run. Silence comes from
  the envelope and the gain, not from starting and stopping sources.
- `getAnalyser` returns the one analyser for both `'spectrum'` and `'scope'`, null
  otherwise.
- The patch synth does not register with `voicePool`. It has no per-note voices to steal.
  It does call `governor.request(weight)` before every node, per §16.7.8.
- No starting patch was created. A fresh instrument holds only `out`, because a default
  patch is cables and cables are OPEN.
- `bindState`/`unbindState` are no-ops returning `this`. Nothing here reads scale state.

---

## NEXT

Three moves, in this order.

**1 — §16.7.6, the cable layer.** Add an edge store (`Map` of edge id →
`{ from, fromPort, to, toPort }`) and `connect(fromId, fromPort, toId, toPort)` /
`disconnect(edgeId)`. Both return `{ ok, ... }` / `{ ok: false, reason }` through the
existing `_refuse`. Refuse, with a reason: mismatched domain, a `trigger` port, an input
already taken, a cycle. Resolve the two ends with `audioOut(port)` for the source and —
for the destination — `audioIn(port)` when the port domain is `audio`, `sink(port)` when
it is `control`. Call `trackNoiseDest(dest, true/false)` on a `noise` source so a colour
swap survives. `removeNode` must drop every edge touching that node.

**2 — §16.7.8's state, then §16.7.5's four math kinds.** Fill `getState().cables` and
teach `setState` to rebuild edges after all nodes exist. Then add `add`, `multiply`,
`scale`, `invert` to `KINDS` with `group: 'math'`, and their `_build` / `audioOut` /
`paramTarget` cases. `add` and `multiply` are `GainNode`-based, weight 1; `scale` is a
gain plus a constant source, weight 2; `invert` is a gain at −1, weight 1. Keep every
example patch working with none of them.

**3 — §16.7.8's two views.** Write `_paint('compact')` and `_paint('expanded')` and a
real `_syncUI`. Compact is the DAW: small, still, readable. Expanded is the standalone
page: the graph is the visual and takes the animation budget. Draw the palette from
`PatchSynth.groups` in order with Math last and closed, gated on `groupOpen` /
`setGroupOpen`. Draw `lastRefusal` on the palette entry that was refused. Label the
envelope's four controls exactly `Attack`, `Decay`, `Sustain`, `Release`.

**Styling, when you get to move 3.** Every visual value is `var(--token)` with no
fallback. A raw literal is a defect. The graph tokens already exist and are the ones to
use: `--graph-ground` `--graph-grid` `--node-fill` `--node-head` `--node-border`
`--node-selected` `--node-dragging` `--node-dimmed` `--port-in` `--port-out`
`--port-active` `--edge-audio` `--edge-control` `--edge-refused` `--edge-hover`
`--cable-drag` `--math-group`, plus `--z-drag` `--z-scrim` `--tr-transform` `--tr-stroke`
`--tr-color` `--canvas-lw-2` `--canvas-lw-3` and the whole existing `--sp-*` `--fs-*`
`--r-*` `--op-*` layout/keyword vocabulary. A node box is `--sp-60` wide. Do not write
`tokens.css`. If a surface has no dial, stop and escalate.

**Before you report.** Extend the smoke harness with the new assertions, update
`Builddocs/P4-the-daw/S3-systems/receipt-patch-synth.md`, `INDEX.md`, `SESSIONLOG.md`,
`TODO.md`, and `Builddocs/skinspecs/token-coverage.md` — coverage changes the moment you
write the views, and it has not changed yet.

**Done-check to hit.** Wire an oscillator through a filter to output and hear it. Wire an
LFO to a filter cutoff and hear it move. Wire an envelope with all four named stages.
Build a two-branch parallel chain that recombines at one gain. Hit the 24-node cap and
see it refused visibly. Lift it with `governor.noCap`. Round-trip a full patch with
cables through JSON. Dispose to zero.

---

## DO NOT READ

- `Builddocs/CONTRACTS.md` §1–§15 and §16.1–§16.6, §16.9, §16.11, §16.12. Reference only,
  and none of it is yours.
- `Builddocs/P4-the-daw/S3-systems/A-patch-synth.md`. Written 2026-08-20; CONTRACTS §16
  outranks it and §16.7 says everything it says.
- Every other file in `/src/instruments/`, all of `/src/surfaces/`, `/src/devices/`,
  `/src/theory/`, `/src/vis/`, `/src/mixer/`.
- `index.html`, `daw-shell.js`, `state.js`, `audio.js`, `clock.js`, `capture.js`.
  Frozen. `audio.js` gives you `governor` and nothing else you need.
- `tools/*.html`. `tools/patch-synth.html` is in no seat's lane — do not build it.
- `/src/mixer/graph.js`. It does not exist. S4 builds it. Do not create, import, or stub
  it. Your graph is internal to this instrument and shares no code with it.

## READ ONLY THIS

- `/src/instruments/patch-synth.js`
- `Builddocs/CONTRACTS.md` §16.7.5, §16.7.6, §16.7.7, §16.7.8 — lines 4313 to 4366
- `src/ui/tokens.css` — read the token names only, when you reach move 3
