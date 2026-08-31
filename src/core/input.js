/**
 * core/input.js — the one place four kinds of hardware become one kind of event.
 * Built by `keys-input`, P1/S3.
 *
 * Owns: CONTRACTS §5's `input.on('noteon'|'noteoff', fn)` consumer side · §12.1's
 * `input.emitNoteOn` / `input.emitNoteOff` producer side · `octaveShift` · `positionShift` ·
 * §5's amended Web MIDI block (fire-and-forget, never awaited, silent on refusal).
 *
 * Does NOT own: any AudioContext, any node, any instrument, any drawing. This file never
 * imports `core/audio.js` and never will — an input bus that knows about audio is an input
 * bus that cannot be reused by P2's grid, P3's circle, or P4's piano roll.
 *
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE (§5, brief question 1):
 *   All four hardware routes produce identical events. `source` is carried for logging and
 *   for a surface to know what to draw. **Nothing downstream may branch on it.** If an
 *   instrument can tell which hardware fired a note, this file failed.
 */

// ---------------------------------------------------------------------------------------
// 1 · THE EVENT SHAPE  (seat question 1)
// ---------------------------------------------------------------------------------------
// §5, verbatim:
//   input.on('noteon',  fn)   // {note, velocity, source}
//   input.on('noteoff', fn)   // {note, source}
//   source: 'mouse' | 'key' | 'touch' | 'midi' | 'circle' | 'diatonic'
//
// Every route below funnels through emitNoteOn/emitNoteOff and therefore produces exactly
// these two shapes. There is no second path out of this module.

/** §5's `source` enum, complete. 'circle' and 'diatonic' are P3's surfaces — listed here
 *  because the enum is frozen in §5, not because this file knows anything about them. */
export const SOURCES = Object.freeze([
  'mouse',
  'key',
  'touch',
  'midi',
  'circle',
  'diatonic',
]);

/** §12.1: a surface that cannot sense velocity reports a fixed 0.8, matching §7's default
 *  note velocity. No surface invents its own constant, so the constant lives here. */
export const DEFAULT_VELOCITY = 0.8;

const EVENTS = ['noteon', 'noteoff', 'shift'];

const listeners = {
  noteon: new Set(),
  noteoff: new Set(),
  // 'shift' is NOT in §5. See OPEN DECISIONS in this seat's receipt. §12.1 states that
  // octaveShift/positionShift "belong to input itself, shared across every surface at
  // once" — with no notification, a second surface cannot honour that sentence. This is a
  // third event name on §5's already-defined `input.on(event, fn)` bus, not a new
  // interface: no frozen signature changes and nothing is required to subscribe.
  shift: new Set(),
};

function emit(event, payload) {
  for (const fn of listeners[event]) {
    try {
      fn(payload);
    } catch (err) {
      // A subscriber's own bug must never break the bus for the other subscribers, and
      // must never leave a note stuck. Same rule audio.js applies to its listeners.
      console.error('[input.js] listener for "%s" threw:', event, err);
    }
  }
}

// ---------------------------------------------------------------------------------------
// 2 · HELD-NOTE BOOKKEEPING — why this is not just a passthrough
// ---------------------------------------------------------------------------------------
//
// Two facts force real state here, and both are stuck-note bugs if ignored:
//
// 1. `octaveShift` can change WHILE a note is held. If the shift were applied fresh on the
//    way out of noteoff, the noteoff would carry a different note number than the noteon
//    did and the instrument would never release the voice. So the SHIFTED note is stored
//    at note-on and replayed at note-off. The shift is read exactly once per note.
//
// 2. Two routes can hold the same note at once — a student holds C on the computer
//    keyboard and also clicks C with the mouse. Without a count, releasing the mouse cuts
//    the note the keyboard is still holding. So sounding notes are reference-counted:
//    'noteon' fires on the 0 -> 1 transition, 'noteoff' on the 1 -> 0 transition. This is
//    invisible to §5's event shape and does not let anything downstream see the route.

/** `${source}:${rawNote}` -> the shifted note that was actually emitted. */
const held = new Map();

/** shifted note -> how many distinct (source, rawNote) holders are on it right now. */
const sounding = new Map();

function heldKey(source, note) {
  return `${source}:${note}`;
}

// ---------------------------------------------------------------------------------------
// 3 · THE TWO SHIFTS  (seat questions 4 and 5)
// ---------------------------------------------------------------------------------------

let octaveShiftValue = 0;
let positionShiftValue = 0;

// A guard, not a contract limit: §5 gives `octaveShift` no range. Past ±5 every note lands
// outside MIDI 0-127 and the keyboard goes silently dead with no feedback, which reads to a
// student as a broken app. Clamping keeps the surface honest about what it can reach.
const OCTAVE_SHIFT_LIMIT = 5;

function setOctaveShift(value) {
  const n = Math.max(
    -OCTAVE_SHIFT_LIMIT,
    Math.min(OCTAVE_SHIFT_LIMIT, Math.trunc(Number(value) || 0)),
  );
  if (n === octaveShiftValue) return;
  octaveShiftValue = n;
  // Notes already held keep the note number they were emitted with (see §2 above), so
  // changing octave mid-hold can never strand a voice.
  emit('shift', { octaveShift: octaveShiftValue, positionShift: positionShiftValue });
}

function setPositionShift(value) {
  const n = ((Math.trunc(Number(value) || 0) % 12) + 12) % 12;
  if (n === positionShiftValue) return;
  positionShiftValue = n;
  emit('shift', { octaveShift: octaveShiftValue, positionShift: positionShiftValue });
}

// ---------------------------------------------------------------------------------------
// 4 · THE PRODUCER SIDE  (§12.1)
// ---------------------------------------------------------------------------------------

function emitNoteOn({ note, velocity = DEFAULT_VELOCITY, source }) {
  if (!Number.isFinite(note)) return false;
  if (!SOURCES.includes(source)) {
    // Warn, but still emit. Losing a student's note is worse than an unknown label.
    console.warn('[input.js] emitNoteOn: source "%s" is not in §5\'s enum', source);
  }

  const raw = Math.trunc(note);
  const key = heldKey(source, raw);

  // Already down on this exact route: key auto-repeat, a double pointerdown, a MIDI
  // device re-sending note-on. Not a new note.
  if (held.has(key)) return false;

  // ——— octaveShift (seat question 4): §5, "shifts all incoming notes by 12 * n" ————
  // ALL incoming notes, MIDI included — if it applied to three routes and not the fourth,
  // the four routes would no longer produce identical events (§5's other sentence).
  const shifted = raw + 12 * octaveShiftValue;
  if (shifted < 0 || shifted > 127) return false; // off the MIDI range: drop, stay silent

  held.set(key, shifted);

  const count = sounding.get(shifted) || 0;
  sounding.set(shifted, count + 1);
  if (count > 0) return false; // already sounding from another route — do not double-fire

  const vel = Math.max(0, Math.min(1, Number(velocity)));
  emit('noteon', {
    note: shifted,
    velocity: Number.isFinite(vel) ? vel : DEFAULT_VELOCITY,
    source,
  });
  return true;
}

function emitNoteOff({ note, source }) {
  if (!Number.isFinite(note)) return false;

  const raw = Math.trunc(note);
  const key = heldKey(source, raw);
  if (!held.has(key)) return false; // never went down on this route — no phantom note-off

  const shifted = held.get(key);
  held.delete(key);

  const count = (sounding.get(shifted) || 1) - 1;
  if (count > 0) {
    sounding.set(shifted, count);
    return false; // another route is still holding it
  }
  sounding.delete(shifted);

  emit('noteoff', { note: shifted, source });
  return true;
}

/**
 * Releases every note this bus believes is held, or only those from one route. The panic
 * button: window blur (key-up will never arrive), MIDI CC 120/123, dispose, and a surface
 * unmounting mid-hold all land here. Emits real 'noteoff' events, so an instrument never
 * has to know why.
 */
function allNotesOff(source = null) {
  let released = 0;
  for (const key of [...held.keys()]) {
    const sep = key.indexOf(':');
    const keySource = key.slice(0, sep);
    if (source && keySource !== source) continue;
    const raw = Number(key.slice(sep + 1));
    if (emitNoteOff({ note: raw, source: keySource })) released++;
    else held.delete(key); // suppressed because another route held it; drop this holder
  }
  return released;
}

// ---------------------------------------------------------------------------------------
// 5 · WEB MIDI — the fourth route  (seat question 3)
// ---------------------------------------------------------------------------------------
// Bound to §5's amended block and findings-webaudio.md Q5 exactly:
//   · feature-detected with a plain `typeof` check, which throws nothing on a non-secure
//     context — no try/catch is needed to detect absence, and none is used;
//   · fired and forgotten, NEVER awaited (measured at 7128.6 ms to resolve, with the
//     permission prompt auto-accepted — an awaited startup is a seven-second dead app);
//   · a refusal arrives as a rejected promise, caught locally, and says nothing;
//   · access may land seconds after the app is interactive, and the other three routes are
//     never affected either way.

const boundPorts = new Set();
const midiAccesses = new Set();

function onMIDIMessage(e) {
  const data = e.data;
  if (!data || data.length < 2) return;

  const status = data[0];
  if (status >= 0xf0) return; // system/realtime (clock, sensing) — not this file's business

  const cmd = status & 0xf0;
  const note = data[1];
  const vel = data.length > 2 ? data[2] : 0;

  if (cmd === 0x90 && vel > 0) {
    // Real velocity, the one route that has it. §12.1's fixed 0.8 is for routes that
    // cannot sense velocity — MIDI can, so it reports what the hardware sent.
    emitNoteOn({ note, velocity: vel / 127, source: 'midi' });
  } else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
    // Running-status note-off: a note-on with velocity 0. Every controller does this.
    emitNoteOff({ note, source: 'midi' });
  } else if (cmd === 0xb0 && (note === 120 || note === 123)) {
    allNotesOff('midi'); // All Sound Off / All Notes Off — a real stuck-note guard
  }
}

function bindPorts(access) {
  for (const port of access.inputs.values()) {
    if (boundPorts.has(port)) continue;
    port.onmidimessage = onMIDIMessage;
    boundPorts.add(port);
  }
}

/**
 * §5's amended block names this exact entry point: `.then(access => input.attachMIDI(access))`.
 * Idempotent, and safe to call with an access object that gains ports later — devices
 * plugged in after page load arrive through `onstatechange` and bind themselves.
 */
function attachMIDI(access) {
  if (!access || typeof access.inputs?.values !== 'function') return false;
  midiAccesses.add(access);
  bindPorts(access);
  access.onstatechange = (e) => {
    // A port that vanished mid-note would otherwise leave a voice sounding forever.
    if (e?.port && e.port.state === 'disconnected') {
      boundPorts.delete(e.port);
      allNotesOff('midi');
    }
    bindPorts(access);
  };
  return true;
}

let midiRequested = false;

/**
 * The §5 shape, verbatim in behaviour. Fire and forget. Returns nothing worth awaiting on
 * purpose — there is no promise here for a caller to accidentally block startup on.
 */
function requestMIDI() {
  if (midiRequested) return;
  midiRequested = true;
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.requestMIDIAccess !== 'function') return; // absent: non-secure
  navigator
    .requestMIDIAccess({ sysex: false })
    .then((access) => attachMIDI(access)) // arriving late is fine
    .catch(() => {}); // refused: silent, per §5
}

// Called once at module load, deliberately. §5 requires the fourth route to be
// opportunistic and never blocking; leaving the call to a shell means one forgotten line
// in one page silently costs every MIDI student their hardware. Nothing awaits this, and
// on a non-secure context the `typeof` check above makes it a no-op that throws nothing.
requestMIDI();

// ---------------------------------------------------------------------------------------
// 6 · TEARDOWN  (seat question 9)
// ---------------------------------------------------------------------------------------

/**
 * Drops every listener this module holds — bus subscribers and every bound MIDI port —
 * releases anything still sounding, and resets both shifts. Returns
 * `{ listenersDropped, portsUnbound, notesReleased }` so a caller can verify by count that
 * nothing leaked, matching the shape `audio.js`'s own dispose() returns.
 *
 * DOM listeners are NOT dropped here: this module attaches none. The keyboard/pointer/
 * touch listeners live in `surfaces/keyboard.js` and that surface's own dispose() drops
 * them (§12.1: "drops every DOM listener it attached").
 */
function dispose() {
  const notesReleased = allNotesOff();

  let listenersDropped = 0;
  for (const name of EVENTS) {
    listenersDropped += listeners[name].size;
    listeners[name].clear();
  }

  let portsUnbound = 0;
  for (const port of boundPorts) {
    port.onmidimessage = null;
    portsUnbound++;
  }
  boundPorts.clear();
  for (const access of midiAccesses) access.onstatechange = null;
  midiAccesses.clear();

  held.clear();
  sounding.clear();
  octaveShiftValue = 0;
  positionShiftValue = 0;

  return { listenersDropped, portsUnbound, notesReleased };
}

// ---------------------------------------------------------------------------------------
// 7 · THE BUS
// ---------------------------------------------------------------------------------------
// One shared instance. §12.1: `constructor(el, input)` — "input = the shared core/input.js
// bus. The ONLY thing a surface is ever handed."

export const input = {
  // ——— consumer side, §5 ———
  on(event, fn) {
    if (!listeners[event]) throw new Error(`input.on: no such event "${event}"`);
    listeners[event].add(fn);
    return () => listeners[event].delete(fn);
  },
  off(event, fn) {
    if (listeners[event]) listeners[event].delete(fn);
  },

  // ——— producer side, §12.1 ———
  emitNoteOn,
  emitNoteOff,
  allNotesOff,

  // ——— the two shifts, §5 ———
  /** Integer. Shifts all incoming notes by 12 * n, on every route alike. */
  get octaveShift() {
    return octaveShiftValue;
  },
  set octaveShift(v) {
    setOctaveShift(v);
  },

  /**
   * 0-11: which pitch class is DRAWN as the bottom key.
   *
   * A DISPLAY TRANSFORM AND NOTHING ELSE. It is read by surfaces to decide what to draw.
   * This file never adds it to a note number — search this module: `positionShiftValue`
   * appears in its setter, its getter, and the shift event. It is absent from
   * emitNoteOn/emitNoteOff by design, and that absence is the feature.
   */
  get positionShift() {
    return positionShiftValue;
  },
  set positionShift(v) {
    setPositionShift(v);
  },

  // ——— the fourth route, §5 amended ———
  attachMIDI,
  requestMIDI,
  get midiAttached() {
    return boundPorts.size > 0;
  },

  // ——— introspection, for surfaces and for the done-check ———
  /** Notes sounding right now, as emitted (already octave-shifted). */
  get activeNotes() {
    return [...sounding.keys()];
  },
  get listenerCount() {
    return EVENTS.reduce((n, name) => n + listeners[name].size, 0);
  },

  dispose,
};

export default input;
