// =========================================================================================
// core/clock.js — THE TRANSPORT
// =========================================================================================
// Seat: `clock`, P2/S3. BUILD. Written 2026-08-23.
// Binds to: CONTRACTS §3 (transport, frozen), §13.1–§13.4 (tick math, written by
//           spec-clock), §10 (what nobody may do).
// Numbers from: Builddocs/P2-beat-tool/S2-recon/findings-scheduler.md — every §3 number
//           was re-measured there and KEPT. Nothing in this file departs from §3.
//
// WHAT THIS FILE IS
//   State, tempo, meter, position, loop, count-in, metronome, and the lookahead scheduler.
//   Every note in the app is under it. When P4 latches six instruments together, this is
//   what they latch to.
//
// THE TWO LOOPS NEVER CROSS (§3, §10)
//   AUDIO   — `setInterval(25)` scans a 100 ms window and schedules Web Audio events at
//             exact AudioContext times. This is the only loop that schedules sound.
//   VISUAL  — a caller's own requestAnimationFrame reads `clock.position`. That read is
//             a pure function of `ctx.currentTime`; it schedules nothing and this file
//             never calls rAF.
//
// THE TIMELINE MODEL — why there is a segment list and not one running counter
//   A tick is an integer. Time is a float. A tempo change and a loop wrap both break the
//   straight line between them, so the timeline is a list of SEGMENTS:
//
//       { startTime, startTick, secPerTick }
//
//   Inside a segment, time and tick are exactly linear. Every event time is computed from
//   its segment's anchor — never accumulated pass to pass — so a five-minute run carries
//   the error of one multiply, not of 12,000 additions. A new segment is pushed at a
//   tempo change, a meter change, a loop wrap, a seek, and a background recovery, always
//   anchored to the exact time and tick where the previous segment ended.
//
//   `clock.position` reads the segment containing `ctx.currentTime` — the AUDIBLE now,
//   which is up to 100 ms behind the scheduler's leading edge. The playhead therefore
//   shows what is being heard, not what has been queued, and it wraps a loop at the same
//   instant the sound does.
// =========================================================================================

import { ctx, createChannel, governor } from './audio.js';

// -----------------------------------------------------------------------------------------
// CONSTANTS — every one of these is a contract number, not a preference
// -----------------------------------------------------------------------------------------

/** §3, frozen. `480 = 2⁵·3·5`, so every division this app offers (1,2,3,4,6,8) divides it
 *  with zero remainder — findings-scheduler Q5 verified 0 ticks of drift over 64 bars for
 *  both 8th-note and 16th-note triplets. Tick math in this file is integer everywhere. */
export const PPQ = 480;

/** §3: "a `setInterval` of 25 ms". findings-scheduler Q1 measured p50 25.1 / p95 26.1 /
 *  max 26.2 ms idle, and IDENTICAL numbers under 32 live voices plus two rAF canvases.
 *  Q3 measured a Worker driver as strictly worse (p95 28.5 vs 26.1) and no better under a
 *  blocked main thread, because the actual work — creating a Web Audio node — is
 *  main-thread-only either way. KEPT, and no Worker. */
const INTERVAL_MS = 25;

/** §3: "scanning a 100 ms window". Two measurements pin this from both sides:
 *  §3's own amendment — a 100 ms window absorbed a 100 ms main-thread stall with zero late
 *  events, and a 150 ms stall produced 14 late events at this window and zero at 200 ms;
 *  findings-scheduler Q4 — this window IS the tempo-change responsiveness budget, measured
 *  at 115.7–153.0 ms commit latency (mean 127.8), because Web Audio cannot un-schedule a
 *  node that has already been given a start time. Shrinking it for snappier tempo trades
 *  directly against late-event margin. recon-scheduler's recommendation: keep. KEPT. */
const LOOKAHEAD_S = 0.100;

/** Not a §3 number — this seat's, and the one place findings-scheduler Q2 left a hole.
 *  Q2 is UNVERIFIED: three attempts across two seats could not make automated Chrome fire
 *  a real `hidden` transition, so backgrounding could not be measured. Documented Chrome
 *  behavior is that a hidden tab throttles timers to ~1/s. That starves the scheduler, and
 *  the naive recovery — schedule everything the gap missed — fires a burst of notes that
 *  Web Audio plays all at once, because a start time in the past means "now".
 *
 *  So: a pass that finds its own leading edge more than this far behind `currentTime` does
 *  not catch up. It RESEEKS (see `reseek()`), which is exactly recon-scheduler's
 *  recommendation — "do not assume ticks continue while hidden; treat resumed playback
 *  after a background gap as a reseek from the current transport position."
 *
 *  0.25 s is chosen above the failure the window is designed to absorb and below anything
 *  a listener would call a glitch instead of a dropout: §3 already accounts for stalls up
 *  to the window size as ordinary late events, and 250 ms is half a beat at 120 BPM. This
 *  threshold is the mechanism Brandon rules on if Q2 turns out different on a Chromebook. */
const RESEEK_THRESHOLD_S = 0.25;

/** A pass splits its window at every loop wrap, count-in end, and tempo change. This caps
 *  the split count so a pathological setting (a 1-tick loop) degrades instead of hanging
 *  the main thread. Never reached in normal use: the shortest musical loop is orders of
 *  magnitude longer than one 100 ms window. */
const MAX_SPLITS_PER_PASS = 64;

/** §13.4: supported time-signature bottoms. All four divide 4×480 = 1920 exactly. */
const SUPPORTED_BOTTOMS = [2, 4, 8, 16];

// -----------------------------------------------------------------------------------------
// §13.1 · TICK MATH — the only implementation
// -----------------------------------------------------------------------------------------
// §13.1: "These two functions are the whole conversion and there is only one implementation
// of each" and "A seat that finds itself writing `+1` outside these four functions has
// already made the bug." §13 did not name the file they live in. They live here, they are
// exported, and the grid (P2/S4), the piano roll (P3) and the arrangement ruler (P4) import
// them rather than writing a second copy.
//
// Counting origin, from §13.1's table — absolute `tick` 0-based · `bar` 1-based ·
// `beat` 1-based · `position.tick` 0-based · lane `step` index 0-based.

/** True modulo. JS `%` returns a negative for a negative left operand, and count-in runs on
 *  negative ticks (§ COUNT-IN below). Every bar/beat classification goes through this. */
function mod(a, n) {
  return ((a % n) + n) % n;
}

/** §13.1: `ticksPerBeat = (4 * PPQ) / ts.bottom`. 480 at any x/4. Never hard-coded. */
export function ticksPerBeat(ts = clock.timeSignature) {
  return (4 * PPQ) / ts.bottom;
}

/** §13.1: `ticksPerBar = ticksPerBeat * ts.top`. */
export function ticksPerBar(ts = clock.timeSignature) {
  return ticksPerBeat(ts) * ts.top;
}

/** §13.1: `ticksPerStep = ticksPerBeat / division`. `division` is per-lane (§13.2). */
export function ticksPerStep(division, ts = clock.timeSignature) {
  return ticksPerBeat(ts) / division;
}

/** §13.1: `stepsPerBar = ts.top * division`. */
export function stepsPerBar(division, ts = clock.timeSignature) {
  return ts.top * division;
}

/** §13.1: bar/beat/tick → absolute tick. `bar` and `beat` 1-based, `tick` 0-based. */
export function toTicks(bar, beat, tick, ts = clock.timeSignature) {
  return (bar - 1) * ticksPerBar(ts) + (beat - 1) * ticksPerBeat(ts) + tick;
}

/** §13.1: absolute tick → `{bar, beat, tick}` — the shape §3's `clock.position` returns. */
export function fromTicks(t, ts = clock.timeSignature) {
  const tpBar = ticksPerBar(ts);
  const tpBeat = ticksPerBeat(ts);
  return {
    bar: Math.floor(t / tpBar) + 1,
    beat: Math.floor(mod(t, tpBar) / tpBeat) + 1,
    tick: mod(t, tpBeat),
  };
}

/** §13.1: lane step index → absolute tick. Exact integer for every supported `division`
 *  (§13.2's table: 1,2,3,4,6,8 all divide 480 with zero remainder). */
export function stepToTicks(step, division, ts = clock.timeSignature) {
  return (step * ticksPerBeat(ts)) / division;
}

/** §13.1: absolute tick → lane step index. Integer only if `t` lands on this lane's grid;
 *  §13.6 keeps an off-grid note at its true tick rather than quantizing it, so this
 *  deliberately returns the fraction instead of rounding it away. */
export function ticksToStep(t, division, ts = clock.timeSignature) {
  return t / ticksPerStep(division, ts);
}

// -----------------------------------------------------------------------------------------
// INTERNAL STATE
// -----------------------------------------------------------------------------------------

let _state = 'stopped'; // §3: 'stopped' | 'playing' | 'recording'
let _bpm = 120;
let _pendingBpm = null; // set while playing; committed at the next pass boundary

/** The timeline. Ordered by startTime. Pruned to what `position` still needs. */
let _segments = [];

/** The scheduler's leading edge: the next tick NOT yet handed to any listener, and the
 *  exact AudioContext time it falls on. Everything before this is committed and, per
 *  findings-scheduler Q4, cannot be taken back. */
let _nextTick = 0;
let _nextTime = 0;

/** Where the playhead sits while stopped. While playing, position is derived from time. */
let _restTick = 0;

/** COUNT-IN. During count-in the tick line runs NEGATIVE relative to the record start —
 *  `_nextTick` climbs from `_countInFromTick` to `_countInToTick`. The metronome sounds
 *  across it and the 'tick' event does not fire, so nothing plays and nothing records.
 *  `position` is pinned to the record start for the whole of it. */
let _countingIn = false;
let _countInToTick = 0;

/** The AudioContext time of the record point — the instant the last count-in click has
 *  finished sounding and the take begins. `null` whenever no count-in is pending or in
 *  flight. Set exactly where the scheduler commits the count-in's final window, so it is
 *  the same anchor the clicks themselves were scheduled against.
 *
 *  THIS IS THE FIX FOR THE "BAR 0" SEAM (`beat-shell`, P2/S6, open decision 7).
 *  `_countingIn` above is the SCHEDULER's flag: it flips false at the leading edge, up to
 *  one lookahead window (~100 ms) BEFORE the student hears the last click. `position`
 *  deliberately reports the audible now. For that window the two disagreed — the flag said
 *  the take had started while `position` was still on the negative side of the record
 *  point, and `fromTicks()` of a negative tick renders as bar 0. Measured on `beat.html`
 *  as `0 . 4 . 461` at the top of every counted-in take.
 *
 *  Both numbers were right about different instants. The transport now reports ONE instant
 *  publicly — the audible one — via `audiblyCountingIn()`. */
let _countInEndTime = null;

/** One-shots from `clock.schedule(atTime, fn)`, kept sorted by time. */
let _oneShots = [];
let _oneShotId = 0;

const _listeners = { tick: new Set(), statechange: new Set(), resync: new Set() };

/** The metronome's own output node. Created lazily on first click so a page that never
 *  turns the metronome on never builds one. §10: connect to a channel, never to
 *  `ctx.destination`. */
let _clickOut = null;

// -----------------------------------------------------------------------------------------
// EVENTS
// -----------------------------------------------------------------------------------------

function emit(event, payload) {
  for (const fn of _listeners[event]) {
    try {
      fn(payload);
    } catch (err) {
      // A subscriber's bug must never stop the transport. Same rule audio.js follows.
      console.error('[clock.js] listener for "%s" threw:', event, err);
    }
  }
}

// -----------------------------------------------------------------------------------------
// THE SEGMENT LIST
// -----------------------------------------------------------------------------------------

function secPerTickNow() {
  return 60 / (_bpm * ticksPerBeat());
}

function pushSegment(startTime, startTick, secPerTick) {
  _segments.push({ startTime, startTick, secPerTick });
}

/** Drop segments no reader can reach any more: everything before the last one that starts
 *  at or before `now`. Keeps the list at 1–2 entries in steady playback. */
function pruneSegments(now) {
  let keepFrom = 0;
  for (let i = 0; i < _segments.length; i++) {
    if (_segments[i].startTime <= now) keepFrom = i;
    else break;
  }
  if (keepFrom > 0) _segments = _segments.slice(keepFrom);
}

/** The segment governing a given AudioContext time. */
function segmentAt(t) {
  let seg = _segments[0];
  for (let i = 1; i < _segments.length; i++) {
    if (_segments[i].startTime <= t) seg = _segments[i];
    else break;
  }
  return seg;
}

function currentSegment() {
  return _segments[_segments.length - 1];
}

// -----------------------------------------------------------------------------------------
// LOOP GEOMETRY (§3 `clock.loop`, §7 `"loop": {"on", "startBar", "endBar"}`)
// -----------------------------------------------------------------------------------------
// `endBar` is EXCLUSIVE — the loop plays bars `startBar` up to but not including `endBar`.
// §7's own example is `{"startBar": 1, "endBar": 5}`, which is the four-bar loop this
// phase's DONE-CHECK asks for. Stated here because it is the difference between a 4-bar
// and a 5-bar loop and nothing else in the docset says it out loud.

function loopBounds() {
  const l = clock.loop;
  if (!l || !l.on) return null;
  const tpBar = ticksPerBar();
  const start = (l.startBar - 1) * tpBar;
  const end = (l.endBar - 1) * tpBar;
  if (!(end > start)) return null; // a zero or inverted region is simply not a loop
  return { start, end };
}

/** The tick `play()` / `record()` actually start from, given the loop.
 *
 *  THE BUG THIS CLOSES (`beat-shell`, P2/S6, open decision 8). `runPass()`'s wrap test is
 *  `fromTick < lb.end`, so a playhead parked at or beyond `endBar` never meets a wrap and
 *  runs straight past the loop forever. Measured: loop bars 1–1, started from tick ~2400,
 *  reached 4871 with no wrap. A student switched the loop ON; playing outside it forever is
 *  the one outcome that is certainly not what they asked for.
 *
 *  Starting AT OR AFTER the region now folds back into it, using this file's own existing
 *  wrap arithmetic — the same expression `reseek()` uses, not a second rule.
 *
 *  Starting BEFORE the region is DELIBERATELY UNCHANGED: a playhead ahead of the loop
 *  already plays IN to it and wraps correctly at `lb.end`, which is working behaviour and
 *  was not reported. `seek()` is deliberately not routed through here either — moving the
 *  playhead by hand is the student's decision and the transport does not overrule it. */
function loopEntryTick(tick) {
  const lb = loopBounds();
  if (!lb || tick < lb.end) return tick;
  return lb.start + mod(tick - lb.start, lb.end - lb.start);
}

/** TRUE while the count-in is still AUDIBLE — `ctx.currentTime` has not yet reached the
 *  record point. Every public member that speaks about "now" (`countingIn`, `position`,
 *  `positionTicks`, `countInRemainingBars`) reports through this one function, so the flag
 *  and the position can no longer disagree about which instant they describe. The raw
 *  `_countingIn` stays the scheduler's own leading-edge flag and still gates the 'tick'
 *  emit — suppression has to happen when the window is SCHEDULED, not when it is heard. */
function audiblyCountingIn() {
  if (_state === 'stopped') return false;
  if (_countingIn) return true;
  return _countInEndTime !== null && ctx.currentTime < _countInEndTime;
}

// -----------------------------------------------------------------------------------------
// THE METRONOME — the clock's own voice (seat question 6)
// -----------------------------------------------------------------------------------------
// §3 lists `clock.metronome` on the transport, so the metronome lives here and not in an
// instrument: it is the one sound the transport itself makes, it must exist before any
// instrument does, and it must not consume a voice from §11.2's pool or count against
// §8's governor. It is two oscillators' worth of nothing, scheduled by the same pass that
// schedules everything else, so it is in time by construction rather than by agreement.
//
// Beat 1 is distinguishable by BOTH pitch and level — a projector-lit classroom is a noisy
// room, and one cue is not enough.

function clickBus() {
  if (!_clickOut) _clickOut = createChannel();
  return _clickOut;
}

function click(atTime, isDownbeat) {
  // A time already in the past means "now" to Web Audio. Clamping keeps the envelope's
  // ramp times monotonic, which `exponentialRampToValueAtTime` requires.
  const t = Math.max(atTime, ctx.currentTime);
  const peak = isDownbeat ? 0.34 : 0.18;
  const decay = isDownbeat ? 0.055 : 0.038;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(isDownbeat ? 1800 : 1200, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.0015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

  osc.connect(gain);
  gain.connect(clickBus());
  osc.start(t);
  osc.stop(t + decay + 0.02);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/** Sound every beat boundary inside `[fromTick, toTick)`. Half-open, so a boundary tick is
 *  claimed by exactly one window and a click is never doubled at a seam. */
function clickBeatsIn(fromTick, toTick, timeOf) {
  const tpBeat = ticksPerBeat();
  const tpBar = ticksPerBar();
  let t = Math.ceil(fromTick / tpBeat) * tpBeat;
  for (; t < toTick; t += tpBeat) {
    click(timeOf(t), mod(t, tpBar) === 0);
  }
}

// -----------------------------------------------------------------------------------------
// THE SCHEDULER (seat questions 1, 2, 3, 4, 7)
// -----------------------------------------------------------------------------------------

/** Recovery from a starved scheduler — a backgrounded tab, per findings-scheduler Q2.
 *  Musical time kept flowing while the JS timer did not, so the transport moves to where
 *  wall-clock says it is, wrapping the loop as many times as elapsed, and re-anchors there.
 *  Everything the gap missed is DROPPED, never fired late: a hidden tab produces silence,
 *  and the alternative — replaying the gap at once — is the burst this guard exists to
 *  prevent. Announced on 'resync' so a caller can redraw or re-arm.  */
function reseek(now) {
  const seg = currentSegment();
  const elapsed = now - _nextTime;
  const lb = loopBounds();

  let tick = _nextTick + elapsed / seg.secPerTick;

  if (_countingIn) {
    if (tick >= _countInToTick) {
      // The count-in expired while we were away. Start at the record point, not mid-count.
      _countingIn = false;
      _countInEndTime = now; // it is over AND audible right now — no seam to reconcile
      tick = _countInToTick;
    }
  } else if (lb && _nextTick < lb.end && tick >= lb.end) {
    const span = lb.end - lb.start;
    tick = lb.start + mod(tick - lb.start, span);
  }

  const from = _nextTick;
  _nextTick = Math.floor(tick);
  _nextTime = now;
  _segments = [];
  pushSegment(now, _nextTick, secPerTickNow());
  emit('resync', {
    reason: 'scheduler-gap',
    gapSeconds: elapsed,
    fromTick: from,
    toTick: _nextTick,
    position: fromTicks(_nextTick),
  });
}

// -----------------------------------------------------------------------------------------
// §8 · THE SCHEDULER-PASS COST PROBE
// -----------------------------------------------------------------------------------------
// §8: "Load is measured as scheduler pass duration against the budget of one lookahead
// window, smoothed over 20 passes." THIS FILE OWNS THE SCHEDULER PASS, so this file is the
// only place that measurement can honestly be taken. `runPass()` below is wrapped and
// timed: the wall-clock cost of the pass INCLUDING the 'tick' emit, which is where every
// instrument in the app creates its Web Audio nodes. That is the real main-thread work.
//
// WHY THIS EXISTS (`beat-shell`, P2/S6, open decision 3). `governor.load` in `core/audio.js`
// times that module's own registry bookkeeping instead — microseconds — so at 150 live
// voices and cpuWeight 2277 the CPU bar still read 0.00 with a green 0 %-wide bar.
// `audio-core`'s own comment predicted it: "clock.js (P2) does not exist yet, so there is no
// lookahead scheduler pass for this file to wrap… When P2's clock.js exists it owns the real
// scheduler pass; how the two probes reconcile is noted as an open decision."
//
// ⚠ THE RECONCILIATION IS NOT FINISHED, AND HALF OF IT IS NOT THIS FILE'S TO MAKE.
// `governor.load` is a GETTER with no setter and `audio.js` exports no reporting hook, so
// clock.js cannot feed it without an edit to frozen P1 output. That edit is one added method
// in one place, written out verbatim in receipt-fix-clock.md, and it is the Troubleshooter's
// call to make — not this seat's. Until it lands:
//   · the honest number EXISTS and MOVES, on `clock.schedulerLoad`, measured §8's way;
//   · `reportToGovernor()` below already calls the hook if `audio.js` ever grows one, so
//     the fix on that side is an addition and needs no second edit here.
// NOTHING IN THIS BLOCK FABRICATES A NUMBER. It measures, and it says who cannot read it.

/** §8's budget: one lookahead window. Not hard-coded — the same constant the window uses. */
const LOAD_BUDGET_MS = LOOKAHEAD_S * 1000;

/** §8: "smoothed over 20 passes". */
const LOAD_SMOOTH_PASSES = 20;

const _passHistory = [];
let _passLoad = 0;
let _lastPassMs = 0;

/** §8's technique, kept verbatim from the amended contract block:
 *    hist.push((performance.now() - t0) / 100); if (hist.length > 20) hist.shift();
 *    load = Math.min(1, hist.reduce((a,b) => a+b, 0) / hist.length);
 *  findings-webaudio Q3 measured it exactly linear against injected load (5 ms → 0.05,
 *  50 ms → 0.50, 100 ms → 1.00) with no calibration constant. */
function recordPassCost(ms) {
  _lastPassMs = ms;
  _passHistory.push(ms / LOAD_BUDGET_MS);
  if (_passHistory.length > LOAD_SMOOTH_PASSES) _passHistory.shift();
  _passLoad = Math.min(1, _passHistory.reduce((a, b) => a + b, 0) / _passHistory.length);
  reportToGovernor(ms);
}

/** Hand the measurement to §8's governor IF it has somewhere to put it. Duck-typed on
 *  purpose: `audio.js` is frozen P1 output and this seat does not edit it. The moment that
 *  file grows a `reportSchedulerPass(ms, budgetMs)` (or the Troubleshooter names another),
 *  the CPU bar starts moving with no further change here. Until then this is a `typeof`
 *  check 40 times a second and nothing else. */
function reportToGovernor(ms) {
  if (governor && typeof governor.reportSchedulerPass === 'function') {
    governor.reportSchedulerPass(ms, LOAD_BUDGET_MS);
  }
}

/** One scheduler pass, timed. The timing wrapper is OUTSIDE every scheduling decision — it
 *  reads a wall clock before and after and changes nothing the scheduler does. */
function pass() {
  const t0 = performance.now();
  try {
    runPass();
  } finally {
    recordPassCost(performance.now() - t0);
  }
}

/** One scheduler pass. Called every 25 ms. This is the only place audio is scheduled. */
function runPass() {
  const now = ctx.currentTime;

  fireOneShots(now);

  if (_state === 'stopped') return;

  // --- backgrounded-tab guard, before anything else uses `_nextTime` -------------------
  if (_nextTime < now - RESEEK_THRESHOLD_S) reseek(now);

  // --- commit a pending tempo or meter change, exactly at the leading edge -------------
  // This is the boundary findings-scheduler Q4 measured: 115.7–153.0 ms from the write to
  // the first event that reflects it, floor = the window, ceiling = one more pass. Nothing
  // already inside the window can change, so nothing tries to.
  if (_pendingBpm !== null) {
    _bpm = _pendingBpm;
    _pendingBpm = null;
  }
  const want = secPerTickNow();
  if (currentSegment().secPerTick !== want) {
    pushSegment(_nextTime, _nextTick, want);
  }

  // --- fill the window -----------------------------------------------------------------
  const horizon = now + LOOKAHEAD_S;
  let splits = 0;

  while (_nextTime < horizon && splits++ < MAX_SPLITS_PER_PASS) {
    const seg = currentSegment();
    const spt = seg.secPerTick;
    const fromTick = _nextTick;
    const fromTime = _nextTime;

    // A closure over this window's own anchor. Every event time in this window is one
    // multiply off `fromTime` — no accumulation, so no drift over five minutes.
    const timeOf = (tick) => fromTime + (tick - fromTick) * spt;

    let toTick = fromTick + Math.ceil((horizon - fromTime) / spt); // ≥ 1, loop terminates
    let wrap = false;
    let countInEnds = false;

    if (_countingIn) {
      if (toTick >= _countInToTick) {
        toTick = _countInToTick;
        countInEnds = true;
      }
    } else {
      const lb = loopBounds();
      // `>=`, NOT `>`, AND THE DIFFERENCE IS A RUNAWAY TRANSPORT.
      // With `>`, a window whose horizon lands EXACTLY on `lb.end` never sets `wrap`, so
      // `_nextTick` becomes `lb.end` with no wrap performed — and from then on the guard
      // `fromTick < lb.end` is false forever and playback runs past the loop until the
      // student presses stop. MEASURED on this exact file: a 1-bar loop at 240 BPM wrapped
      // cleanly 31 times and then escaped at leading-edge tick 2064
      // (Builddocs/P2-beat-tool/S6-shell/fix-clock-results-seam.json).
      //
      // Note the count-in branch above already uses `>=` for the same reason. This is the
      // same escape `beat-shell` reported from the other side (open decision 8): its `play()`
      // case is a playhead that starts outside the region, this one is a playhead that gets
      // out through the seam. Both are the `fromTick < lb.end` gate.
      //
      // `toTick === lb.end` is not a special case downstream: the window emitted is still
      // the half-open `[fromTick, lb.end)`, identical to what it was, so nothing is doubled
      // and nothing is dropped — the only change is that the wrap now happens.
      if (lb && fromTick < lb.end && toTick >= lb.end) {
        toTick = lb.end;
        wrap = true;
      }
    }

    // --- the two things a window does --------------------------------------------------
    if (clock.metronome) clickBeatsIn(fromTick, toTick, timeOf);

    if (!_countingIn) {
      // §3: "fires per scheduler pass, NOT per frame". Half-open [fromTick, toTick):
      // every tick belongs to exactly one window, so a listener can neither drop nor
      // double an event at a loop seam or a tempo change.
      emit('tick', {
        fromTick,
        toTick,
        timeOf,
        secPerTick: spt,
        bpm: _bpm,
        timeSignature: clock.timeSignature,
        ticksPerBeat: ticksPerBeat(),
        ticksPerBar: ticksPerBar(),
        state: _state,
      });
    }

    const endTime = timeOf(toTick);
    _nextTick = toTick;
    _nextTime = endTime;

    if (countInEnds) {
      _countingIn = false;
      // `endTime` IS the record point in AudioContext time. Everything public keeps
      // reporting "counting in" until `currentTime` reaches it — see `_countInEndTime`.
      _countInEndTime = endTime;
      pushSegment(endTime, _nextTick, spt); // the record point, exactly on the downbeat
    } else if (wrap) {
      const lb = loopBounds();
      _nextTick = lb.start;
      pushSegment(endTime, lb.start, spt); // time is continuous; the tick jumps back
    }
  }

  pruneSegments(now);
}

// -----------------------------------------------------------------------------------------
// ONE-SHOTS — §3 `clock.schedule(atTime, fn)`
// -----------------------------------------------------------------------------------------
// `fn(atTime)` is invoked from the scheduler pass that first sees `atTime` inside its
// lookahead window — i.e. at or before `atTime`, early enough for the callee to schedule
// real audio for that exact instant. Firing it AT the time would be a `setTimeout`, which
// is the thing §3's whole scheduler exists to avoid.
// One-shots fire in every state, including 'stopped': a student hitting a pad with the
// transport parked still needs a scheduled sound.

function fireOneShots(now) {
  if (_oneShots.length === 0) return;
  const horizon = now + LOOKAHEAD_S;
  let i = 0;
  while (i < _oneShots.length && _oneShots[i].atTime <= horizon) i++;
  if (i === 0) return;
  const due = _oneShots.splice(0, i);
  for (const s of due) {
    try {
      s.fn(s.atTime);
    } catch (err) {
      console.error('[clock.js] scheduled callback threw:', err);
    }
  }
}

// -----------------------------------------------------------------------------------------
// THE DRIVER
// -----------------------------------------------------------------------------------------
// findings-scheduler Q3, VERIFIED: `setInterval` on the main thread beats a Worker driver
// idle (p95 26.1 vs 28.5 ms) and ties it exactly under a blocked main thread at every load
// level, because creating a Web Audio node is main-thread-only however the tick arrives.
// A Worker does not move the bottleneck. DO NOT ADD ONE.
//
// The interval runs always, not only while playing, so `schedule()` works with the
// transport stopped. It costs one wake every 25 ms — the same always-on cadence audio.js's
// CPU probe already runs at.

let _intervalHandle = setInterval(pass, INTERVAL_MS);

// A hidden tab's timer throttling is the failure findings-scheduler Q2 could not measure.
// `runPass()`'s own gap guard is the real defence and does not depend on this event firing —
// which matters, because Q2's three attempts across two seats never made it fire under
// automation. This handler only makes recovery immediate instead of up-to-one-pass late.
function onVisibility() {
  if (document.visibilityState === 'visible' && _state !== 'stopped') pass();
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', onVisibility);
}

// -----------------------------------------------------------------------------------------
// TRANSPORT CONTROL
// -----------------------------------------------------------------------------------------

function setState(next) {
  if (_state === next) return;
  const from = _state;
  _state = next;
  emit('statechange', { from, to: next, state: next, position: clock.position });
}

/** How far ahead of `currentTime` a newly armed timeline starts.
 *
 *  MEASURED, not guessed. At 0.005 s the first beat of every playback landed 11–16 ms late
 *  and every beat after it was exact (Q3 and Q6 of this seat's own test page, first run) —
 *  because `arm()` anchors tick 0 five milliseconds out but the next scheduler pass can be
 *  a full 25 ms interval away, by which time tick 0 is already in the past and `click()`'s
 *  clamp drags it to "now". One late downbeat at the top of every take is exactly the
 *  thing a student would hear.
 *
 *  Two changes fix it together: this margin covers a whole `INTERVAL_MS`, and `play()`,
 *  `record()` and `seek()` run a pass synchronously instead of waiting for the next tick.
 *  20 ms of latency between the button and beat 1 is below the threshold of noticing and
 *  costs nothing musical — the grid is anchored to the first beat either way. */
const ARM_LEAD_S = 0.020;

/** Arm the timeline to run from `startTick`, optionally preceded by `countInBars` bars of
 *  metronome. */
function arm(startTick, countInBars) {
  const spt = secPerTickNow();
  const t0 = ctx.currentTime + ARM_LEAD_S;

  _countInEndTime = null; // a fresh arm has no count-in behind it, heard or scheduled

  if (countInBars > 0) {
    const pre = countInBars * ticksPerBar();
    _countingIn = true;
    _countInToTick = startTick;
    _nextTick = startTick - pre;
  } else {
    _countingIn = false;
    _countInToTick = startTick;
    _nextTick = startTick;
  }

  _nextTime = t0;
  _segments = [];
  pushSegment(t0, _nextTick, spt);
}

// -----------------------------------------------------------------------------------------
// THE PUBLIC OBJECT — §3's shape, property for property, method for method
// -----------------------------------------------------------------------------------------

export const clock = {
  // ——— §3 plain state ———————————————————————————————————————————————
  /** §3 `clock.timeSignature`. Mutate in place or replace; the scheduler re-reads it every
   *  pass and pushes a new segment when the geometry changes. §13.4: bottom ∈ 2,4,8,16. */
  timeSignature: { top: 4, bottom: 4 },

  /** §3 `clock.songLengthBars`. §7's example header value. The transport does NOT stop
   *  here — see OPEN DECISIONS in the receipt; nothing in §3 or §7 says it should, and a
   *  transport that halts mid-take because a length field was never updated is worse than
   *  one that runs on. Consumers that need an end use it as a bound. */
  songLengthBars: 16,

  /** §3 `clock.loop`. §7's example values. `endBar` is exclusive — see LOOP GEOMETRY. */
  loop: { on: false, startBar: 1, endBar: 5 },

  /** §3 `clock.countIn` — bars of count-in before record, 0 = off. §7's amended header
   *  carries it, defaulting to 0. */
  countIn: 0,

  /** §3 `clock.metronome`. §7's amended header defaults it false. */
  metronome: false,

  // ——— §3 read-only state ———————————————————————————————————————————
  /** §3 `clock.state` — 'stopped' | 'playing' | 'recording'. */
  get state() {
    return _state;
  },

  /** §3 `clock.bpm`. Reads back the requested value immediately; the SOUND commits at the
   *  next window boundary, which findings-scheduler Q4 measured at 115.7–153.0 ms (mean
   *  127.8). That latency is architectural — Web Audio cannot un-schedule a started node —
   *  and it is exactly the 100 ms window plus up to one pass. */
  get bpm() {
    // The REQUESTED tempo, not the committed one. A BPM slider two-way-bound to this
    // property read back the pre-change value for the ~100 ms before the commit landed and
    // snapped itself backwards mid-drag (caught by Q3 of this seat's test page). The
    // committed tempo — the one the scheduler is actually using for the window in flight —
    // is on every 'tick' payload as `bpm`, which is where a consumer that needs it looks.
    return _pendingBpm !== null ? _pendingBpm : _bpm;
  },
  set bpm(value) {
    const v = Number(value);
    if (!(v > 0) || !Number.isFinite(v)) throw new RangeError(`clock.bpm: ${value}`);
    if (_state === 'stopped') {
      _bpm = v;
      _pendingBpm = null;
      if (_segments.length) _segments = [];
    } else {
      _pendingBpm = v; // committed at the top of the next pass, at the leading edge
    }
  },

  /** §3 `clock.position` — `{bar, beat, tick}`, tick 0-based within the beat.
   *  READ THIS FROM rAF. It touches no audio node, schedules nothing, and is a pure
   *  function of `ctx.currentTime` (§3, §10: the two loops never cross). It reports the
   *  AUDIBLE now — up to 100 ms behind the scheduler's leading edge — so the playhead
   *  matches what a student is hearing and wraps a loop when the sound wraps.
   *
   *  §13.4 caveat, unresolved and not this seat's to resolve: at `bottom = 2` a beat is
   *  960 ticks and §3 documents this `tick` as 0..PPQ-1. The value returned here is
   *  0..ticksPerBeat-1, which is 0..959 at 2/2. §3 is frozen; reported, not worked around. */
  get position() {
    return fromTicks(this.positionTicks);
  },

  /** The same instant as `position`, as one absolute 0-based tick. §13.1 makes the absolute
   *  tick the only storage unit, so this is the form every consumer actually stores.
   *  EXTENSION — not named in §3; reported in this seat's handoff. */
  get positionTicks() {
    if (_state === 'stopped' || _segments.length === 0) return _restTick;
    // Pinned at the record point for the WHOLE AUDIBLE count-in — including the ~100 ms
    // after the scheduler's leading edge has already passed it. Without this the segment
    // covering `currentTime` is still the count-in's, which yields a negative tick and
    // renders as "bar 0" (`beat-shell`'s finding). See `_countInEndTime`.
    if (audiblyCountingIn()) return _countInToTick;
    const now = ctx.currentTime;
    const seg = segmentAt(now);
    if (!seg || now < seg.startTime) return seg ? seg.startTick : _restTick;
    return Math.floor(seg.startTick + (now - seg.startTime) / seg.secPerTick);
  },

  /** True while the count-in is sounding and before the record point. UI needs to tell a
   *  count-in from a running take, and §3 has no fourth state to carry it.
   *  EXTENSION — not named in §3; reported in this seat's handoff.
   *
   *  REPORTS THE AUDIBLE NOW, the same instant `position` reports — not the scheduler's
   *  leading edge. The two used to disagree for one lookahead window at the top of every
   *  counted-in take; see `_countInEndTime` for the measurement and the fix. A caller no
   *  longer needs a `positionTicks < 0` guard of its own, and `capture.js`'s gate (which
   *  reads this getter) can no longer stamp a note at a negative tick. */
  get countingIn() {
    return audiblyCountingIn();
  },

  /** §8's load, measured where §8 says to measure it: scheduler pass duration against one
   *  lookahead window, smoothed over 20 passes. 0..1.
   *  EXTENSION — §8 puts this number on `governor.load`, which lives in `audio.js` and is a
   *  getter this file cannot write. Until that addition lands, THIS is where the honest
   *  number is. See the SCHEDULER-PASS COST PROBE block and receipt-fix-clock.md. */
  get schedulerLoad() {
    return _passLoad;
  },

  /** Raw duration of the most recent scheduler pass, in milliseconds. Diagnostics — the
   *  smoothed figure is `schedulerLoad`. EXTENSION. */
  get lastPassMs() {
    return _lastPassMs;
  },

  /** Bars remaining in the count-in, fractional, 0 when not counting in. Measured from the
   *  AUDIBLE now like `position`, not from the scheduler's leading edge, so a count-in
   *  readout on screen agrees with the clicks a student is hearing. */
  get countInRemainingBars() {
    if (!audiblyCountingIn() || _segments.length === 0) return 0;
    const now = ctx.currentTime;
    const seg = segmentAt(now);
    const heard = seg.startTick + Math.max(0, now - seg.startTime) / seg.secPerTick;
    return Math.max(0, (_countInToTick - heard) / ticksPerBar());
  },

  /** The scheduler's leading edge — the first tick not yet committed. Diagnostics and
   *  tests; a consumer wanting the playhead wants `position`. EXTENSION. */
  get leadingEdgeTicks() {
    return _nextTick;
  },

  // ——— §3 methods —————————————————————————————————————————————————
  /** §3 `clock.play()`. Resumes from the current playhead. No count-in — §3 scopes
   *  count-in to record. */
  play() {
    if (_state === 'playing') return;
    validateMeter(this.timeSignature);
    // `loopEntryTick` folds a playhead parked at or past `loop.endBar` back INTO the loop.
    // Without it the wrap test in `runPass()` never fires and playback runs past the loop
    // forever — `beat-shell`'s open decision 8. Before the region is unchanged.
    const from = loopEntryTick(_state === 'stopped' ? _restTick : this.positionTicks);
    arm(from, 0);
    setState('playing');
    pass(); // fill the first window NOW, not up to 25 ms from now — see ARM_LEAD_S
  },

  /** §3 `clock.record()`. Runs `clock.countIn` bars of metronome first, if set. */
  record() {
    if (_state === 'recording') return;
    validateMeter(this.timeSignature);
    // Same loop entry as `play()` — a take started from outside an enabled loop would
    // otherwise record straight past it forever, which is the same bug wearing a red light.
    const from = loopEntryTick(_state === 'stopped' ? _restTick : this.positionTicks);
    arm(from, Math.max(0, Math.floor(this.countIn) || 0));
    setState('recording');
    pass(); // see ARM_LEAD_S — the first count-in click must land on time too
  },

  /** §3 `clock.stop()`. Leaves the playhead where it stopped, so `play()` continues from
   *  there; `seek(1,1,0)` is how a caller returns to the top. Nothing in §3 or §7 rules on
   *  return-to-zero — listed in this seat's OPEN DECISIONS.
   *  Sound already inside the 100 ms window still plays: Web Audio cannot un-schedule a
   *  started node (findings-scheduler Q4). That is up to one window of tail, by design. */
  stop() {
    if (_state === 'stopped') return;
    _restTick = audiblyCountingIn() ? _countInToTick : this.positionTicks;
    _countingIn = false;
    _countInEndTime = null;
    _oneShots = [];
    _segments = [];
    setState('stopped');
  },

  /** §3 `clock.seek(bar, beat, tick)` — 1-based bar and beat, per §13.1.
   *  While playing, the new position takes effect at `currentTime`; audio already inside
   *  the window still sounds, for the same reason `stop()` has a tail. */
  seek(bar, beat = 1, tick = 0) {
    const t = toTicks(bar, beat, tick, this.timeSignature);
    if (!Number.isFinite(t) || t < 0) throw new RangeError(`clock.seek(${bar}, ${beat}, ${tick})`);
    _restTick = t;
    // Seeking during a count-in abandons the count-in — the student moved the playhead,
    // which is a decision, not an accident. `record()` is how a count-in is asked for.
    if (_state !== 'stopped') {
      arm(t, 0);
      pass(); // see ARM_LEAD_S
    }
  },

  /** §3 `clock.schedule(atTime, fn)` — one-shot at an AudioContext time. Returns an id.
   *  See ONE-SHOTS above for exactly when `fn` is called and why not later. */
  schedule(atTime, fn) {
    if (typeof fn !== 'function') throw new TypeError('clock.schedule: fn must be a function');
    const entry = { id: ++_oneShotId, atTime: Number(atTime), fn };
    let i = _oneShots.length;
    while (i > 0 && _oneShots[i - 1].atTime > entry.atTime) i--;
    _oneShots.splice(i, 0, entry);
    return entry.id;
  },

  /** Cancel a pending one-shot by the id `schedule()` returned. `stop()` drops them all.
   *  EXTENSION — §3 gives no way to take a one-shot back; reported in this seat's handoff. */
  unschedule(id) {
    const i = _oneShots.findIndex((s) => s.id === id);
    if (i === -1) return false;
    _oneShots.splice(i, 1);
    return true;
  },

  /** §3 `clock.on('tick'|'statechange', fn)`, plus 'resync'.
   *  'tick'        — once per scheduler pass window, NOT per frame. Payload:
   *                  `{fromTick, toTick, timeOf(tick), secPerTick, bpm, timeSignature,
   *                    ticksPerBeat, ticksPerBar, state}`. The range is HALF-OPEN
   *                  `[fromTick, toTick)`. Schedule audio at `timeOf(tick)`; that function
   *                  is valid only for ticks inside this window. Suppressed during count-in.
   *  'statechange' — `{from, to, state, position}`.
   *  'resync'      — `{reason, gapSeconds, fromTick, toTick, position}` after a background
   *                  gap. EXTENSION, forced by findings-scheduler Q2. */
  on(event, fn) {
    if (!_listeners[event]) throw new Error(`clock.on: no such event "${event}"`);
    _listeners[event].add(fn);
  },

  off(event, fn) {
    if (_listeners[event]) _listeners[event].delete(fn);
  },

  // ——— §13.1 tick math, also reachable from the transport object ——————————
  PPQ,
  ticksPerBeat: (ts) => ticksPerBeat(ts),
  ticksPerBar: (ts) => ticksPerBar(ts),
  ticksPerStep: (division, ts) => ticksPerStep(division, ts),
  stepsPerBar: (division, ts) => stepsPerBar(division, ts),
  toTicks: (bar, beat, tick, ts) => toTicks(bar, beat, tick, ts),
  fromTicks: (t, ts) => fromTicks(t, ts),
  stepToTicks: (step, division, ts) => stepToTicks(step, division, ts),
  ticksToStep: (t, division, ts) => ticksToStep(t, division, ts),

  /** Tear down. Mirrors §2's `dispose()` rule: zero leaked nodes, zero leaked listeners. */
  dispose() {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility);
    }
    if (_clickOut) {
      _clickOut.disconnect();
      _clickOut = null;
    }
    _oneShots = [];
    _segments = [];
    for (const set of Object.values(_listeners)) set.clear();
    _state = 'stopped';
    _countingIn = false;
    _countInEndTime = null;
    _passHistory.length = 0;
    _passLoad = 0;
    _lastPassMs = 0;
  },
};

function validateMeter(ts) {
  if (!ts || !Number.isInteger(ts.top) || ts.top < 1) {
    throw new RangeError(`clock.timeSignature.top: ${ts && ts.top}`);
  }
  if (!SUPPORTED_BOTTOMS.includes(ts.bottom)) {
    // §13.4: "32 and any non-power-of-two are not supported — they are not in the
    // curriculum, nothing in the docset asks for them."
    throw new RangeError(
      `clock.timeSignature.bottom: ${ts.bottom} — §13.4 supports ${SUPPORTED_BOTTOMS.join(', ')}`
    );
  }
}

export default clock;
