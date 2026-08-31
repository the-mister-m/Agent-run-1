/**
 * core/capture.js — THE PATH FROM A LIVE PERFORMANCE TO NOTE DATA ON A GRID
 * Seat: `capture`, P2/S5. BUILD. Written 2026-08-23.
 *
 * Binds to: CONTRACTS §3 (transport — `state`, `countIn`, `loop`, `on('tick')`, `position`),
 * §5 / §12.1 (input events and the velocity fallback), §7 (`channels[].notes[]` — the four
 * frozen fields), §13.1 (tick math), §13.5 (a step, as data), §13.6 (step ↔ §7 note
 * round-trip, and the off-grid rule), §14.1/§14.5 (the eight piece roles; an instrument is
 * two frozen members and nothing else), §10 (what nobody may do).
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * THIS FILE RECORDS NOTES. IT DOES NOT RECORD AUDIO. (seat question 8)
 * ═════════════════════════════════════════════════════════════════════════════════════════
 *   There is no `getUserMedia`, no `MediaRecorder`, no `MediaStreamAudioSourceNode`, no
 *   `AudioWorkletNode`, no `ScriptProcessorNode`, and no `AudioBuffer` anywhere below.
 *   This module does not import `core/audio.js`, never touches an AudioContext, never asks
 *   for a microphone, and has no code path that could. What it stores is integers: a tick,
 *   a length, a note number, and a velocity — CONTRACTS §7's four frozen fields.
 *   Grep this file for `Media`, `getUserMedia`, `Recorder`, `Worklet`, `AudioBuffer`:
 *   the only hits are in this paragraph and in the receipt that cites it.
 *
 * WHAT THIS FILE IS
 *   The one place a student's playing becomes data. Every route into it is `core/input.js`'s
 *   bus, so QWERTY, mouse, touch and MIDI arrive identical (§5). Every timestamp on it comes
 *   from `clock.positionTicks`, so what gets written is where the student actually heard
 *   themselves play. Everything out of it is either §7 `notes[]` or a §13.5 `pattern` —
 *   two shapes that already exist and that P3's piano roll and P4's arrangement already read.
 *
 * WHAT THIS FILE IS NOT
 *   Not the transport (`core/clock.js` — read, never written, never mutated by this file).
 *   Not the input bus (`core/input.js` — subscribed to, never modified).
 *   Not a surface (`surfaces/step-grid.js` — held by duck type through `getPattern()` /
 *   `setPattern()`, never imported, never reached into).
 *   Not an instrument, and **not a second scheduler**: search this file for `noteOn` — it
 *   appears in comments only. Capture never makes a sound. The grid schedules the pattern
 *   (§13.5) and the shell wires live monitoring; if this file also called `noteOn`, every
 *   captured hit would double.
 *
 * TWO VERBS, TWO BUTTONS — seat question 1, stated up front because everything else follows
 *   RECORD  — `record()`. Arms a destination and writes as you play, forward in time,
 *             gated by the transport being in §3's `'recording'` state.
 *   CAPTURE — `keepLast(bars)`. A rolling buffer is running the whole time, whether or not
 *             anyone armed anything. This commits what was JUST played, after the fact.
 *             It is the "I wasn't recording but that was the one" button.
 *   Both end in the same place: a take, committed through the same code.
 */

// -----------------------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------------------
// `clock.js` is READ ONLY — this seat's brief: "You do NOT touch ... clock.js". The tick math
// is imported, never reimplemented (§13.1: "there is only one implementation of each").
import { clock as sharedClock, ticksPerBar, ticksPerStep } from './clock.js';

// `input.js` is the ONLY route in. §5's central rule — "nothing downstream may branch on
// `source`" — is honoured literally below: `source` is stored for the take report and for a
// surface to draw with, and it never touches a note number, a tick, or a velocity.
// Importing this module runs its one load-time side effect, `requestMIDI()` — fire-and-forget
// per §5's amended block. That is wanted here: MIDI is a capture route.
import { input as sharedInput, DEFAULT_VELOCITY } from './input.js';

// -----------------------------------------------------------------------------------------
// CONSTANTS — none of these is a contract number. Every one is this seat's, and says so.
// -----------------------------------------------------------------------------------------

/** How far back the rolling capture buffer remembers. Not a contract number — 30 s is longer
 *  than any phrase a student plays before saying "keep that" and short enough that the buffer
 *  is a few hundred integers, never a memory question. */
const RING_SECONDS = 30;

/** Hard ceiling on buffered events, so a stuck MIDI controller cannot grow the buffer without
 *  bound while nobody is looking. This seat's number. */
const RING_MAX_EVENTS = 512;

/** A note whose off arrives in the same tick as its on still has a length. §13.5 stores no
 *  length at all for a step; §13.6 writes `ticksPerStep`. This floor exists only so a §7
 *  note is never written with `length: 0`. This seat's number. */
const MIN_NOTE_LENGTH_TICKS = 1;

/** How many committed takes can be walked back. Not a contract number — nothing in the
 *  docset names one. 32 is far past what a class period produces and costs a few dozen
 *  JSON-cloned patterns of a few hundred bytes each. This seat's number. */
const UNDO_DEPTH = 32;

const EVENTS = ['note', 'commit', 'statechange', 'armchange', 'historychange'];

// -----------------------------------------------------------------------------------------
// PURE HELPERS
// -----------------------------------------------------------------------------------------

/** True modulo — same reason `clock.js` and `step-grid.js` each carry one. */
function mod(a, n) {
  return ((a % n) + n) % n;
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_VELOCITY;
  return Math.max(0, Math.min(1, n));
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** JSON-safe deep copy of a §13.5 pattern. Same technique `step-grid.getPattern()` uses, for
 *  the same reason: an undo snapshot that shares structure with the live pattern is not a
 *  snapshot. */
function clonePattern(p) {
  return p ? JSON.parse(JSON.stringify(p)) : null;
}

// =========================================================================================
// THE CLASS
// =========================================================================================

export default class Capture {
  static id = 'capture';
  static label = 'Capture';

  /**
   * @param {object}  opts
   * @param {object}  opts.clock       CONTRACTS §3 transport. Defaults to the shared one.
   * @param {object}  opts.input       CONTRACTS §5 bus. Defaults to the shared one.
   * @param {object}  opts.target      Anything with `getPattern()` / `setPattern(p)` — a
   *                                   `StepGrid` satisfies this exactly. Optional: with no
   *                                   target, capture still produces §7 `notes[]`, which is
   *                                   how P3's piano roll will use this file.
   * @param {object}  opts.instrument  Read for `constructor.pieces` ONLY — §14.5's first
   *                                   frozen member, used to map a note number to a lane.
   *                                   `noteOn` is never called. Optional.
   */
  constructor({ clock = sharedClock, input = sharedInput, target = null, instrument = null } = {}) {
    this._clock = clock;
    this._input = input;
    this._target = target;
    this._instrument = null;
    this._noteToLane = new Map();

    /** The in-flight take, or null. See TAKE, below. */
    this._take = null;

    /** note number -> the open note record waiting for its length. `input.js` reference-counts
     *  holders per note, so at most one note-on per note number is live at a time and a plain
     *  Map is the correct structure, not a stack. */
    this._held = new Map();

    /** THE ROLLING CAPTURE BUFFER (seat question 1). Always filling, in every transport
     *  state, armed or not. Trimmed by age and by count on every push. */
    this._ring = [];

    /** Committed takes, oldest first. `getNotes()` reads this. */
    this._takes = [];
    this._takeId = 0;

    /** UNDO (seat question 7). Two stacks of `{kind, patternBefore, patternAfter, take}`. */
    this._undo = [];
    this._redo = [];

    this._listeners = {};
    for (const e of EVENTS) this._listeners[e] = new Set();

    /** Armed destinations. A `Set` of lane indices; the sentinel `'all'` means every lane.
     *  Completed as a gate in seat question 4 (punch). */
    this._armed = new Set(['all']);

    /** QUANTIZATION (seat question 2). A plain, readable, settable object — a control, not a
     *  hidden behaviour. See the QUANTIZE section for what each field does and what it does
     *  NOT do. The default below is a DEFAULT so nothing blocks; the rule is Brandon's.
     *    on       — snap the stored tick toward the grid at all.
     *    division — null = each lane's own §13.2 division; a number overrides it.
     *    strength — 0..1, how far toward the grid a stored tick moves. 1 = hard snap. */
    this.quantize = { on: true, division: null, strength: 1 };

    /** Notes whose snapped position is still AHEAD of the scheduler's leading edge. Written
     *  into the pattern only once the playhead has passed them — see `_flushDeferred`. */
    this._deferred = [];

    /** The report from the last commit, for a UI that would rather poll than subscribe. */
    this.lastReport = null;

    /** LOOP RECORDING (seat question 3). `'overdub'` | `'replace'`. A CONTROL, deliberately
     *  a plain settable property with two documented values — not a hidden behaviour and not
     *  something a student discovers by losing a take. See the LOOP RECORDING section. */
    this.loopMode = 'overdub';

    /** Loop-pass bookkeeping. `_lastToTick` is how a wrap is noticed: the clock's 'tick'
     *  windows are monotonic within a pass and jump backwards exactly at the seam. */
    this._lastToTick = -Infinity;
    this._passNotes = [];
    this._passCount = 0;

    /** PUNCH (seat question 4). `endBar` exclusive, matching `clock.loop`. `on: false` means
     *  "write wherever the playhead is". See the PUNCH section. */
    this.punch = { on: false, startBar: 1, endBar: 5 };

    /** Counters a UI can show instead of a student wondering where their hits went. Reset
     *  at the start of every take. */
    this.dropped = { outsidePunch: 0, unarmedLane: 0, duringCountIn: 0 };

    /** Last publicly-announced state, so `_syncState()` can tell a real change from a poll. */
    this._lastState = 'armed';

    this._unsubs = [];
    this._onNoteOn = this._onNoteOn.bind(this);
    this._onNoteOff = this._onNoteOff.bind(this);
    this._onStateChange = this._onStateChange.bind(this);
    this._onResync = this._onResync.bind(this);
    this._onTick = this._onTick.bind(this);

    if (instrument) this.setInstrument(instrument);
    this._subscribe();
  }

  // ---------------------------------------------------------------------------------------
  // WIRING
  // ---------------------------------------------------------------------------------------

  _subscribe() {
    // `input.on` returns an unsubscribe closure (§5's implementation); `clock.on` does not
    // (it is a bare `Set.add`), so the clock's are removed by `off(event, fn)` in dispose().
    this._unsubs.push(this._input.on('noteon', this._onNoteOn));
    this._unsubs.push(this._input.on('noteoff', this._onNoteOff));
    this._clock.on('statechange', this._onStateChange);
    this._clock.on('resync', this._onResync);
    this._clock.on('tick', this._onTick);
  }

  /** The destination pattern holder. Duck-typed on purpose — this file does not import
   *  `surfaces/step-grid.js` (it is another seat's file and this seat does not depend on its
   *  class identity), and a test can hand in a plain object with the same two methods. */
  setTarget(target) {
    this._target = target || null;
    return this;
  }

  /** §14.5, verbatim: "The grid's entire knowledge of an instrument is two frozen §2
   *  members: `Instrument.pieces` and `instrument.noteOn(...)`." Capture's knowledge is
   *  SMALLER — `pieces` alone, and only to map a note number to one of §14.1's eight lane
   *  roles. This file never calls `noteOn` (see the header: it is not a scheduler). */
  setInstrument(instrument) {
    this._instrument = instrument || null;
    this._noteToLane = new Map();
    const pieces = instrument?.constructor?.pieces;
    if (Array.isArray(pieces)) {
      pieces.forEach((p, i) => {
        if (p && Number.isFinite(p.note)) this._noteToLane.set(p.note, Number.isFinite(p.index) ? p.index : i);
      });
    }
    return this;
  }

  /** Lane index for a note number, or `null` when this note is not one of §14.1's eight
   *  pieces — or when no instrument is bound at all. A `null` lane is still captured into
   *  `notes[]`; it simply has no row on an eight-lane grid to be drawn in. */
  _laneFor(note) {
    if (this._noteToLane.size === 0) return null;
    const lane = this._noteToLane.get(note);
    return lane === undefined ? null : lane;
  }

  // ---------------------------------------------------------------------------------------
  // EVENTS OUT
  // ---------------------------------------------------------------------------------------
  //  'note'         {note, tick, ...}  — a note was written into the take, as it happens.
  //  'commit'       the take report — see COMMIT.
  //  'statechange'  {from, to}
  //  'armchange'    {armed}
  // A subscriber that throws must never break the take. Same rule `clock.js` and `input.js`
  // both apply to their own buses.

  on(event, fn) {
    if (!this._listeners[event]) throw new Error(`capture.on: no such event "${event}"`);
    this._listeners[event].add(fn);
    return () => this._listeners[event].delete(fn);
  }

  off(event, fn) {
    this._listeners[event]?.delete(fn);
  }

  _emit(event, payload) {
    for (const fn of this._listeners[event]) {
      try {
        fn(payload);
      } catch (err) {
        console.error('[capture.js] listener for "%s" threw:', event, err);
      }
    }
  }

  // ---------------------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------------------

  /** `'idle' | 'armed' | 'countingIn' | 'recording'`. `'countingIn'` is this file's fourth
   *  value because §3 has only three transport states and the count-in is not one of them —
   *  `clock.js` carries the same gap and answers it with its own `countingIn` getter, which
   *  is what this reads. A UI must be able to tell "counting" from "writing". */
  get state() {
    if (this._take) return this._clock.countingIn ? 'countingIn' : 'recording';
    return this._armed.size > 0 ? 'armed' : 'idle';
  }

  /** Announce a state change if one happened. Called after every mutation AND once per
   *  scheduler pass, because the count-in ending is a capture state change with no transport
   *  state change behind it — `clock.state` is `'recording'` on both sides of that seam. */
  _syncState() {
    const to = this.state;
    if (this._lastState === to) return;
    const from = this._lastState;
    this._lastState = to;
    this._emit('statechange', { from, to });
  }

  // ---------------------------------------------------------------------------------------
  // ARMING — lane selection. The punch REGION and the full gate arrive in seat question 4.
  // ---------------------------------------------------------------------------------------

  /** `arm('all')` · `arm(0, 1)` · `arm({ note: 38 })`. Lane indices are §14.1's fixed roles. */
  arm(...targets) {
    for (const t of targets) {
      if (t === 'all') {
        this._armed = new Set(['all']);
        continue;
      }
      if (this._armed.has('all')) this._armed.delete('all');
      if (Number.isInteger(t)) this._armed.add(t);
      else if (t && Number.isFinite(t.note)) {
        const lane = this._laneFor(t.note);
        if (lane !== null) this._armed.add(lane);
      }
    }
    this._emit('armchange', { armed: this.armedLanes });
    return this;
  }

  disarm(...targets) {
    if (targets.length === 0 || targets.includes('all')) this._armed = new Set();
    else {
      if (this._armed.has('all')) {
        // "everything except these" — expand the sentinel to the eight §14.1 roles first.
        this._armed = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
      }
      for (const t of targets) {
        if (Number.isInteger(t)) this._armed.delete(t);
        else if (t && Number.isFinite(t.note)) this._armed.delete(this._laneFor(t.note));
      }
    }
    this._emit('armchange', { armed: this.armedLanes });
    return this;
  }

  /** `'all'` or an array of lane indices. */
  get armedLanes() {
    return this._armed.has('all') ? 'all' : [...this._armed].sort((a, b) => a - b);
  }

  _isArmed(lane) {
    if (this._armed.has('all')) return true;
    if (lane === null) return false; // an unmapped note has no lane to be armed
    return this._armed.has(lane);
  }

  // ---------------------------------------------------------------------------------------
  // TIMESTAMPING — the one decision the whole file rests on
  // ---------------------------------------------------------------------------------------
  // `clock.positionTicks` is used, NOT `clock.leadingEdgeTicks`.
  //
  // `clock.js` documents `position` as "the AUDIBLE now — up to 100 ms behind the scheduler's
  // leading edge". That is exactly right for a capture stamp and the leading edge is exactly
  // wrong. A student's key-down is monitored at `ctx.currentTime` (the shell schedules the
  // monitor note with no `atTime`, so it sounds now), and `positionTicks` IS the tick at
  // `ctx.currentTime`. So the tick written is the tick at which the student heard themselves.
  // Stamping from the leading edge would write every hit up to 100 ms — nearly a 16th note at
  // 120 BPM — early, and no quantize setting could tell that error from playing.

  // =========================================================================================
  // SEAT QUESTION 5 — COUNT-IN. Yes, it gates the start. §3, N bars before writing begins.
  // =========================================================================================
  //
  // §3 puts `clock.countIn` on the transport and `clock.record()` runs it: the tick line runs
  // NEGATIVE for N bars, the metronome sounds across it, and `clock.js` suppresses its own
  // 'tick' event for the whole of it so nothing plays and nothing records. `clock.countingIn`
  // is true throughout and `clock.position` is pinned at the record point.
  //
  // THE GATE, AND WHY IT IS A HARD DROP RATHER THAN A GUESS
  //   While `clock.countingIn` is true, `_stampTick()` returns null and NO note is written.
  //   It cannot be otherwise: every tick during the count-in reads back as the same pinned
  //   record point, so a note written there would not be placed late — it would be placed
  //   WRONG, stacked with every other count-in hit on one step. Writing nothing is the only
  //   honest answer, and §7's rule is the same one: refuse, do not guess.
  //
  // THE STUDENT ALWAYS FINDS OUT
  //   A hit during the count-in is counted in `capture.dropped.duringCountIn` and reported on
  //   the commit, so a UI can say "2 hits during the count-in weren't recorded." A student who
  //   comes in a beat early on the pickup gets told, not silently trimmed.
  //
  // Capture never sets `clock.countIn` and never calls `arm`/`seek`. How many bars is the
  // transport's property and the shell's control (§3), not this file's to own.

  _stampTick() {
    if (this._clock.state === 'stopped') return null;
    if (this._clock.countingIn) return null; // the gate — see above
    return this._clock.positionTicks;
  }

  // ---------------------------------------------------------------------------------------
  // THE ROLLING CAPTURE BUFFER (seat question 1, second half)
  // ---------------------------------------------------------------------------------------
  // Every note-on goes in here, in every state, always. This is what makes `keepLast()`
  // possible: the "record" question is answered before the student decides to answer it.
  //
  // `moving` records whether the transport was running when the note arrived, because a note
  // played with the transport stopped has NO musical position — `clock.positionTicks` is
  // pinned at the resting playhead and every such note would stack on one tick. Those notes
  // are buffered but are not commit-able, and `keepLast()` says so rather than guessing a
  // tempo. §7's rule, applied to a take: "refuses and says so; it never guesses."

  _ringPush(entry) {
    this._ring.push(entry);
    const cutoff = entry.at - RING_SECONDS * 1000;
    let drop = 0;
    while (drop < this._ring.length && this._ring[drop].at < cutoff) drop++;
    if (this._ring.length - drop > RING_MAX_EVENTS) drop = this._ring.length - RING_MAX_EVENTS;
    if (drop > 0) this._ring.splice(0, drop);
  }

  get bufferedEvents() {
    return this._ring.length;
  }

  // =========================================================================================
  // SEAT QUESTION 6 — VELOCITY. Yes, from every route that has it. And the one that does not.
  // =========================================================================================
  //
  // WHAT CAPTURE DOES: takes `event.velocity` verbatim, clamps it to 0..1, and writes it.
  // Two lines, and that is the whole answer — because the work was already done upstream and
  // doing it twice would break the rule that makes the four routes interchangeable.
  //
  // WHERE THE NUMBER COMES FROM, ROUTE BY ROUTE
  //   MIDI     — REAL velocity. `input.js` reads byte 3 of the note-on and emits `vel / 127`,
  //              so a soft stick and a hard stick arrive as different numbers and land in the
  //              pattern as different `{v}` values, which the grid draws as different fill
  //              heights. This is the route the done-check tests.
  //   QWERTY   — no velocity. A key is down or it is not.
  //   MOUSE    — no velocity. A click has no force.
  //   TOUCH    — no velocity. `Touch.force` exists in the spec and reports 0 on every
  //              Chromebook trackpad and touchscreen this app targets.
  //   All three fall back to **0.8** — §12.1: "a surface that cannot sense velocity reports a
  //   fixed 0.8", the same constant §7 shows as its example note velocity, §11.7a fixes for a
  //   missing `noteOn` velocity, and §13.5 writes for a step created by a tap. **One number,
  //   already decided in four places.** It is applied by `input.js`, which is why this file
  //   imports `DEFAULT_VELOCITY` from there rather than writing a fifth copy of `0.8`.
  //
  // WHY CAPTURE DOES NOT ADD A PER-ROUTE VELOCITY RULE OF ITS OWN
  //   Because that is exactly the branch `input.js` exists to prevent: "**Nothing downstream
  //   may branch on `source`.** If an instrument can tell which hardware fired a note, this
  //   file failed." A capture that scaled QWERTY velocity, or humanised it, or read a
  //   modifier key as an accent, would make the same take come out differently depending on
  //   what the student happened to be playing on. `source` IS stored on every captured note —
  //   §5 allows it "for logging and for a surface to know what to draw" — and it is tallied
  //   on the commit report so a UI can say "12 hits, 8 from MIDI". It never reaches a tick,
  //   a note number, or a velocity. Search this file: `rec.source` is written and reported,
  //   never read by arithmetic.
  //
  // NOT BUILT, DELIBERATELY: velocity curves, accent keys, humanise. §10 forbids inventing an
  // interface, and nobody asked for one.

  /** Tally of which routes a set of notes came from. Logging and UI only. */
  _sourceTally(notes) {
    const out = {};
    for (const n of notes) out[n.source] = (out[n.source] || 0) + 1;
    return out;
  }

  // ---------------------------------------------------------------------------------------
  // INPUT — §5's two events, and nothing branches on `source`
  // ---------------------------------------------------------------------------------------

  _onNoteOn({ note, velocity, source }) {
    const tick = this._stampTick();
    const at = nowMs();

    // The buffer takes everything, always — armed or not, recording or not. That is the
    // entire point of CAPTURE as distinct from RECORD.
    this._ringPush({ note, velocity: clamp01(velocity), source, tick, at, moving: tick !== null });

    if (!this._take) return;
    if (tick === null) {
      // Counting in (seat question 5), or the transport is parked. Either way there is no
      // musical position to write this to. Counted, never guessed.
      if (this._clock.countingIn) this.dropped.duringCountIn++;
      return;
    }

    // ——— the two gates, seat question 4 ————————————————————————————————
    // WHERE (the punch region) and WHAT (the armed lanes). A hit that fails either one is
    // dropped and COUNTED — a student never silently loses a note without the UI able to say
    // so. Everything not armed and everything outside the region is left exactly as it was.
    const lane = this._laneFor(note);
    if (!this._isArmed(lane)) {
      this.dropped.unarmedLane++;
      return;
    }
    if (!this._inPunch(tick)) {
      this.dropped.outsidePunch++;
      return;
    }

    const rec = {
      tick,
      trueTick: tick, // the performance, stamped once and never overwritten (seat question 2)
      length: MIN_NOTE_LENGTH_TICKS, // closed at note-off, or at take end if still held
      note,
      velocity: clamp01(velocity),
      source, // metadata only — never read by anything that computes a tick or a velocity
      lane,
    };
    this._held.set(note, rec);
    this._take.notes.push(rec);
    this._passNotes.push(rec); // this loop pass's own list — seat question 3
    this._liveProject(rec); // draws it on the grid now — see LIVE PROJECTION
    this._emit('note', { ...rec, takeId: this._take.id });
  }

  _onNoteOff({ note }) {
    const rec = this._held.get(note);
    if (!rec) return;
    this._held.delete(note);
    const tick = this._stampTick();
    if (tick !== null) rec.length = Math.max(MIN_NOTE_LENGTH_TICKS, tick - rec.tick);
  }

  /** Close every open note at the current playhead. Used at take end, and on a background
   *  gap — `clock.js` emits 'resync' after a starved scheduler, and a note held across that
   *  gap has a meaningless length. */
  _closeHeld() {
    const tick = this._stampTick();
    for (const rec of this._held.values()) {
      if (tick !== null) rec.length = Math.max(MIN_NOTE_LENGTH_TICKS, tick - rec.tick);
    }
    this._held.clear();
  }

  _onResync() {
    this._closeHeld();
  }

  _onTick({ fromTick, toTick }) {
    // Deferred live-preview notes become visible once the playhead is past them, so a hit
    // snapped forward is never scheduled twice in one pass. See LIVE PROJECTION.
    this._flushDeferred(fromTick);

    // A loop wrap (or a backwards seek) is the only way a tick window can start behind where
    // the last one ended — `clock.js` pushes a new segment and resumes at `loop.start`.
    if (fromTick < this._lastToTick) this._onLoopWrap();
    this._lastToTick = toTick;

    // The count-in ending is a capture state change with no transport state change behind it
    // (`clock.state` is 'recording' on both sides of that seam). Noticed here, once a pass.
    this._syncState();
  }

  // =========================================================================================
  // SEAT QUESTION 3 — LOOP RECORDING. Overdub or replace, and it is a control.
  // =========================================================================================
  //
  // THE RULE
  //   `capture.loopMode` is `'overdub'` (default) or `'replace'`. It is a plain, readable,
  //   settable property with exactly two documented values, and the shell puts it on a
  //   two-position switch. **Nothing here is implicit.** A student who loops four bars and
  //   plays over them four times must be able to point at the switch and say which of the
  //   two things is about to happen, before it happens.
  //
  //   OVERDUB — every pass ADDS. Pass 1's kick is still there while pass 2's snare goes down
  //             and pass 3's hats go on top. This is how a beat gets built in a classroom and
  //             it is the default for that reason.
  //
  //   REPLACE — the last pass that had playing in it WINS, inside the loop region, on the
  //             armed lanes only. Play the fill again and the old fill is gone.
  //
  // THE ONE RULE THAT KEEPS `REPLACE` FROM BEING A TRAP
  //   **A silent pass replaces nothing.** If a student stops playing for a pass — to listen,
  //   to think, to answer the teacher — the take survives untouched. Replace only fires on a
  //   pass that actually contained notes. Without this rule, `replace` erases your work the
  //   moment you take your hands off the keys, which is not a mode, it is a bug with a name.
  //
  // WHAT REPLACE TOUCHES, EXACTLY
  //   Notes inside the loop region, on ARMED lanes. Everything outside the loop region and
  //   every unarmed lane is left exactly as it was — the same boundary the punch (seat
  //   question 4) draws, because it is the same idea measured on a different axis.

  // =========================================================================================
  // SEAT QUESTION 4 — PUNCH. Two gates, and everything else is left alone.
  // =========================================================================================
  //
  // A punch is two questions asked separately, and this file keeps them separate because
  // they are separate in a student's head:
  //
  //   WHAT — `capture.arm(...)`. One lane, several lanes, or `'all'`. Lanes are §14.1's
  //          eight fixed piece roles, so `arm(1)` and `arm({note: 38})` are the same thing
  //          said two ways: "the snare, and only the snare."
  //   WHERE — `capture.punchIn(startBar, endBar)` / `capture.punch = {on, startBar, endBar}`.
  //          `endBar` is EXCLUSIVE, identical to `clock.loop`, so bars 3–4 is
  //          `punchIn(3, 5)` and nobody has to remember a second convention.
  //
  // WHAT A PUNCH DOES NOT DECIDE: whether the material under it is added to or replaced.
  // That is `loopMode` (seat question 3), on purpose. Punch answers *where and what*; loop
  // mode answers *add or replace*. Two orthogonal controls beat one control with four
  // meanings, and a student can reason about each one on its own.
  //
  // WHAT IS LEFT UNTOUCHED, GUARANTEED BY CONSTRUCTION
  //   A hit on an unarmed lane, or outside the region, never enters the take — so it can
  //   never reach the pattern. And a commit re-projects the take onto the BASELINE the take
  //   started from, so every lane and every step the take did not write comes back byte for
  //   byte. Both drops are counted in `capture.dropped`, so a UI can say "4 hits ignored —
  //   the hat lane isn't armed" instead of a student wondering where their playing went.

  /** Bars 3–4 is `punchIn(3, 5)`. Returns `this`. */
  punchIn(startBar, endBar) {
    this.punch = { on: true, startBar: Number(startBar) || 1, endBar: Number(endBar) || 2 };
    return this;
  }

  punchOff() {
    this.punch = { ...this.punch, on: false };
    return this;
  }

  _inPunch(tick) {
    const p = this.punch;
    if (!p || !p.on) return true;
    const tpBar = ticksPerBar(this._ts());
    const start = (p.startBar - 1) * tpBar;
    const end = (p.endBar - 1) * tpBar;
    if (!(end > start)) return true; // a zero or inverted region is not a punch
    return tick >= start && tick < end;
  }

  /** `{start, end}` in absolute ticks, or null. `endBar` is EXCLUSIVE — `clock.js`'s own
   *  LOOP GEOMETRY note fixes that, and §7's example `{startBar: 1, endBar: 5}` is the
   *  four-bar loop this phase's done-check asks for. */
  _loopBounds() {
    const l = this._clock.loop;
    if (!l || !l.on) return null;
    const tpBar = ticksPerBar(this._ts());
    const start = (l.startBar - 1) * tpBar;
    const end = (l.endBar - 1) * tpBar;
    return end > start ? { start, end } : null;
  }

  get passCount() {
    return this._passCount;
  }

  _onLoopWrap() {
    if (!this._take) {
      this._passNotes = [];
      return;
    }
    this._passCount++;
    const played = this._passNotes;
    this._passNotes = [];

    if (this.loopMode !== 'replace') return; // overdub: the wrap changes nothing
    if (played.length === 0) return; // A SILENT PASS REPLACES NOTHING — see the rule above

    const lb = this._loopBounds();
    if (!lb) return;

    const survived = new Set(played);
    this._take.notes = this._take.notes.filter((rec) => {
      if (survived.has(rec)) return true;
      const t = rec.trueTick ?? rec.tick;
      const insideLoop = t >= lb.start && t < lb.end;
      return !(insideLoop && this._isArmed(rec.lane));
    });

    this._reprojectTake();
  }

  /** Rebuild the target pattern from the take's baseline plus the take's surviving notes.
   *  Used by `replace` at a wrap, so what is on screen after the seam is exactly what the
   *  take now holds — no residue from the pass that was just thrown out. */
  _reprojectTake() {
    if (!this._target || !this._take) return;
    this._deferred = [];
    const pattern = clonePattern(this._take.baseline) || this._target.getPattern();
    this._projectInto(pattern, this._take.notes);
    this._target.setPattern(pattern);
  }

  /** The transport leaving `'recording'` ends the take — a student presses stop and expects
   *  the take to be there, not to need a second button. */
  _onStateChange({ to }) {
    if (this._take && to !== 'recording') this.stopTake();
  }

  // ---------------------------------------------------------------------------------------
  // TAKES — RECORD (seat question 1, first half)
  // ---------------------------------------------------------------------------------------

  _beginTake(kind) {
    this._passNotes = [];
    this._passCount = 0;
    this._lastToTick = -Infinity;
    this._deferred = [];
    this.dropped = { outsidePunch: 0, unarmedLane: 0, duringCountIn: 0 };
    this._take = {
      id: ++this._takeId,
      kind, // 'record' | 'capture'
      startedAt: nowMs(),
      startTick: this._clock.positionTicks,
      notes: [],
      baseline: this._target ? clonePattern(this._target.getPattern()) : null,
    };
    this._syncState();
    return this._take;
  }

  /**
   * RECORD. Arms this capture (if `lanes` are given) and puts §3's transport into
   * `'recording'`, which is what actually opens the write gate. Calling `clock.record()`
   * directly and leaving this alone works too — `_onStateChange` is not the opener, the
   * take is opened here, so this method is the record button.
   */
  record(...lanes) {
    if (lanes.length) this.arm(...lanes);
    if (this._take) return this._take.id;
    this._beginTake('record');
    if (this._clock.state !== 'recording') this._clock.record();
    return this._take.id;
  }

  /** Finish the in-flight take and commit it. Returns the take report, or `null`. */
  stopTake() {
    if (!this._take) return null;
    this._closeHeld();
    const take = this._take;
    this._take = null;
    const report = this._commit(take);
    this._syncState();
    return report;
  }

  /**
   * CAPTURE. The other button. Commits what was ALREADY played — up to `bars` bars back out
   * of the rolling buffer — with no arming and no record state required. This is what a
   * student presses after playing the good one by accident.
   */
  keepLast(bars = 4) {
    const spt = this._secPerTick();
    const spanMs = Math.max(1, bars) * ticksPerBar(this._clock.timeSignature) * spt * 1000;
    const cutoff = nowMs() - spanMs;

    const usable = this._ring.filter((e) => e.moving && e.at >= cutoff);
    if (usable.length === 0) {
      // §7's loader rule, applied to a take: refuse and say so, never guess.
      const report = {
        takeId: null,
        kind: 'capture',
        refused: 'nothing-to-keep',
        reason:
          'The rolling buffer holds no notes played while the transport was moving in the ' +
          `last ${bars} bar(s). A note played with the transport stopped has no musical ` +
          'position, so it is buffered but never placed.',
        noteCount: 0,
        notes: [],
      };
      this._emit('commit', report);
      return report;
    }

    const take = {
      id: ++this._takeId,
      kind: 'capture',
      startedAt: cutoff,
      startTick: usable[0].tick,
      notes: usable
        .filter((e) => this._isArmed(this._laneFor(e.note)) && this._inPunch(e.tick))
        .map((e) => ({
          tick: e.tick,
          trueTick: e.tick,
          length: MIN_NOTE_LENGTH_TICKS,
          note: e.note,
          velocity: e.velocity,
          source: e.source,
          lane: this._laneFor(e.note),
        })),
      baseline: this._target ? clonePattern(this._target.getPattern()) : null,
    };
    return this._commit(take);
  }

  /** Throw the in-flight take away without committing anything. The fastest fix for a bad
   *  take is not to have to undo it — see seat question 7 for the after-the-fact route. */
  discardTake() {
    if (!this._take) return false;
    const id = this._take.id;
    this._held.clear();
    this._take = null;
    this._syncState();
    this._emit('commit', { takeId: id, kind: 'discard', discarded: true, noteCount: 0, notes: [] });
    return true;
  }

  // =========================================================================================
  // SEAT QUESTION 2 — QUANTIZATION. The rule, stated, and made visible.
  // =========================================================================================
  //
  // THE RULE, IN FOUR SENTENCES
  //   1. What the student played is kept, always, at the tick it was played
  //      (`note.trueTick`). Nothing in this file destroys a performance.
  //   2. The GRID always draws a hit at its nearest step. It has no choice: §13.5's `steps`
  //      is a dense array indexed by step, so "between two steps" is not a position the
  //      pattern can hold. §13.6 says the same thing for a loaded note — "the grid draws it
  //      at the nearest step and marks it off-grid."
  //   3. `quantize.on` decides whether the STORED tick moves to meet the grid. `strength`
  //      decides how far (1 = hard snap; 0.5 = halfway; 0 = untouched, same as `on: false`).
  //   4. Every hit that moved is reported — per note and in a summary — so a student who
  //      played it loose and watched it snap can SEE that it snapped, by how much, and in
  //      which direction. That is the brief's test and it is a hard requirement, not a nicety.
  //
  // WHAT `strength` DOES NOT DO, STATED PLAINLY RATHER THAN DISCOVERED LATER
  //   In P2 the sound you hear is the grid playing the pattern, and the pattern is snapped
  //   by construction (sentence 2). So a `strength` below 1 changes what is SAVED and what
  //   P3's piano roll and P4's arrangement read — it does not yet change what P2 plays back.
  //   Making an off-grid hit audible is a playback-time offset, which CONTRACTS §13.2a
  //   already establishes as the clock's mechanism (that is exactly what swing is), and the
  //   clock is not this seat's file. Reported to the Troubleshooter rather than solved by
  //   growing a second scheduler in here.
  //
  // §13 OPEN DECISIONS ITEM 6 — "whether a captured performance keeps its off-grid feel."
  //   Decider is this seat. ANSWER: it keeps it, and §13.5's step needs NO new field. The
  //   true tick lives in `notes[]`, on §7's already-frozen `tick` — the same place §13.6
  //   round-trips an off-grid note through. A per-step micro-timing offset on §13.5 would be
  //   a second home for a number that already has one. **No contract change requested.**

  _ts() {
    return this._clock.timeSignature;
  }

  _patternTicks(pattern) {
    return pattern.bars * ticksPerBar(this._ts());
  }

  /**
   * Where an absolute tick lands on one lane's grid.
   * Returns `{ stepIndex, gridTick, driftTicks }` — `driftTicks` signed, POSITIVE = the
   * student played LATE (behind the step), negative = early (ahead of it).
   */
  _gridPlace(tick, laneObj, pattern) {
    const ts = this._ts();
    const division = Number.isFinite(this.quantize.division) ? this.quantize.division : laneObj.division;
    const tps = ticksPerStep(division, ts);
    const patternTicks = this._patternTicks(pattern);
    const cycleBase = Math.floor(tick / patternTicks) * patternTicks;
    const cyclePos = mod(tick, patternTicks);

    let stepIndex = Math.round(cyclePos / tps);
    let gridTick = cycleBase + stepIndex * tps;
    // Rounding up off the end of the pattern belongs to step 0 of the next cycle — the same
    // wrap `step-grid.js`'s scheduler applies (`if (idx >= lane.steps.length) idx = 0`).
    if (stepIndex >= laneObj.steps.length) {
      stepIndex = 0;
      gridTick = cycleBase + patternTicks;
    }
    return { stepIndex, gridTick, driftTicks: tick - gridTick, ticksPerStep: tps, division };
  }

  /** Applies the quantize setting to ONE record, in place, and returns its drift facts.
   *  `trueTick` is stamped once and never overwritten — re-running this with a different
   *  setting always measures from the performance, never from a previous snap. */
  _quantizeRecord(rec, laneObj, pattern) {
    if (rec.trueTick === undefined) rec.trueTick = rec.tick;
    const place = this._gridPlace(rec.trueTick, laneObj, pattern);
    const strength = this.quantize.on ? Math.max(0, Math.min(1, Number(this.quantize.strength))) : 0;
    rec.tick = Math.round(rec.trueTick + (place.gridTick - rec.trueTick) * strength);
    return place;
  }

  /** Writes one note into a §13.5 pattern. Velocity is the only field a step carries (§13.5:
   *  "On/off is the presence of the object. Velocity is the only field.") — so a second hit
   *  on a step that is already on REPLACES it. Last hit wins, which is what a student who
   *  played the same step twice on purpose expects to hear. */
  _writeStep(pattern, laneIndex, stepIndex, velocity) {
    const laneObj = pattern.lanes[laneIndex];
    if (!laneObj || stepIndex < 0 || stepIndex >= laneObj.steps.length) return false;
    laneObj.steps[stepIndex] = { v: clamp01(velocity) };
    return true;
  }

  /** Project a set of note records into a cloned pattern, gathering the drift report.
   *  Notes with no lane (not one of §14.1's eight pieces, or no instrument bound) are kept
   *  in `notes[]` and simply have no row to be drawn in. */
  _projectInto(pattern, notes) {
    const moved = [];
    for (const rec of notes) {
      if (rec.lane === null || rec.lane === undefined) continue;
      const laneObj = pattern.lanes[rec.lane];
      if (!laneObj) continue;
      const place = this._quantizeRecord(rec, laneObj, pattern);
      this._writeStep(pattern, rec.lane, place.stepIndex, rec.velocity);
      if (place.driftTicks !== 0) {
        moved.push({
          note: rec.note,
          lane: rec.lane,
          source: rec.source,
          stepIndex: place.stepIndex,
          trueTick: rec.trueTick,
          gridTick: place.gridTick,
          storedTick: rec.tick,
          driftTicks: place.driftTicks,
          driftMs: place.driftTicks * this._secPerTick() * 1000,
          direction: place.driftTicks > 0 ? 'late' : 'early',
          snapped: rec.tick === place.gridTick,
        });
      }
    }
    return moved;
  }

  /** The one number a student is shown after a take: what moved, how far, which way. */
  _summarise(moved, noteCount) {
    if (moved.length === 0) {
      return { moved: 0, of: noteCount, meanAbsDriftTicks: 0, meanAbsDriftMs: 0, worstDriftTicks: 0, late: 0, early: 0 };
    }
    let sum = 0;
    let worst = 0;
    let late = 0;
    let early = 0;
    for (const m of moved) {
      const a = Math.abs(m.driftTicks);
      sum += a;
      if (a > worst) worst = m.driftTicks;
      if (m.driftTicks > 0) late++;
      else early++;
    }
    const meanTicks = sum / moved.length;
    return {
      moved: moved.length,
      of: noteCount,
      meanAbsDriftTicks: Math.round(meanTicks),
      meanAbsDriftMs: Math.round(meanTicks * this._secPerTick() * 1000),
      worstDriftTicks: worst,
      late,
      early,
    };
  }

  // ---------------------------------------------------------------------------------------
  // LIVE PROJECTION — why a note is sometimes written to the grid a beat after it is played
  // ---------------------------------------------------------------------------------------
  // A hit is drawn on the grid the instant it is captured, because a student needs to see it
  // land. But the grid schedules 100 ms AHEAD of the audible playhead (§3's lookahead window),
  // so a hit played 10 ticks EARLY and snapped FORWARD onto a step the scheduler has not yet
  // reached would be scheduled by the grid this same pass — and the student would hear their
  // own hit flam back at them a few milliseconds later. So a note whose snapped tick is still
  // ahead of `clock.leadingEdgeTicks` is DEFERRED and written once the playhead has passed it.
  // Late hits — the common case — snap backwards and are written immediately.

  _liveProject(rec) {
    if (!this._target || rec.lane === null || rec.lane === undefined) return;
    const pattern = this._target.getPattern();
    const laneObj = pattern?.lanes?.[rec.lane];
    if (!laneObj) return;
    const place = this._quantizeRecord(rec, laneObj, pattern);
    if (place.gridTick >= this._clock.leadingEdgeTicks) {
      this._deferred.push({ rec, gridTick: place.gridTick });
      return;
    }
    this._writeStep(pattern, rec.lane, place.stepIndex, rec.velocity);
    this._target.setPattern(pattern);
  }

  _flushDeferred(uptoTick) {
    if (this._deferred.length === 0 || !this._target) return;
    const ready = [];
    const still = [];
    for (const entry of this._deferred) {
      if (entry.gridTick <= uptoTick) ready.push(entry.rec);
      else still.push(entry);
    }
    this._deferred = still;
    if (ready.length === 0) return;
    const pattern = this._target.getPattern();
    for (const rec of ready) {
      const laneObj = pattern?.lanes?.[rec.lane];
      if (!laneObj) continue;
      const place = this._quantizeRecord(rec, laneObj, pattern);
      this._writeStep(pattern, rec.lane, place.stepIndex, rec.velocity);
    }
    this._target.setPattern(pattern);
  }

  // ---------------------------------------------------------------------------------------
  // COMMIT — a take becomes note data AND a §13.5 pattern, and reports what it changed
  // ---------------------------------------------------------------------------------------

  _commit(take) {
    this._deferred = [];
    let moved = [];
    const patternBefore = take.baseline ? clonePattern(take.baseline) : null;

    if (this._target) {
      // Re-project the WHOLE take onto the baseline the take started from, rather than
      // trusting whatever the live preview left behind. One code path decides what the
      // pattern ends up as, and it is this one.
      const pattern = clonePattern(take.baseline) || this._target.getPattern();
      moved = this._projectInto(pattern, take.notes);
      take.after = clonePattern(pattern);
      this._target.setPattern(pattern);
    } else {
      // No grid bound (P3's piano roll will use the file this way): quantize still applies,
      // measured against a notional single-bar grid at the requested division.
      const ts = this._ts();
      const division = Number.isFinite(this.quantize.division) ? this.quantize.division : 4;
      const virtual = {
        bars: 1,
        lanes: [{ piece: 0, division, steps: new Array(ts.top * division).fill(null) }],
      };
      for (const rec of take.notes) this._quantizeRecord(rec, virtual.lanes[0], virtual);
    }

    this._takes.push(take);
    // Seat question 7 — one undo entry per committed take, pushed here so `record()` and
    // `keepLast()` cannot diverge on it.
    this._pushUndo({ kind: take.kind, patternBefore, patternAfter: take.after || null, take });

    const report = {
      takeId: take.id,
      kind: take.kind,
      noteCount: take.notes.length,
      notes: take.notes.map((n) => ({ ...n })),
      quantize: { ...this.quantize },
      loopMode: this.loopMode,
      passes: this._passCount,
      punch: { ...this.punch },
      armed: this.armedLanes,
      dropped: { ...this.dropped },
      sources: this._sourceTally(take.notes), // §5 logging only — see SEAT QUESTION 6
      velocityRange: take.notes.length
        ? {
            min: Math.min(...take.notes.map((n) => n.velocity)),
            max: Math.max(...take.notes.map((n) => n.velocity)),
          }
        : null,
      moved,
      summary: this._summarise(moved, take.notes.length),
    };
    this.lastReport = report;
    this._emit('commit', report);
    return report;
  }

  // =========================================================================================
  // SEAT QUESTION 7 — UNDO. "A student will play a bad take in front of the class."
  // =========================================================================================
  //
  // THE RULE, STATED FOR A STUDENT AND NOT FOR A PROGRAMMER
  //   **Nothing you record is permanent until you decide it is. A take can always be taken
  //   back, whole, and taking it back can be taken back.**
  //
  // There are two ways out of a bad take, and a class needs both because they happen at
  // different moments:
  //
  //   WHILE IT IS HAPPENING — `discardTake()`. You are still playing, it is already wrong,
  //     you bail. Nothing is ever committed, so there is nothing to undo afterwards and
  //     nothing on the grid changed. This is the ESC key and it is the fastest fix there is.
  //
  //   AFTER IT LANDED — `undo()`. The take is on the grid, everyone heard it. One press puts
  //     the pattern back exactly as it was before that take and removes the take's notes.
  //     `redo()` puts it back. Depth is `UNDO_DEPTH` takes, not one — a student who plays
  //     three bad takes in a row can walk out of all three, which is the actual situation.
  //
  // WHAT AN UNDO RESTORES, EXACTLY
  //   The pattern snapshot taken at the moment the take STARTED (`take.baseline`) — not a
  //   diff, not a replay. Every lane the take never touched comes back byte for byte because
  //   it was never different. And the take's notes leave `notes[]` with it, so a save written
  //   after an undo does not carry the take a student just removed.
  //
  // WHAT UNDO IS NOT
  //   Not a general edit history. It covers what THIS FILE did: takes, and `requantize()`.
  //   A student toggling a step by hand on the grid is `step-grid.js`'s business, not this
  //   file's, and inventing a shared undo bus across two seats' files is exactly the kind of
  //   interface §10 forbids. Reported to the Troubleshooter as a P2 shell question.

  _pushUndo(entry) {
    this._undo.push(entry);
    if (this._undo.length > UNDO_DEPTH) this._undo.shift();
    this._redo = [];
    this._emit('historychange', { canUndo: this.canUndo, canRedo: this.canRedo });
  }

  get canUndo() {
    return this._undo.length > 0;
  }

  get canRedo() {
    return this._redo.length > 0;
  }

  get undoDepth() {
    return this._undo.length;
  }

  /** Take back the last thing this file did. Returns `{kind, takeId}` or `null`. */
  undo() {
    const entry = this._undo.pop();
    if (!entry) return null;
    if (entry.take) {
      const i = this._takes.indexOf(entry.take);
      if (i !== -1) this._takes.splice(i, 1);
    }
    if (this._target && entry.patternBefore) this._target.setPattern(clonePattern(entry.patternBefore));
    this._redo.push(entry);
    this._emit('historychange', { canUndo: this.canUndo, canRedo: this.canRedo });
    return { kind: entry.kind, takeId: entry.take ? entry.take.id : null };
  }

  /** Put back what `undo()` took. Returns `{kind, takeId}` or `null`. */
  redo() {
    const entry = this._redo.pop();
    if (!entry) return null;
    if (entry.take && !this._takes.includes(entry.take)) this._takes.push(entry.take);
    if (this._target && entry.patternAfter) this._target.setPattern(clonePattern(entry.patternAfter));
    this._undo.push(entry);
    this._emit('historychange', { canUndo: this.canUndo, canRedo: this.canRedo });
    return { kind: entry.kind, takeId: entry.take ? entry.take.id : null };
  }

  /** Re-run the quantize setting over everything already committed and redraw the pattern.
   *  Non-destructive in both directions, because `trueTick` is never overwritten: turn
   *  `quantize.on` off, call this, and the performance comes back exactly as played. */
  requantize() {
    if (!this._target) return null;
    const patternBefore = clonePattern(this._target.getPattern());
    const pattern = this._target.getPattern();
    for (const lane of pattern.lanes) lane.steps = lane.steps.map(() => null);
    const all = [];
    for (const take of this._takes) all.push(...take.notes);
    const moved = this._projectInto(pattern, all);
    this._target.setPattern(pattern);
    this._pushUndo({ kind: 'requantize', patternBefore, patternAfter: clonePattern(pattern), take: null });
    const report = {
      takeId: null,
      kind: 'requantize',
      noteCount: all.length,
      notes: all.map((n) => ({ ...n })),
      quantize: { ...this.quantize },
      moved,
      summary: this._summarise(moved, all.length),
    };
    this.lastReport = report;
    this._emit('commit', report);
    return report;
  }

  _secPerTick() {
    const c = this._clock;
    const tpBeat = (4 * c.PPQ) / c.timeSignature.bottom;
    return 60 / (c.bpm * tpBeat);
  }

  // ---------------------------------------------------------------------------------------
  // HANDOFF
  // ---------------------------------------------------------------------------------------

  /** Everything captured so far, newest take last, at TRUE ticks — the lossless record.
   *  Carries two fields beyond §7's four (`source`, `lane`) as metadata; see
   *  `toProjectNotes()` for the §7-exact shape. */
  getNotes() {
    const out = [];
    for (const take of this._takes) for (const n of take.notes) out.push({ ...n });
    out.sort((a, b) => a.tick - b.tick || a.note - b.note);
    return out;
  }

  /** CONTRACTS §7 `channels[].notes[]`, exactly — four fields, nothing added. §7 is frozen
   *  and this seat adds no key to it. */
  toProjectNotes() {
    return this.getNotes().map(({ tick, length, note, velocity }) => ({ tick, length, note, velocity }));
  }

  // ---------------------------------------------------------------------------------------
  // TEARDOWN
  // ---------------------------------------------------------------------------------------

  /** Zero leaked listeners, matching the shape every other file's `dispose()` returns. */
  dispose() {
    const listenersDropped = EVENTS.reduce((n, e) => n + this._listeners[e].size, 0);
    for (const un of this._unsubs) un();
    this._unsubs = [];
    this._clock.off('statechange', this._onStateChange);
    this._clock.off('resync', this._onResync);
    this._clock.off('tick', this._onTick);
    for (const e of EVENTS) this._listeners[e].clear();
    this._held.clear();
    this._ring = [];
    this._take = null;
    return { listenersDropped, busSubscriptionsDropped: 5 };
  }
}

export { Capture };
