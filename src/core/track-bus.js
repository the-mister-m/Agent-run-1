// =========================================================================================
// core/track-bus.js — ONE NOTE BUS PER TRACK
// =========================================================================================
// A per-track note path beside the `core/input.js` singleton. Same consumer and producer
// shape a surface calls, but one instance per track, and it plays that track's instrument
// itself: no monitor, no subscriber, no router.
//
// Holds: its own listeners, its own held/sounding notes, its own octaveShift and
// positionShift, its own armed flag, and one bound instrument reference (null = silent).
// Armed gates `key` and `midi` only. Mouse, touch, circle and diatonic always sound.
// Holds no AudioContext, no node, no MIDI port. Constructs and disposes no instrument.
// =========================================================================================

import { SOURCES, DEFAULT_VELOCITY } from './input.js';

const EVENTS = ['noteon', 'noteoff', 'shift'];

/** Guard, not a contract limit: past ±5 every note lands outside MIDI 0-127. */
const OCTAVE_SHIFT_LIMIT = 5;

/** Sources shared across every track at once. Accepted only while this bus is armed.
 *  Every other source is per-lane and always accepted. */
const ARM_GATED_SOURCES = Object.freeze(['key', 'midi']);

/** → a note bus for one track. `instrument` may be null and may be swapped later.
 *  `armed` starts false: a new track hears mouse and touch, not the computer keyboard. */
export function createTrackBus({ id = null, instrument = null, armed = false } = {}) {
  const listeners = Object.fromEntries(EVENTS.map((name) => [name, new Set()]));

  /** `${source}:${rawNote}` -> the shifted note actually emitted. */
  const held = new Map();
  /** shifted note -> how many (source, rawNote) holders are on it. */
  const sounding = new Map();

  let bound = instrument ?? null;
  let octaveShiftValue = 0;
  let positionShiftValue = 0;
  let armedValue = Boolean(armed);

  const label = id ? `track-bus ${id}` : 'track-bus';

  /** Publish to subscribers. A subscriber that throws never breaks the bus. */
  function emit(event, payload) {
    for (const fn of [...listeners[event]]) {
      try {
        fn(payload);
      } catch (err) {
        console.error('[track-bus.js] %s: listener for "%s" threw:', label, event, err);
      }
    }
  }

  /** Call one method on the bound instrument. No binding, or a throw, stays silent-safe. */
  function play(method, ...args) {
    if (!bound || typeof bound[method] !== 'function') return false;
    try {
      bound[method](...args);
      return true;
    } catch (err) {
      console.error('[track-bus.js] %s: instrument.%s threw:', label, method, err);
      return false;
    }
  }

  function heldKey(source, note) {
    return `${source}:${note}`;
  }

  /** True when `source` may sound on this bus right now. */
  function accepts(source) {
    return armedValue || !ARM_GATED_SOURCES.includes(source);
  }

  /** Releases only what one route holds. No instrument panic — other routes may still be
   *  sounding. Returns the number of notes released. */
  function releaseSource(source) {
    let released = 0;
    for (const key of [...held.keys()]) {
      const sep = key.indexOf(':');
      if (key.slice(0, sep) !== source) continue;
      const raw = Number(key.slice(sep + 1));
      if (emitNoteOff({ note: raw, source })) released++;
      else held.delete(key);
    }
    return released;
  }

  /** Arm/disarm. Disarming releases whatever the gated routes still hold, so a key held
   *  across a disarm does not stick. */
  function setArmed(value) {
    const on = Boolean(value);
    if (on === armedValue) return;
    armedValue = on;
    if (!on) for (const source of ARM_GATED_SOURCES) releaseSource(source);
  }

  function setOctaveShift(value) {
    const n = Math.max(
      -OCTAVE_SHIFT_LIMIT,
      Math.min(OCTAVE_SHIFT_LIMIT, Math.trunc(Number(value) || 0)),
    );
    if (n === octaveShiftValue) return;
    octaveShiftValue = n;
    emit('shift', { octaveShift: octaveShiftValue, positionShift: positionShiftValue });
  }

  function setPositionShift(value) {
    const n = ((Math.trunc(Number(value) || 0) % 12) + 12) % 12;
    if (n === positionShiftValue) return;
    positionShiftValue = n;
    emit('shift', { octaveShift: octaveShiftValue, positionShift: positionShiftValue });
  }

  /** Producer side. The shift is read once, at note-on, and the shifted note is stored so
   *  the matching note-off carries the same number. Ref-counted across routes: fires on the
   *  0 -> 1 transition only. Returns true when a note actually sounded. */
  function emitNoteOn({ note, velocity = DEFAULT_VELOCITY, source }) {
    if (!Number.isFinite(note)) return false;
    if (!SOURCES.includes(source)) {
      console.warn('[track-bus.js] %s: emitNoteOn: unknown source "%s"', label, source);
    }
    if (!accepts(source)) return false; // shared route, track not armed

    const raw = Math.trunc(note);
    const key = heldKey(source, raw);
    if (held.has(key)) return false; // already down on this route

    const shifted = raw + 12 * octaveShiftValue;
    if (shifted < 0 || shifted > 127) return false; // off the MIDI range: drop

    held.set(key, shifted);

    const count = sounding.get(shifted) || 0;
    sounding.set(shifted, count + 1);
    if (count > 0) return false; // another route already holds it

    const clamped = Math.max(0, Math.min(1, Number(velocity)));
    const vel = Number.isFinite(clamped) ? clamped : DEFAULT_VELOCITY;

    play('noteOn', shifted, vel);
    emit('noteon', { note: shifted, velocity: vel, source });
    return true;
  }

  /** Producer side. Fires on the 1 -> 0 transition only. */
  function emitNoteOff({ note, source }) {
    if (!Number.isFinite(note)) return false;

    const raw = Math.trunc(note);
    const key = heldKey(source, raw);
    if (!held.has(key)) return false; // never went down on this route

    const shifted = held.get(key);
    held.delete(key);

    const count = (sounding.get(shifted) || 1) - 1;
    if (count > 0) {
      sounding.set(shifted, count);
      return false;
    }
    sounding.delete(shifted);

    play('noteOff', shifted);
    emit('noteoff', { note: shifted, source });
    return true;
  }

  /** Releases every note this bus holds, or only one route's, then panics the instrument.
   *  Returns the number of notes released. */
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
    play('allNotesOff');
    return released;
  }

  /** Binds the instrument this bus plays. Null is valid and means silent. Anything still
   *  held is released through the outgoing instrument first, so a swap strands no voice. */
  function bindInstrument(next = null) {
    const instance = next ?? null;
    if (instance === bound) return instance;
    if (bound) allNotesOff();
    bound = instance;
    return bound;
  }

  /** Drops every listener, releases held notes, unbinds, resets both shifts. */
  function dispose() {
    const notesReleased = allNotesOff();
    let listenersDropped = 0;
    for (const name of EVENTS) {
      listenersDropped += listeners[name].size;
      listeners[name].clear();
    }
    held.clear();
    sounding.clear();
    bound = null;
    octaveShiftValue = 0;
    positionShiftValue = 0;
    armedValue = false;
    return { listenersDropped, notesReleased };
  }

  return {
    id,

    // ——— consumer side ———
    on(event, fn) {
      if (!listeners[event]) throw new Error(`trackBus.on: no such event "${event}"`);
      listeners[event].add(fn);
      return () => listeners[event].delete(fn);
    },
    off(event, fn) {
      if (listeners[event]) listeners[event].delete(fn);
    },

    // ——— producer side ———
    emitNoteOn,
    emitNoteOff,
    allNotesOff,

    // ——— the instrument ———
    bindInstrument,
    get instrument() {
      return bound;
    },

    // ——— the arm gate ———
    /** Whether the computer keyboard and MIDI reach this track. Layers: any number of
     *  buses may be armed at once. Mouse, touch, circle and diatonic ignore it. */
    get armed() {
      return armedValue;
    },
    set armed(v) {
      setArmed(v);
    },
    /** The gated source ids, for a caller that needs to name them. */
    get gatedSources() {
      return [...ARM_GATED_SOURCES];
    },

    // ——— the two shifts, per track ———
    get octaveShift() {
      return octaveShiftValue;
    },
    set octaveShift(v) {
      setOctaveShift(v);
    },
    /** 0-11: which pitch class is DRAWN as the bottom key. Display only — never added to a
     *  note number in this file. */
    get positionShift() {
      return positionShiftValue;
    },
    set positionShift(v) {
      setPositionShift(v);
    },

    // ——— introspection ———
    /** Notes sounding right now, as emitted (already octave-shifted). */
    get activeNotes() {
      return [...sounding.keys()];
    },
    get listenerCount() {
      return EVENTS.reduce((n, name) => n + listeners[name].size, 0);
    },

    dispose,
  };
}

export default createTrackBus;
