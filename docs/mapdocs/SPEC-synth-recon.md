# Synth Lab recon — port or rebuild?

Read-only recon of `Synth Lab/` (Vite+React+TS+Tone.js browser synth for a
music class) against this repo's instrument contract. 2026-09-07.

Screenshot: [Screenshot 2026-09-07 at 10.17.13 PM.png](../../Screenshot%202026-09-07%20at%2010.17.13%20PM.png)
Plan: [Synth Lab/PLAN.md](../../Synth%20Lab/PLAN.md)
Buildlog: [Synth Lab/BUILDLOG.md](../../Synth%20Lab/BUILDLOG.md)

Screenshot matches PLAN.md's signal-flow layout exactly: OSC1/OSC2/FILTER/AMP
row, ENV1/ENV2/LFO1/LFO2 row, SCOPE+SPECTRUM row. It ran, it made sound
(spectrum shows a real harmonic series, note B5 −6¢ tuned-in). BUILDLOG marks
it BUILT, under git since 2026-06-11, "no open in-flight work" — except the
`visual-overhaul/` side effort, which is separate and stalled (see F).

## A. BLOCK MAP

One file, one class, per-voice graph — [Synth Lab/src/engine/voice.ts](../../Synth%20Lab/src/engine/voice.ts).

| Block | Node(s) | Routes to |
|---|---|---|
| OSC1/OSC2 | 2× `Tone.OmniOscillator` | own level gain |
| osc level | 2× `Tone.Gain` | filter |
| Filter ×1 (not 2 — "master filter" is per-voice, shared controls) | `Tone.Filter` (biquad, rolloff −12) | outputGain |
| Amp | `Tone.Gain` (`outputGain`, base 0) | voice `output` |
| ENV1/ENV2 | 2× `Tone.Envelope` | mod amount gains only, not audio path |
| LFO1/LFO2 | 2× `Tone.LFO` (built in [engine/lfo.ts](../../Synth%20Lab/src/engine/lfo.ts)) | mod amount gains only |
| Mod matrix | 24× `Tone.Gain` (4 sources × 6 dests), [engine/mod-matrix.ts](../../Synth%20Lab/src/engine/mod-matrix.ts) | osc1/osc2 detune, filter detune, amp gain, osc1/osc2 pulse-width |

Master chain, [engine/audio-engine.ts](../../Synth%20Lab/src/engine/audio-engine.ts):
`masterGain → EQ3 → Limiter(-3) → destination`, analysers tap post-limiter.

**Poly, 8-voice pool, `Voice` class — not `Tone.PolySynth`** (PLAN.md calls this
out as non-negotiable). Every voice always exists (constructed in the pool up
front); mono mode uses the same pool with 1 active voice and hard-stops others.
Allocation/stealing/release-tail timers live in
[engine/voice-manager.ts](../../Synth%20Lab/src/engine/voice-manager.ts) — oldest-first steal, 0.5s release-tail free timer, matches this repo's `voicePool`/governor idea but reimplemented standalone, no shared governor.

## B. DEPS — port cost

Our `src/` is plain ES modules, no build step, no libraries.

| Dep | What it's used for | Port cost |
|---|---|---|
| `tone` (14.7.77) | Envelope, LFO, OmniOscillator, Filter, Gain, EQ3, Limiter, Analyser, all scheduling (`rampTo`, `setTargetAtTime`) | **High.** Every node type and every scheduling call needs a raw-Web-Audio rewrite. `Tone.Envelope`/`Tone.LFO` have no native equivalent — hand-build both (this repo's wave-synth.js already hand-builds an envelope via `_gainAt`/ramp scheduling, so there's a pattern to follow). `OmniOscillator` type-switching (incl. pulse via width) needs its own PWM oscillator (native `OscillatorNode` has no pulse type). |
| `react` + `react-dom` | Whole UI | **High** if UI is ported too — this repo's UI is vanilla DOM (`mountCompact`/`mountExpanded`, manual listeners). Every component (`OscSection`, `Knob`, `ModRoute`, etc.) needs a hand-written DOM equivalent. |
| `zustand` | Patch state + engine sync | **Low-medium.** Small API; this repo doesn't use a store lib but the pattern (flat patch object, `setParam(path, value)`) is directly portable to a plain object + pub/sub, or dropped in favor of this repo's own per-instrument `_params` pattern. |
| Vite + TS + tsconfig | Build step | **N/A for port** — target repo has no build step, so this whole toolchain is discarded, not ported. |

## C. UI COUPLING

State layer, not direct-to-AudioParam. Confirmed in
[state/store.ts](../../Synth%20Lab/src/state/store.ts) and
[components/OscSection.tsx](../../Synth%20Lab/src/components/OscSection.tsx):
a knob's `onChange` calls `setParam(path, value)` → zustand action →
`applyParam` (pure, clones patch) → `engine.setParam(path, value, patch)` →
`VoiceManager.setParam` → every pooled/active `Voice.setParam` writes the
AudioParam (`.rampTo`, `.value`, `.setTargetAtTime`). Patch is the single
source of truth; engine is a pure consumer of it.

Panel is **keepable as a UI/interaction reference**, not directly reusable —
it's React JSX + a CSS custom-property system (`styles/tokens.css` etc.), and
this repo's `mountCompact`/`mountExpanded` convention is vanilla DOM. Porting
the panel means re-implementing each component (`Knob`, `ModRoute`, `EnvGraph`,
`FilterCurve`, `LfoPreview`, `Scope`, `Spectrum` — all in
[Synth Lab/src/components/](../../Synth%20Lab/src/components/)) as hand-built
DOM, but the layout/behavior spec (mod-route dropdown, per-destination bipolar
amount knobs, signal-flow grid) is a genuinely useful reference to build from.

## D. CONTRACT GAPS vs. `wave-synth.js`

Contract read from [src/instruments/wave-synth.js](../../src/instruments/wave-synth.js)'s
own header/method comments (§2 module contract, §11.1–§11.7c Voice class) —
**note:** the task pointed at CONTRACTS.md §16 for this shape; §16 is actually
"CHANNELS, DEVICES, AND GRAPH" (mixer/device routing), not the instrument
contract — flagging the mismatch rather than silently substituting. The real
instrument contract lives in §2/§11, and wave-synth.js's own comments restate
it in full, which is what this comparison uses.

| Contract point | wave-synth.js | Synth Lab | Gap |
|---|---|---|---|
| `noteOn(note, velocity, atTime)` | yes, exact | `Voice.noteOn(midi, patch)`, `VoiceManager.noteOn(midi)` — no velocity, no explicit `atTime` param (uses `Tone.getContext().currentTime` internally) | needs velocity + explicit time param added |
| `noteOff(note, atTime)` | yes, exact | `noteOff(midi)` — no `atTime` | needs explicit time param added |
| `connect`/output shape | instrument owns `_mixGain`→`_analyser`→`out`, single instrument-level output | `Voice.output` per-voice, summed at `VoiceManager`'s `masterOut`; no per-instrument analyser/mix-gain convention, no `getAnalyser()` | needs an instrument-level facade wrapping VoiceManager to match the `getAnalyser('spectrum'/'scope')`, `mountCompact/mountExpanded`, `getState/setState`, `dispose()` method set — none of that exists in Synth Lab today, it's a top-level singleton `engine`, not a per-instrument class |
| **`_gainAt(t)` live release seam** | explicit: reads the *scheduled* envelope value at time t (not a stale `.value`), used so a release-in-flight can be re-aimed without a click | **missing.** `Voice.noteOff()` just calls `Tone.Envelope.triggerRelease()` — Tone's own Envelope handles its internal ramp math, so it likely doesn't click, but there's no exposed `_gainAt`-equivalent and no evidence it was ever verified against this repo's rule ("read the live envelope value, not a stale gain") | needs verifying/porting explicitly if the Voice class is rebuilt in raw Web Audio, since `Tone.Envelope`'s internal safety net disappears once Tone.js is removed |
| Voice pool / governor | `voicePool`/`governor` shared, frozen system this repo already owns | Synth Lab's `VoiceManager` reimplements pooling/stealing standalone, no governor hookup | a port must either wire into the shared `voicePool`/`governor` or keep its own pool — architectural decision, not a code gap |
| Per-instrument `cpuWeight`, `getState/setState`, `mountCompact/mountExpanded`, `dispose()` | all present, exact | none of these exist as instrument-facade methods (Synth Lab's UI is a whole app, not a mountable instrument module) | full facade wrapper needed to sit inside this repo's instrument roster |

## E. BUILD

`cd Synth\ Lab && npm run build` — **PASS**, node_modules already present, no install needed.

```
> synth-lab@0.1.0 build
> tsc && vite build

vite v5.4.21 building for production...
✓ 1041 modules transformed.
dist/index.html                   0.39 kB
dist/assets/index-DGjxP7nl.css   16.06 kB
dist/assets/index-DC84b_bJ.js   447.32 kB
✓ built in 634ms
```

Not served, not played — build success only.

## F. WISHLIST COST

| Feature | Already has | Still needs |
|---|---|---|
| Polyphonic voices | Full 8-voice pool + steal-oldest + mono/poly switch, already built and (per screenshot) audibly working | Nothing — this is the one thing Synth Lab does that our repo's synths don't; a port brings this capability *with* it |
| Detune knob | `osc.detune` fine-tune (±50¢) per oscillator already in the patch schema and wired to `Voice.oscDetuneCents` | Nothing extra — already shipped |
| Pulse width | `osc.pw` param + PWM via `Tone.OmniOscillator`'s `'pulse'` type + mod-matrix routing (`pw1`/`pw2` destinations) | Needs a hand-built PWM oscillator once Tone.js is dropped — native `OscillatorNode` has no pulse type, this repo would need its own PWM implementation (e.g. two sawtooths phase-offset-subtracted, or a `AudioWorklet`) |

## G. VERDICT

**PORT, selectively — the mod-matrix/voice architecture, not the app.**

Reason: the hard part (8-voice pool with proper steal/release-tail, a working
24-slot per-destination mod matrix, PWM oscillator handling) is already
designed, built, and confirmed making correct sound (screenshot shows a real
harmonic spectrum in tune). Rebuilding that logic from scratch in raw Web
Audio would re-solve problems already solved here. What doesn't port is the
UI (React) or the instrument-facade shape (`mountCompact`/`getAnalyser`/
`dispose()` etc. don't exist yet in Synth Lab) — that's a genuine rewrite
either way, so "rebuild" and "port" cost the same for the UI/facade half.
Net: port the engine's *design*, rewrite its *code* in plain JS/raw Web Audio
inside a new `instruments/patch-synth`-shaped module, rewrite the UI from
scratch using Synth Lab's panel as a layout reference.

Estimated cost for the L5 loop: **~150–250k tokens, Sonnet.** (Full raw-Web-Audio
Voice+VoiceManager+mod-matrix rewrite plus a from-scratch instrument-facade
UI, following the existing `wave-synth.js`/`overtone-synth.js` contract
pattern closely — no novel design work needed, just careful porting +
CONTRACTS compliance + redpen pass.)

## visual-overhaul/ — status

Inventory only, per instructions.

- [visual-overhaul/PLAN/RUNBOOK/CHECKLIST/DESIGN-BRIEF/VERIFY-SCRIPT.md](../../Synth%20Lab/visual-overhaul/) — execution package
- [visual-overhaul/briefs/](../../Synth%20Lab/visual-overhaul/briefs/) — 5 phase briefs (foundation, 2a-sections, 2b-meters, 2c-performance, 3-integration)
- [visual-overhaul/BUILDLOG.md](../../Synth%20Lab/visual-overhaul/BUILDLOG.md) — Phase 1 only, **built, uncommitted, unverified in-browser**; Phases 2–3 unbuilt

**Not a dead branch — a newer UI draft, stalled mid-flight.** Phase 1
(tokens/CSS split, Knob 2.0 with value arcs, frame-bus) shipped and builds
clean per its own log, but was never confirmed rendering in a browser and sits
uncommitted on top of one baseline anchor commit. It only touched styling +
one read-only engine getter (`getVoiceStates`) — zero audio-graph changes. If
this becomes the port's UI reference, use its *design brief* for direction,
but its actual code is unfinished (2 of 3 phases missing) and unverified.
